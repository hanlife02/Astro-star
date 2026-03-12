#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import process from "node:process";

const rootDir = process.cwd();
const shouldWrite = process.argv.includes("--write");
const migrateBlog = process.argv.includes("--blog") || !process.argv.includes("--note");
const migrateNote = process.argv.includes("--note") || !process.argv.includes("--blog");
const maxBuffer = 1024 * 1024 * 256;

const paths = {
  blogContent: path.join(rootDir, "src/content/blog"),
  noteContent: path.join(rootDir, "src/content/note"),
  categories: path.join(rootDir, "data/mx-space/categories.bson"),
  topics: path.join(rootDir, "data/mx-space/topics.bson"),
  posts: path.join(rootDir, "data/mx-space/posts.bson"),
  notes: path.join(rootDir, "data/mx-space/notes.bson"),
  legacyFiles: path.join(rootDir, "data/backup_data/static/file"),
  publicFiles: path.join(rootDir, "public/legacy/file"),
};

const copiedAssets = new Set();
const claimedTargets = new Set();
const summary = {
  blog: { created: 0, updated: 0, unchanged: 0 },
  note: { created: 0, updated: 0, unchanged: 0 },
  assetsCopied: 0,
  missingAssets: new Set(),
};

function fail(message) {
  console.error(message);
  process.exit(1);
}

function runBsondump(filePath) {
  try {
    return execFileSync("bsondump", ["--quiet", filePath], {
      encoding: "utf8",
      maxBuffer,
    });
  } catch {
    fail(`Failed to read BSON file: ${path.relative(rootDir, filePath)}`);
  }
}

function readBsonDocuments(filePath) {
  return runBsondump(filePath)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function normalizeKey(value) {
  return String(value || "")
    .normalize("NFKC")
    .trim()
    .toLowerCase();
}

function fileStem(filePath) {
  return path.basename(filePath, path.extname(filePath));
}

function listContentFiles(dirPath) {
  if (!existsSync(dirPath)) return [];

  return readdirSync(dirPath, { withFileTypes: true }).flatMap((entry) => {
    const nextPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      return listContentFiles(nextPath);
    }

    return /\.(md|mdx)$/i.test(entry.name) ? [nextPath] : [];
  });
}

function buildExistingIndex(dirPath) {
  const keyToPaths = new Map();
  const legacySourceIdToPath = new Map();

  for (const filePath of listContentFiles(dirPath)) {
    const key = normalizeKey(fileStem(filePath));
    const existing = keyToPaths.get(key) || [];
    existing.push(filePath);
    keyToPaths.set(key, existing);

    const source = readFileSync(filePath, "utf8");
    const legacySourceIdMatch = source.match(/^legacySourceId:\s*"([^"\n]+)"/m);
    if (legacySourceIdMatch?.[1]) {
      legacySourceIdToPath.set(legacySourceIdMatch[1], filePath);
    }
  }

  return {
    keyToPaths,
    legacySourceIdToPath,
  };
}

function findExistingPath(index, candidates) {
  for (const candidate of candidates) {
    const key = normalizeKey(candidate);
    if (!key) continue;

    const matches = (index.keyToPaths.get(key) || []).filter((filePath) => !claimedTargets.has(filePath));
    if (matches.length === 1) {
      claimedTargets.add(matches[0]);
      return matches[0];
    }
  }

  return null;
}

function sanitizeFileName(value) {
  const sanitized = String(value || "")
    .normalize("NFKC")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\.+$/g, "");

  return sanitized || "untitled";
}

function createUniqueTargetPath(baseDir, stem, ext, suffix = "") {
  const safeStem = sanitizeFileName(stem);
  const suffixText = suffix ? `-${sanitizeFileName(suffix)}` : "";
  let filePath = path.join(baseDir, `${safeStem}${suffixText}${ext}`);

  if (!existsSync(filePath) && !claimedTargets.has(filePath)) {
    claimedTargets.add(filePath);
    return filePath;
  }

  let counter = 2;
  while (true) {
    filePath = path.join(baseDir, `${safeStem}${suffixText}-${counter}${ext}`);
    if (!existsSync(filePath) && !claimedTargets.has(filePath)) {
      claimedTargets.add(filePath);
      return filePath;
    }
    counter += 1;
  }
}

function unwrapObjectId(value) {
  return value && typeof value === "object" && "$oid" in value ? value.$oid : "";
}

function unwrapNumber(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  if (typeof value === "object") {
    if ("$numberInt" in value) return Number(value.$numberInt);
    if ("$numberLong" in value) return Number(value.$numberLong);
    if ("$numberDouble" in value) return Number(value.$numberDouble);
  }
  return Number(value);
}

function unwrapDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;

  if (typeof value === "object" && "$date" in value) {
    const rawDate = value.$date;
    if (typeof rawDate === "string") return new Date(rawDate);
    if (rawDate && typeof rawDate === "object" && "$numberLong" in rawDate) {
      return new Date(Number(rawDate.$numberLong));
    }
  }

  return new Date(value);
}

function formatLocalDate(dateValue) {
  const date = unwrapDate(dateValue);
  if (!date || Number.isNaN(date.getTime())) return "";

  const pad = (value) => String(value).padStart(2, "0");

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join("-") + ` ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function yamlValue(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return JSON.stringify(String(value ?? ""));
}

function ensureDir(filePath) {
  mkdirSync(path.dirname(filePath), { recursive: true });
}

function copyLegacyAsset(fileName) {
  const normalizedFileName = String(fileName || "").replace(/[),.;:\]\u3001\uff0c]+$/gu, "");
  if (!normalizedFileName || copiedAssets.has(normalizedFileName)) return;

  copiedAssets.add(normalizedFileName);

  const sourcePath = path.join(paths.legacyFiles, normalizedFileName);
  const targetPath = path.join(paths.publicFiles, normalizedFileName);

  if (!existsSync(sourcePath)) {
    summary.missingAssets.add(normalizedFileName);
    return;
  }

  if (!shouldWrite || existsSync(targetPath)) {
    return;
  }

  ensureDir(targetPath);
  copyFileSync(sourcePath, targetPath);
  summary.assetsCopied += 1;
}

function rewriteLegacyUrls(body) {
  const withCopiedAssets = body.replace(
    /https?:\/\/[^\s"'<>]+\/api\/v2\/objects\/file\/([A-Za-z0-9_-]+\.[A-Za-z0-9]+)/g,
    (_, fileName) => {
      const normalizedFileName = String(fileName || "").trim();
      copyLegacyAsset(normalizedFileName);
      return `/legacy/file/${normalizedFileName}`;
    },
  );

  return withCopiedAssets
    .replace(/\(\s+(\/legacy\/file\/|https?:\/\/)/g, "($1")
    .trimEnd() + "\n";
}

function buildFrontmatter(entry) {
  const lines = [
    "---",
    `routeSlug: ${yamlValue(entry.routeSlug)}`,
    `title: ${yamlValue(entry.title)}`,
    `createdAt: ${yamlValue(entry.createdAt)}`,
  ];

  if (entry.type) {
    lines.push(`type: ${yamlValue(entry.type)}`);
  }

  if (entry.archiveSlug) {
    lines.push(`archiveSlug: ${yamlValue(entry.archiveSlug)}`);
  }

  if (entry.description) {
    lines.push(`description: ${yamlValue(entry.description)}`);
  }

  lines.push(`legacySourceCollection: ${yamlValue(entry.legacySourceCollection)}`);
  lines.push(`legacySourceId: ${yamlValue(entry.legacySourceId)}`);
  lines.push("---", "");

  return lines.join("\n");
}

function writeEntry(section, targetPath, content) {
  const exists = existsSync(targetPath);
  const previousContent = exists ? readFileSync(targetPath, "utf8") : null;

  if (previousContent === content) {
    summary[section].unchanged += 1;
    console.log(`[unchanged] ${path.relative(rootDir, targetPath)}`);
    return;
  }

  if (shouldWrite) {
    ensureDir(targetPath);
    writeFileSync(targetPath, content, "utf8");
  }

  summary[section][exists ? "updated" : "created"] += 1;
  console.log(`[${exists ? "update" : "create"}] ${path.relative(rootDir, targetPath)}`);
}

function loadCategories() {
  return new Map(
    readBsonDocuments(paths.categories).map((doc) => [
      unwrapObjectId(doc._id),
      {
        slug: String(doc.slug || "").trim(),
        name: String(doc.name || "").trim(),
      },
    ]),
  );
}

function loadTopics() {
  return new Map(
    readBsonDocuments(paths.topics).map((doc) => [
      unwrapObjectId(doc._id),
      {
        slug: String(doc.slug || "").trim(),
        name: String(doc.name || "").trim(),
      },
    ]),
  );
}

function migratePosts() {
  const categories = loadCategories();
  const existingIndex = buildExistingIndex(paths.blogContent);
  const documents = readBsonDocuments(paths.posts).filter((doc) => doc.isPublished);

  for (const doc of documents) {
    const category = categories.get(unwrapObjectId(doc.categoryId)) || { slug: "", name: "" };
    const title = String(doc.title || "").trim() || "Untitled";
    const routeSlug = String(doc.slug || "").trim() || sanitizeFileName(title);
    const targetPath =
      existingIndex.legacySourceIdToPath.get(unwrapObjectId(doc._id)) ||
      findExistingPath(existingIndex, [title, routeSlug]) ||
      createUniqueTargetPath(paths.blogContent, routeSlug, ".mdx");

    const content = [
      buildFrontmatter({
        routeSlug,
        title,
        createdAt: formatLocalDate(doc.created),
        type: category.name,
        archiveSlug: category.slug,
        description: String(doc.summary || "").trim(),
        legacySourceCollection: "posts",
        legacySourceId: unwrapObjectId(doc._id),
      }),
      rewriteLegacyUrls(String(doc.text || "")),
    ].join("");

    writeEntry("blog", targetPath, content);
  }
}

function migrateNotes() {
  const topics = loadTopics();
  const existingIndex = buildExistingIndex(paths.noteContent);
  const documents = readBsonDocuments(paths.notes).filter((doc) => doc.isPublished);

  for (const doc of documents) {
    const topic = topics.get(unwrapObjectId(doc.topicId)) || { slug: "misc", name: "" };
    const title = String(doc.title || "").trim() || "Untitled";
    const routeSlug = unwrapNumber(doc.nid) ?? title;
    const existingPath =
      existingIndex.legacySourceIdToPath.get(unwrapObjectId(doc._id)) ||
      findExistingPath(existingIndex, [title]);
    const targetPath =
      existingPath ||
      createUniqueTargetPath(paths.noteContent, title, ".mdx", String(routeSlug));

    const content = [
      buildFrontmatter({
        routeSlug,
        title,
        createdAt: formatLocalDate(doc.created),
        type: topic.name,
        archiveSlug: path.dirname(targetPath) === paths.noteContent ? topic.slug : "",
        legacySourceCollection: "notes",
        legacySourceId: unwrapObjectId(doc._id),
      }),
      rewriteLegacyUrls(String(doc.text || "")),
    ].join("");

    writeEntry("note", targetPath, content);
  }
}

if (!existsSync(paths.posts) || !existsSync(paths.notes)) {
  fail("Legacy data not found under data/mx-space.");
}

console.log(shouldWrite ? "Running migration in write mode." : "Running migration in dry-run mode.");

if (migrateBlog) {
  migratePosts();
}

if (migrateNote) {
  migrateNotes();
}

console.log("");
console.log("Summary");
if (migrateBlog) {
  console.log(
    `blog: ${summary.blog.created} create, ${summary.blog.updated} update, ${summary.blog.unchanged} unchanged`,
  );
}
if (migrateNote) {
  console.log(
    `note: ${summary.note.created} create, ${summary.note.updated} update, ${summary.note.unchanged} unchanged`,
  );
}
console.log(`assets: ${shouldWrite ? summary.assetsCopied : copiedAssets.size} referenced`);
if (summary.missingAssets.size > 0) {
  console.log(`missing assets: ${Array.from(summary.missingAssets).sort().join(", ")}`);
}
