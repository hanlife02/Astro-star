#!/usr/bin/env node

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
import { deserialize } from "bson";

const rootDir = process.cwd();
const shouldWrite = process.argv.includes("--write");
const hasExplicitTarget = ["--blog", "--note", "--project"].some((flag) => process.argv.includes(flag));
const migrateBlog = process.argv.includes("--blog") || !hasExplicitTarget;
const migrateNote = process.argv.includes("--note") || !hasExplicitTarget;
const migrateProject = process.argv.includes("--project") || !hasExplicitTarget;

const paths = {
  blogContent: path.join(rootDir, "src/content/blog"),
  noteContent: path.join(rootDir, "src/content/note"),
  projectContent: path.join(rootDir, "src/content/project"),
  categories: path.join(rootDir, "data/mx-space/categories.bson"),
  topics: path.join(rootDir, "data/mx-space/topics.bson"),
  posts: path.join(rootDir, "data/mx-space/posts.bson"),
  notes: path.join(rootDir, "data/mx-space/notes.bson"),
  projects: path.join(rootDir, "data/mx-space/projects.bson"),
  legacyFiles: path.join(rootDir, "data/backup_data/static/file"),
  legacyIcons: path.join(rootDir, "data/backup_data/static/icon"),
  publicFiles: path.join(rootDir, "public/legacy/file"),
  publicIcons: path.join(rootDir, "public/legacy/icon"),
};

const copiedAssets = new Set();
const claimedTargets = new Set();
const summary = {
  blog: { created: 0, updated: 0, unchanged: 0 },
  note: { created: 0, updated: 0, unchanged: 0 },
  project: { created: 0, updated: 0, unchanged: 0 },
  assetsCopied: 0,
  missingAssets: new Set(),
};

const noteTopicOverrides = new Map([
  [
    "669df490bc2b398e402a3d4c",
    {
      slug: "follow_heart",
      name: "随心🎈",
    },
  ],
  [
    "6859a66e9abe7f61f5290e2c",
    {
      slug: "follow_heart",
      name: "随心🎈",
    },
  ],
]);

function fail(message) {
  console.error(message);
  process.exit(1);
}

function readBsonDocuments(filePath) {
  if (!existsSync(filePath)) {
    fail(`Failed to read BSON file: ${path.relative(rootDir, filePath)}`);
  }

  const source = readFileSync(filePath);
  const documents = [];
  let offset = 0;

  while (offset < source.length) {
    const size = source.readInt32LE(offset);

    if (size < 5 || offset + size > source.length) {
      fail(`Invalid BSON stream: ${path.relative(rootDir, filePath)}`);
    }

    documents.push(deserialize(source.subarray(offset, offset + size)));
    offset += size;
  }

  return documents;
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

function slugifyValue(value) {
  return String(value || "")
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[`*_~()[\]{}]/g, "")
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
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
  if (typeof value === "string") return value;

  if (value && typeof value === "object" && "toHexString" in value && typeof value.toHexString === "function") {
    return value.toHexString();
  }

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

function copyLegacyAsset(fileName, assetType = "file") {
  const normalizedFileName = String(fileName || "").replace(/[),.;:\]\u3001\uff0c]+$/gu, "");
  const assetKey = `${assetType}:${normalizedFileName}`;
  if (!normalizedFileName || copiedAssets.has(assetKey)) return;

  copiedAssets.add(assetKey);

  const sourceDir = assetType === "icon" ? paths.legacyIcons : paths.legacyFiles;
  const targetDir = assetType === "icon" ? paths.publicIcons : paths.publicFiles;
  const sourcePath = path.join(sourceDir, normalizedFileName);
  const targetPath = path.join(targetDir, normalizedFileName);

  if (!existsSync(sourcePath)) {
    summary.missingAssets.add(assetKey);
    return;
  }

  if (!shouldWrite || existsSync(targetPath)) {
    return;
  }

  ensureDir(targetPath);
  copyFileSync(sourcePath, targetPath);
  summary.assetsCopied += 1;
}

function rewriteLegacyObjectUrls(value) {
  return String(value || "").replace(
    /https?:\/\/[^\s"'<>]+\/api\/v2\/objects\/(file|icon)\/([A-Za-z0-9_-]+\.[A-Za-z0-9]+)/g,
    (_, assetType, fileName) => {
      const normalizedFileName = String(fileName || "").trim();
      copyLegacyAsset(normalizedFileName, assetType);
      return `/legacy/${assetType}/${normalizedFileName}`;
    },
  );
}

function rewriteLegacyDocUrl(value) {
  const rawValue = String(value || "").trim();
  const oldPostPathMatch = rawValue.match(/^https?:\/\/[^/]+\/posts\/[^/]+\/([^/?#]+)\/?$/i);

  if (oldPostPathMatch?.[1]) {
    return `/blog/${oldPostPathMatch[1]}/`;
  }

  return rawValue;
}

function rewriteLegacyUrls(body) {
  const withCopiedAssets = rewriteLegacyObjectUrls(body);

  return withCopiedAssets
    .replace(/\(\s+(\/legacy\/(?:file|icon)\/|https?:\/\/)/g, "($1")
    .trimEnd() + "\n";
}

function sanitizeMdxBody(body) {
  return String(body || "")
    .replace(/^<!--[\s\S]*?-->\s*/u, "")
    .trimStart();
}

function rewriteRelativeMarkdownImages(body) {
  return String(body || "").replace(/!\[([^\]]*)\]\((<)?([^)\r\n]+)(>)?\)/g, (full, alt, _open, rawSrc) => {
    const src = String(rawSrc || "").trim();

    if (!src || /^(https?:\/\/|\/|data:)/i.test(src)) {
      return full;
    }

    const fallbackLabel = String(alt || src).trim();
    return `_${fallbackLabel}_`;
  });
}

function buildFrontmatter(entry) {
  const lines = [
    "---",
    `routeSlug: ${yamlValue(entry.routeSlug)}`,
    `title: ${yamlValue(entry.title)}`,
    `createdAt: ${yamlValue(entry.createdAt)}`,
  ];

  for (const field of [
    "updatedAt",
    "type",
    "archiveSlug",
    "description",
    "projectUrl",
    "docUrl",
    "previewUrl",
    "avatar",
  ]) {
    if (entry[field]) {
      lines.push(`${field}: ${yamlValue(entry[field])}`);
    }
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
    const categoryDir = path.join(paths.blogContent, category.slug || "uncategorized");
    const targetPath =
      existingIndex.legacySourceIdToPath.get(unwrapObjectId(doc._id)) ||
      findExistingPath(existingIndex, [title, routeSlug]) ||
      createUniqueTargetPath(categoryDir, routeSlug, ".mdx");

    const content = [
      buildFrontmatter({
        routeSlug,
        title,
        createdAt: formatLocalDate(doc.created),
        type: category.name,
        archiveSlug: "",
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
    const legacySourceId = unwrapObjectId(doc._id);
    const topic =
      noteTopicOverrides.get(legacySourceId) ||
      topics.get(unwrapObjectId(doc.topicId)) || { slug: "misc", name: "" };
    const title = String(doc.title || "").trim() || "Untitled";
    const routeSlug = unwrapNumber(doc.nid) ?? title;
    const topicDir = path.join(paths.noteContent, topic.slug || "misc");
    const existingPath =
      existingIndex.legacySourceIdToPath.get(legacySourceId) ||
      findExistingPath(existingIndex, [title]);
    const targetPath =
      existingPath ||
      createUniqueTargetPath(topicDir, title, ".mdx", String(routeSlug));

    const content = [
      buildFrontmatter({
        routeSlug,
        title,
        createdAt: formatLocalDate(doc.created),
        type: topic.name,
        archiveSlug: "",
        legacySourceCollection: "notes",
        legacySourceId,
      }),
      rewriteLegacyUrls(String(doc.text || "")),
    ].join("");

    writeEntry("note", targetPath, content);
  }
}

function buildProjectBody(doc) {
  const body = rewriteRelativeMarkdownImages(
    sanitizeMdxBody(rewriteLegacyUrls(String(doc.text || ""))),
  );
  const links = [
    { label: "Repository", href: String(doc.projectUrl || "").trim() },
    { label: "Documentation", href: rewriteLegacyDocUrl(doc.docUrl) },
    { label: "Preview", href: String(doc.previewUrl || "").trim() },
  ].filter((item) => item.href && !body.includes(item.href));

  if (links.length === 0) {
    return body;
  }

  const linkBlock = [
    "## Links",
    "",
    ...links.map((item) => `- [${item.label}](${item.href})`),
    "",
  ].join("\n");

  if (!body.trim()) {
    return `${linkBlock}\n`;
  }

  return `${body.trimEnd()}\n\n${linkBlock}`;
}

function migrateProjects() {
  const existingIndex = buildExistingIndex(paths.projectContent);
  const documents = readBsonDocuments(paths.projects);

  for (const doc of documents) {
    const legacySourceId = unwrapObjectId(doc._id);
    const title = String(doc.name || "").trim() || "Untitled Project";
    const routeSlug = slugifyValue(title) || legacySourceId || "project";
    const existingPath =
      existingIndex.legacySourceIdToPath.get(legacySourceId) ||
      findExistingPath(existingIndex, [title, routeSlug]);
    const targetPath =
      existingPath ||
      createUniqueTargetPath(paths.projectContent, routeSlug, ".mdx");

    const content = [
      buildFrontmatter({
        routeSlug,
        title,
        createdAt: formatLocalDate(doc.created),
        type: "Project",
        archiveSlug: "project",
        description: String(doc.description || "").trim(),
        projectUrl: String(doc.projectUrl || "").trim(),
        docUrl: rewriteLegacyDocUrl(doc.docUrl),
        previewUrl: String(doc.previewUrl || "").trim(),
        avatar: rewriteLegacyObjectUrls(String(doc.avatar || "").trim()),
        legacySourceCollection: "projects",
        legacySourceId,
      }),
      buildProjectBody(doc),
    ].join("");

    writeEntry("project", targetPath, content);
  }
}

if (migrateBlog && !existsSync(paths.posts)) {
  fail("Legacy post data not found under data/mx-space.");
}

if (migrateNote && !existsSync(paths.notes)) {
  fail("Legacy note data not found under data/mx-space.");
}

if (migrateProject && !existsSync(paths.projects)) {
  fail("Legacy project data not found under data/mx-space.");
}

console.log(shouldWrite ? "Running migration in write mode." : "Running migration in dry-run mode.");

if (migrateBlog) {
  migratePosts();
}

if (migrateNote) {
  migrateNotes();
}

if (migrateProject) {
  migrateProjects();
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
if (migrateProject) {
  console.log(
    `project: ${summary.project.created} create, ${summary.project.updated} update, ${summary.project.unchanged} unchanged`,
  );
}
console.log(`assets: ${shouldWrite ? summary.assetsCopied : copiedAssets.size} referenced`);
if (summary.missingAssets.size > 0) {
  console.log(`missing assets: ${Array.from(summary.missingAssets).sort().join(", ")}`);
}
