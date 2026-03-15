#!/usr/bin/env node
/**
 * Migrate legacy read counts & like counts from MX-Space BSON into Waline SQLite.
 *
 * What it does:
 *   1. Reads posts.bson / notes.bson → extracts count.read & count.like
 *   2. Maps each article to its new Astro route via legacySourceId in MDX frontmatter
 *   3. Merges old Chinese-character URLs in wl_Counter into correct new routes
 *   4. Deduplicates wl_Counter rows sharing the same URL
 *   5. Upserts: existing row → add BSON reads to time, set reaction0 to likes
 *              new row     → insert with BSON reads as time, likes as reaction0
 *
 * Usage:
 *   node scripts/migrate-counts-to-waline.mjs ./waline.sqlite          # dry-run
 *   node scripts/migrate-counts-to-waline.mjs ./waline.sqlite --write  # actual write
 */

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import Database from "better-sqlite3";
import { deserialize } from "bson";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// ── CLI ──────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const dbPath = args.find((a) => !a.startsWith("--"));
const writeMode = args.includes("--write");

if (!dbPath) {
  console.error(
    "Usage: node scripts/migrate-counts-to-waline.mjs <db-path> [--write]"
  );
  process.exit(1);
}

// ── Helpers ──────────────────────────────────────────────────────────────────
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
        const legacyId = idMatch
          ? idMatch[1].trim().replace(/["']/g, "")
          : null;
        const routeSlug = slugMatch
          ? slugMatch[1].trim().replace(/["']/g, "")
          : undefined;
        const fileSlug = f.name.replace(/\.(md|mdx)$/, "");
        const slug = routeSlug || fileSlug;
        const newRoute = `/${section}/${slug}/`;
        if (legacyId) map.set(legacyId, newRoute);
      }
    }
  };
  walk(dir);
  return map;
}

// ── Build route lookup ───────────────────────────────────────────────────────
const blogRoutes = buildMdxRoutes(join(ROOT, "src/content/blog"), "blog");
const noteRoutes = buildMdxRoutes(join(ROOT, "src/content/note"), "note");
const projectRoutes = buildMdxRoutes(
  join(ROOT, "src/content/project"),
  "project"
);
const idToRoute = new Map([...blogRoutes, ...noteRoutes, ...projectRoutes]);

// ── Parse BSON counts ────────────────────────────────────────────────────────
const posts = parseBson("src/data/mx-space/posts.bson");
const notes = parseBson("src/data/mx-space/notes.bson");

// newRoute → { read, like, title }
const bsonCounts = new Map();

for (const p of posts) {
  const route = idToRoute.get(p._id.toString());
  if (!route) continue;
  bsonCounts.set(route, {
    read: p.count?.read ?? 0,
    like: p.count?.like ?? 0,
    title: p.title,
  });
}
for (const n of notes) {
  const route = idToRoute.get(n._id.toString());
  if (!route) continue;
  bsonCounts.set(route, {
    read: n.count?.read ?? 0,
    like: n.count?.like ?? 0,
    title: n.title,
  });
}

console.log(`Parsed ${bsonCounts.size} articles with counts from BSON\n`);

// ── Open DB ──────────────────────────────────────────────────────────────────
const db = new Database(dbPath, { readonly: !writeMode });

// ── Step 1: Build old-URL → new-URL mapping for existing DB rows ─────────
// Some wl_Counter rows use old Chinese-character URLs; map them to new routes.
const oldUrlToNew = new Map();
// We match by checking if the BSON title appears in the old URL (for Chinese URLs)
for (const p of posts) {
  const route = idToRoute.get(p._id.toString());
  if (!route) continue;
  // Old MX-Space slug-based route
  if (p.slug) oldUrlToNew.set(`/blog/${p.slug}/`, route);
  // Title-based URL that may appear in DB
  if (p.title) oldUrlToNew.set(`/blog/${p.title}/`, route);
}
for (const n of notes) {
  const route = idToRoute.get(n._id.toString());
  if (!route) continue;
  oldUrlToNew.set(`/note/${n.nid}/`, route);
}

// ── Step 2: Read current wl_Counter and plan changes ─────────────────────
const existingRows = db.prepare("SELECT * FROM wl_Counter").all();
console.log(`Current wl_Counter has ${existingRows.length} rows\n`);

// Normalize: group existing rows by their canonical new URL
// canonicalUrl → { totalTime, totalReaction0, rowIds[] }
const urlGroups = new Map();

for (const row of existingRows) {
  const canonical = oldUrlToNew.get(row.url) || row.url;
  if (!urlGroups.has(canonical)) {
    urlGroups.set(canonical, { totalTime: 0, totalReaction0: 0, rowIds: [] });
  }
  const g = urlGroups.get(canonical);
  g.totalTime += row.time || 0;
  g.totalReaction0 += row.reaction0 || 0;
  g.rowIds.push(row.id);
}

// ── Step 3: Plan final state ─────────────────────────────────────────────
// finalUrl → { time, reaction0, action, existingRowId? }
const plan = new Map();

// First, incorporate existing DB data (possibly merged from old URLs)
for (const [url, group] of urlGroups) {
  plan.set(url, {
    time: group.totalTime,
    reaction0: group.totalReaction0,
    existingRowIds: group.rowIds,
    action: group.rowIds.length > 1 ? "merge-existing" : "update",
  });
}

// Then, add BSON counts on top
for (const [url, counts] of bsonCounts) {
  if (plan.has(url)) {
    const p = plan.get(url);
    p.time += counts.read;
    p.reaction0 += counts.like;
    p.action = p.existingRowIds.length > 1 ? "merge+bson" : "update+bson";
  } else {
    plan.set(url, {
      time: counts.read,
      reaction0: counts.like,
      existingRowIds: [],
      action: "insert",
    });
  }
}

// ── Step 4: Report ───────────────────────────────────────────────────────
console.log("=== Migration Plan ===\n");

const inserts = [];
const updates = [];
const deletes = [];

for (const [url, p] of [...plan.entries()].sort()) {
  const bson = bsonCounts.get(url);
  const bsonLabel = bson ? `bson(read=${bson.read}, like=${bson.like})` : "";
  const existLabel =
    p.existingRowIds.length > 0
      ? `db_ids=[${p.existingRowIds.join(",")}]`
      : "";

  if (p.action === "insert") {
    console.log(
      `  INSERT ${url}  time=${p.time} reaction0=${p.reaction0}  ${bsonLabel}`
    );
    inserts.push(url);
  } else if (p.action.includes("merge")) {
    console.log(
      `  MERGE  ${url}  time=${p.time} reaction0=${p.reaction0}  ${existLabel} ${bsonLabel}`
    );
    // Keep first row, delete rest
    updates.push(url);
    for (let i = 1; i < p.existingRowIds.length; i++) {
      deletes.push(p.existingRowIds[i]);
    }
  } else {
    console.log(
      `  UPDATE ${url}  time=${p.time} reaction0=${p.reaction0}  ${existLabel} ${bsonLabel}`
    );
    updates.push(url);
  }
}

console.log(`\nSummary: ${inserts.length} inserts, ${updates.length} updates, ${deletes.length} duplicate rows to delete`);

// ── Step 5: Execute ──────────────────────────────────────────────────────
if (!writeMode) {
  console.log("\n=== DRY RUN (pass --write to apply) ===");
  db.close();
  process.exit(0);
}

console.log("\nApplying changes...");

const insertStmt = db.prepare(
  `INSERT INTO wl_Counter (url, time, reaction0, createdAt, updatedAt)
   VALUES (@url, @time, @reaction0, datetime('now','localtime'), datetime('now','localtime'))`
);
const updateStmt = db.prepare(
  `UPDATE wl_Counter SET url = @url, time = @time, reaction0 = @reaction0,
   updatedAt = datetime('now','localtime') WHERE id = @id`
);
const deleteStmt = db.prepare("DELETE FROM wl_Counter WHERE id = ?");

const tx = db.transaction(() => {
  let insertCount = 0;
  let updateCount = 0;
  let deleteCount = 0;

  for (const [url, p] of plan) {
    if (p.existingRowIds.length === 0) {
      // Insert new row
      insertStmt.run({ url, time: p.time, reaction0: p.reaction0 });
      insertCount++;
    } else {
      // Update first row with merged data
      const keepId = p.existingRowIds[0];
      updateStmt.run({ id: keepId, url, time: p.time, reaction0: p.reaction0 });
      updateCount++;

      // Delete duplicate rows
      for (let i = 1; i < p.existingRowIds.length; i++) {
        deleteStmt.run(p.existingRowIds[i]);
        deleteCount++;
      }
    }
  }

  console.log(`  Inserted: ${insertCount}`);
  console.log(`  Updated:  ${updateCount}`);
  console.log(`  Deleted duplicates: ${deleteCount}`);
});

tx();
db.close();
console.log("Done.");
