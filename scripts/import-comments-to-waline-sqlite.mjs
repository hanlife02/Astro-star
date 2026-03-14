#!/usr/bin/env node
/**
 * Import legacy comments into Waline SQLite database.
 *
 * Usage:
 *   node scripts/import-comments-to-waline-sqlite.mjs ./waline.sqlite          # dry-run (default)
 *   node scripts/import-comments-to-waline-sqlite.mjs ./waline.sqlite --write  # actual write
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import Database from "better-sqlite3";

// ── Paths ──────────────────────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const COMMENTS_PATH = resolve(__dirname, "../src/data/comments/legacy-comments.json");

// ── CLI args ───────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const dbPath = args.find((a) => !a.startsWith("--"));
const writeMode = args.includes("--write");

if (!dbPath) {
  console.error("Usage: node scripts/import-comments-to-waline-sqlite.mjs <db-path> [--write]");
  process.exit(1);
}

// ── Author identity (site owner → fill mail for Waline admin matching) ─────
const OWNER_NICK = "Ethan";
const OWNER_MAIL = "ethan@hanlife02.com";
const OWNER_LINK = "https://hanlife02.com";

// ── Route mapping ──────────────────────────────────────────────────────────
function mapRoute(comment) {
  if (comment.routePath !== null) return comment.routePath;
  // routePath === null && refType === "posts" → discard
  if (comment.refType === "posts") return null;
  // routePath === null && other refType → /about/
  return "/about/";
}

// ── Load & prepare comments ────────────────────────────────────────────────
const raw = JSON.parse(readFileSync(COMMENTS_PATH, "utf-8"));
console.log(`Loaded ${raw.length} comments from legacy-comments.json`);

const mapped = raw
  .map((c) => ({ ...c, mappedRoute: mapRoute(c) }))
  .filter((c) => c.mappedRoute !== null);

console.log(`After filtering: ${mapped.length} comments (discarded ${raw.length - mapped.length})`);

// Sort by createdAt ascending so parents are inserted before children
mapped.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

// ── Build parent lookup ────────────────────────────────────────────────────
// Find the root comment id for a given comment by walking parentId chains
const byId = new Map(raw.map((c) => [c.id, c]));

function findRootId(comment) {
  let current = comment;
  while (current.parentId) {
    const parent = byId.get(current.parentId);
    if (!parent) break;
    current = parent;
  }
  return current.id;
}

// ── Insert logic ───────────────────────────────────────────────────────────
function run() {
  const oldToNew = new Map();
  let inserted = 0;
  let skipped = 0;

  if (!writeMode) {
    console.log("\n=== DRY RUN (pass --write to actually insert) ===\n");
  }

  const db = writeMode ? new Database(dbPath) : null;

  const insert = db
    ? db.prepare(`
        INSERT INTO wl_Comment (nick, mail, link, comment, ua, url, pid, rid, sticky, status, "like", ip, insertedAt, createdAt, updatedAt)
        VALUES (@nick, @mail, @link, @comment, @ua, @url, @pid, @rid, @sticky, @status, @like, @ip, @insertedAt, @createdAt, @updatedAt)
      `)
    : null;

  const runInserts = () => {
    for (const c of mapped) {
      const ts = c.createdAt ? new Date(c.createdAt).getTime() : Date.now();

      // Resolve pid (direct parent) and rid (root comment)
      let pid = null;
      let rid = null;
      if (c.parentId) {
        pid = oldToNew.get(c.parentId) ?? null;
        const rootOldId = findRootId(c);
        rid = oldToNew.get(rootOldId) ?? null;

        if (pid === null) {
          console.warn(`  WARN: parent ${c.parentId} not found for comment ${c.id}, skipping`);
          skipped++;
          continue;
        }
      }

      const isOwner = c.author === OWNER_NICK;
      const row = {
        nick: c.author || "Anonymous",
        mail: isOwner ? OWNER_MAIL : "",
        link: isOwner ? (c.authorUrl || OWNER_LINK) : (c.authorUrl || ""),
        comment: c.text || "",
        ua: "",
        url: c.mappedRoute,
        pid,
        rid,
        sticky: c.isPinned ? 1 : 0,
        status: "",            // empty string = approved in Waline
        like: 0,
        ip: "",
        insertedAt: ts,
        createdAt: ts,
        updatedAt: ts,
      };

      if (writeMode) {
        const result = insert.run(row);
        const newId = Number(result.lastInsertRowid);
        oldToNew.set(c.id, newId);
        inserted++;
      } else {
        // Dry run: simulate auto-increment IDs
        const fakeId = oldToNew.size + 1;
        oldToNew.set(c.id, fakeId);
        inserted++;

        const pidLabel = pid ? `pid=${pid}` : "root";
        const ridLabel = rid ? `rid=${rid}` : "";
        console.log(
          `  [${inserted}] ${c.author} → ${c.mappedRoute} (${pidLabel}${ridLabel ? `, ${ridLabel}` : ""}) | ${new Date(ts).toISOString()}`
        );
      }
    }
  };

  if (writeMode) {
    const tx = db.transaction(runInserts);
    tx();
    db.close();
  } else {
    runInserts();
  }

  console.log(`\nDone. Inserted: ${inserted}, Skipped: ${skipped}`);
  if (!writeMode) {
    console.log("(This was a dry run. Use --write to actually insert into the database.)");
  }
}

run();
