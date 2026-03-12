#!/usr/bin/env node

import {
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

const paths = {
  comments: path.join(rootDir, "data/mx-space/comments.bson"),
  pages: path.join(rootDir, "data/mx-space/pages.bson"),
  blogContent: path.join(rootDir, "src/content/blog"),
  noteContent: path.join(rootDir, "src/content/note"),
  projectContent: path.join(rootDir, "src/content/project"),
  output: path.join(rootDir, "src/data/comments/legacy-comments.json"),
};

function fail(message) {
  console.error(message);
  process.exit(1);
}

function ensureDir(filePath) {
  mkdirSync(path.dirname(filePath), { recursive: true });
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

function unwrapObjectId(value) {
  if (typeof value === "string") return value;

  if (value && typeof value === "object" && "toHexString" in value && typeof value.toHexString === "function") {
    return value.toHexString();
  }

  return value && typeof value === "object" && "$oid" in value ? value.$oid : "";
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

function parseFrontmatterValue(rawValue) {
  const value = String(rawValue || "").trim();
  if (!value) return "";

  if (value === "null") return null;
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function getFileStem(filePath) {
  return path.basename(filePath, path.extname(filePath));
}

function readFrontmatter(filePath) {
  const source = readFileSync(filePath, "utf8");
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return new Map();

  const fields = new Map();

  for (const line of match[1].split("\n")) {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex <= 0) continue;

    const key = line.slice(0, separatorIndex).trim();
    const rawValue = line.slice(separatorIndex + 1).trim();
    fields.set(key, parseFrontmatterValue(rawValue));
  }

  return fields;
}

function buildRouteMap() {
  const routeMap = new Map();
  const sectionEntries = [
    { dirPath: paths.blogContent, section: "blog", collection: "posts" },
    { dirPath: paths.noteContent, section: "note", collection: "notes" },
    { dirPath: paths.projectContent, section: "project", collection: "projects" },
  ];

  for (const entry of sectionEntries) {
    for (const filePath of listContentFiles(entry.dirPath)) {
      const frontmatter = readFrontmatter(filePath);
      const legacySourceCollection = String(frontmatter.get("legacySourceCollection") || "").trim();
      const legacySourceId = String(frontmatter.get("legacySourceId") || "").trim();

      if (legacySourceCollection !== entry.collection || !legacySourceId) {
        continue;
      }

      const routeSlug = String(frontmatter.get("routeSlug") || "").trim() || getFileStem(filePath);
      routeMap.set(`${legacySourceCollection}:${legacySourceId}`, `/${entry.section}/${routeSlug}/`);
    }
  }

  for (const doc of readBsonDocuments(paths.pages)) {
    const id = unwrapObjectId(doc._id);
    const slug = String(doc.slug || "").trim();
    let routePath = null;

    if (slug === "about-me" || slug === "about-site") {
      routePath = "/about/";
    } else if (slug === "message") {
      routePath = "/links/";
    }

    if (routePath) {
      routeMap.set(`pages:${id}`, routePath);
    }
  }

  return routeMap;
}

function normalizePublicUrl(value) {
  const url = String(value || "").trim();
  return /^https?:\/\//i.test(url) ? url : null;
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

const routeMap = buildRouteMap();
const comments = readBsonDocuments(paths.comments);

const exportedComments = comments
  .filter((doc) => doc.state === 1 && !doc.isWhispers)
  .map((doc) => {
    const id = unwrapObjectId(doc._id);
    const refId = unwrapObjectId(doc.ref);
    const refType = String(doc.refType || "").trim();
    const routePath = routeMap.get(`${refType}:${refId}`) ?? null;

    return {
      id,
      refId,
      refType,
      routePath,
      author: String(doc.author || "Anonymous").trim() || "Anonymous",
      authorUrl: normalizePublicUrl(doc.url),
      text: String(doc.text || "").trim(),
      parentId: doc.parent ? unwrapObjectId(doc.parent) : null,
      childrenIds: Array.isArray(doc.children) ? doc.children.map((childId) => unwrapObjectId(childId)) : [],
      key: String(doc.key || "").trim() || null,
      createdAt: formatDate(doc.created),
      location: String(doc.location || "").trim() || null,
      isPinned: Boolean(doc.pin),
      source: String(doc.source || "").trim() || null,
    };
  })
  .sort((a, b) => {
    if (!a.createdAt && !b.createdAt) return 0;
    if (!a.createdAt) return 1;
    if (!b.createdAt) return -1;
    return a.createdAt.localeCompare(b.createdAt);
  });

const summary = exportedComments.reduce(
  (accumulator, comment) => {
    accumulator.byRefType[comment.refType] = (accumulator.byRefType[comment.refType] || 0) + 1;

    if (!comment.routePath) {
      accumulator.unmapped += 1;
      accumulator.unmappedByRefType[comment.refType] = (accumulator.unmappedByRefType[comment.refType] || 0) + 1;
    }

    return accumulator;
  },
  {
    byRefType: {},
    unmapped: 0,
    unmappedByRefType: {},
  },
);

ensureDir(paths.output);
writeFileSync(paths.output, `${JSON.stringify(exportedComments, null, 2)}\n`, "utf8");

console.log(`exported: ${exportedComments.length}`);
console.log(`unmapped: ${summary.unmapped}`);
console.log(`byRefType: ${JSON.stringify(summary.byRefType)}`);
console.log(`unmappedByRefType: ${JSON.stringify(summary.unmappedByRefType)}`);
