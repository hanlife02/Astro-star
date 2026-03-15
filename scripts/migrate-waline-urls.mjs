#!/usr/bin/env node
/**
 * Migrate old MX-Space route paths in Waline SQLite to new Astro routes.
 *
 * Usage:
 *   node scripts/migrate-waline-urls.mjs ./waline.sqlite          # dry-run
 *   node scripts/migrate-waline-urls.mjs ./waline.sqlite --write  # actual write
 */

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";
import Database from "better-sqlite3";
import { deserialize } from "bson";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// ── CLI ───────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const dbPath = args.find((a) => !a.startsWith("--"));
const writeMode = args.includes("--write");

if (!dbPath) {
  console.error("Usage: node scripts/migrate-waline-urls.mjs <db-path> [--write]");
  process.exit(1);
}

// ── Helpers ───────────────────────────────────────────────────────────────
function parseBson(relPath) {
  const buf = readFileSync(join(ROOT, relPath));
  let offset = 0;
  const docs = [];
  while (offset < buf.length) {
    const size = buf.readInt32LE(offset);
    if (size <= 0 || offset + size > buf.length) break;
    docs.push(deserialize(buf.slice(offset, offset + size)));
    offset += size;
  }
  return docs;
}

function normalizeSlug(value) {
  if (typeof value !== "string" && typeof value !== "number") return "";
  const slug = String(value).trim().replace(/^\/+|\/+$/g, "") || "";
  return slug.includes("/") ? "" : slug;
}

function getSlugFromPath(p) {
  return p.split("/").pop()?.replace(/\.(md|mdx)$/i, "")?.trim() || "untitled";
}

function resolveSlug(path, routeSlug) {
  return normalizeSlug(routeSlug) || getSlugFromPath(path);
}

// ── Build new-route lookup from MDX frontmatter (legacySourceId → new route) ──
function buildMdxRoutes(dir, section) {
  const map = new Map(); // legacySourceId → newRoute
  const walk = (d) => {
    for (const f of readdirSync(d, { withFileTypes: true })) {
      if (f.isDirectory()) walk(join(d, f.name));
      else if (f.name.endsWith(".mdx") || f.name.endsWith(".md")) {
        const content = readFileSync(join(d, f.name), "utf-8");
        const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
        if (!fmMatch) continue;
        const fm = fmMatch[1];

        const idMatch = fm.match(/legacySourceId:\s*(.+)/);
        const slugMatch = fm.match(/routeSlug:\s*(.+)/);
        const legacyId = idMatch ? idMatch[1].trim().replace(/["']/g, "") : null;
        const routeSlug = slugMatch ? slugMatch[1].trim().replace(/["']/g, "") : undefined;

        const fileId = relative(dir, join(d, f.name)).replace(/\\/g, "/").replace(/\.(md|mdx)$/, "");
        const slug = resolveSlug(fileId, routeSlug);
        const newRoute = `/${section}/${slug}/`;

        if (legacyId) {
          map.set(legacyId, newRoute);
        }
      }
    }
  };
  walk(dir);
  return map;
}

// ── Parse BSON to get old-route → legacySourceId mapping ──────────────────
const posts = parseBson("src/data/mx-space/posts.bson");
const notes = parseBson("src/data/mx-space/notes.bson");
const projects = parseBson("src/data/mx-space/projects.bson");

// old route → MongoDB _id
const oldRouteToId = new Map();
for (const p of posts) {
  oldRouteToId.set(`/blog/${p.slug}/`, p._id.toString());
}
for (const n of notes) {
  oldRouteToId.set(`/note/${n.nid}/`, n._id.toString());
}
for (const p of projects) {
  // Project old slugs used in DB: try name-based variations
  const name = p.name;
  oldRouteToId.set(`__project_id__${p._id.toString()}`, p._id.toString());
}

// new route lookup
const blogRoutes = buildMdxRoutes(join(ROOT, "src/content/blog"), "blog");
const noteRoutes = buildMdxRoutes(join(ROOT, "src/content/note"), "note");
const projectRoutes = buildMdxRoutes(join(ROOT, "src/content/project"), "project");

const idToNewRoute = new Map([...blogRoutes, ...noteRoutes, ...projectRoutes]);

// ── Build final old-url → new-url mapping ─────────────────────────────────
const urlMapping = new Map();

// Blog & Note: old route → _id → new route
for (const [oldRoute, mongoId] of oldRouteToId.entries()) {
  if (oldRoute.startsWith("__")) continue;
  const newRoute = idToNewRoute.get(mongoId);
  if (newRoute && oldRoute !== newRoute) {
    urlMapping.set(oldRoute, newRoute);
  }
}

// Project: scan DB urls starting with /project/ and try to match
// We need to handle project URLs found in the DB directly
const db = new Database(dbPath, { readonly: !writeMode });
const dbProjectUrls = new Set();
for (const row of db.prepare("SELECT DISTINCT url FROM wl_Counter WHERE url LIKE '/project/%'").all()) {
  dbProjectUrls.add(row.url);
}
for (const row of db.prepare("SELECT DISTINCT url FROM wl_Comment WHERE url LIKE '/project/%'").all()) {
  dbProjectUrls.add(row.url);
}

// For projects, match by checking if the old project URL's slug corresponds to a known project
for (const p of projects) {
  const mongoId = p._id.toString();
  const newRoute = idToNewRoute.get(mongoId);
  if (!newRoute) continue;

  // Try to find DB urls that could map to this project
  for (const dbUrl of dbProjectUrls) {
    if (dbUrl !== newRoute && !urlMapping.has(dbUrl)) {
      // Heuristic: check if the project name matches the DB slug
      const dbSlug = dbUrl.replace(/^\/project\//, "").replace(/\/$/, "");
      const pName = p.name.toLowerCase().replace(/[^a-z0-9-]/g, "-");
      if (dbSlug === pName || dbSlug.includes(pName) || pName.includes(dbSlug)) {
        urlMapping.set(dbUrl, newRoute);
      }
    }
  }
}

// Static pages that don't change
// /about/ and /links/ stay the same, no mapping needed

// ── Report ────────────────────────────────────────────────────────────────
console.log("=== URL Migration Map ===\n");
if (urlMapping.size === 0) {
  console.log("No URLs need migration. All routes already match.");
  db.close();
  process.exit(0);
}

for (const [oldUrl, newUrl] of [...urlMapping.entries()].sort()) {
  console.log(`  ${oldUrl}\n    → ${newUrl}\n`);
}
console.log(`Total mappings: ${urlMapping.size}\n`);

// ── Check which DB rows will be affected ──────────────────────────────────
const oldUrls = [...urlMapping.keys()];
const placeholders = oldUrls.map(() => "?").join(",");

const counterRows = db
  .prepare(`SELECT id, url, time FROM wl_Counter WHERE url IN (${placeholders})`)
  .all(...oldUrls);
const commentRows = db
  .prepare(`SELECT id, url, nick, substr(comment, 1, 30) as preview FROM wl_Comment WHERE url IN (${placeholders})`)
  .all(...oldUrls);

console.log(`wl_Counter rows to update: ${counterRows.length}`);
counterRows.forEach((r) => console.log(`  [${r.id}] ${r.url} (views: ${r.time})`));

console.log(`\nwl_Comment rows to update: ${commentRows.length}`);
commentRows.forEach((r) => console.log(`  [${r.id}] ${r.nick} @ ${r.url}`));

// ── Check for unmapped URLs in DB ─────────────────────────────────────────
const allDbUrls = new Set();
for (const row of db.prepare("SELECT DISTINCT url FROM wl_Counter").all()) allDbUrls.add(row.url);
for (const row of db.prepare("SELECT DISTINCT url FROM wl_Comment").all()) allDbUrls.add(row.url);

const unmapped = [...allDbUrls].filter((u) => !urlMapping.has(u) && u !== "/about/" && u !== "/links/");
if (unmapped.length > 0) {
  console.log(`\n⚠ DB URLs not in mapping (already correct or unknown):`);
  unmapped.forEach((u) => console.log(`  ${u}`));
}

// ── Write ─────────────────────────────────────────────────────────────────
if (!writeMode) {
  console.log("\n=== DRY RUN (pass --write to apply) ===");
  db.close();
  process.exit(0);
}

console.log("\nApplying updates...");

const updateCounter = db.prepare("UPDATE wl_Counter SET url = ? WHERE url = ?");
const updateComment = db.prepare("UPDATE wl_Comment SET url = ? WHERE url = ?");

const tx = db.transaction(() => {
  let counterUpdated = 0;
  let commentUpdated = 0;

  for (const [oldUrl, newUrl] of urlMapping) {
    const cr = updateCounter.run(newUrl, oldUrl);
    counterUpdated += cr.changes;
    const cm = updateComment.run(newUrl, oldUrl);
    commentUpdated += cm.changes;
  }

  console.log(`  wl_Counter: ${counterUpdated} rows updated`);
  console.log(`  wl_Comment: ${commentUpdated} rows updated`);
});

tx();
db.close();
console.log("Done.");
