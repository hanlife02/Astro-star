#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { deserialize } from "bson";

const rootDir = process.cwd();
const shouldWrite = process.argv.includes("--write");
const targetPath = process.env.WALINE_IMPORT_TARGET?.trim() || "/about/";
const serverURL = process.env.WALINE_SERVER_URL?.trim() || "";
const token = process.env.WALINE_TOKEN?.trim();
const lang = process.env.WALINE_LANG?.trim() || "zh-CN";
const fallbackUa =
  process.env.WALINE_IMPORT_UA?.trim() ||
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36";

const paths = {
  comments: path.join(rootDir, "data/mx-space/comments.bson"),
};

const JSON_HEADERS = {
  "Content-Type": "application/json",
};

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

function unwrapObjectId(value) {
  if (typeof value === "string") return value;

  if (value && typeof value === "object" && "toHexString" in value && typeof value.toHexString === "function") {
    return value.toHexString();
  }

  return value && typeof value === "object" && "$oid" in value ? value.$oid : "";
}

function normalizePublicUrl(value) {
  const url = String(value || "").trim();
  return /^https?:\/\//i.test(url) ? url : undefined;
}

function getApiPrefix(value) {
  return `${value.replace(/\/?$/, "/")}api/`;
}

function toTimestamp(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

async function createWalineComment(comment) {
  const headers = { ...JSON_HEADERS };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${getApiPrefix(serverURL)}comment?lang=${encodeURIComponent(lang)}`, {
    method: "POST",
    headers,
    body: JSON.stringify(comment),
  });

  return response.json();
}

const pageComments = readBsonDocuments(paths.comments)
  .filter((doc) => doc.refType === "pages" && doc.state === 1 && !doc.isWhispers)
  .sort((first, second) => toTimestamp(first.created) - toTimestamp(second.created));

const commentsById = new Map(pageComments.map((comment) => [unwrapObjectId(comment._id), comment]));
const importedIdMap = new Map();

function resolveRootOldId(comment) {
  let current = comment;
  let safety = 0;

  while (current?.parent && safety < 20) {
    const parentId = unwrapObjectId(current.parent);
    current = commentsById.get(parentId);
    safety += 1;
  }

  return current ? unwrapObjectId(current._id) : unwrapObjectId(comment._id);
}

if (shouldWrite && !serverURL) {
  fail("WALINE_SERVER_URL is required in write mode.");
}

console.log(shouldWrite ? "Importing comments into Waline." : "Dry run only. Use --write to import.");
console.log(`Target path: ${targetPath}`);
console.log(`Comments to process: ${pageComments.length}`);

let createdCount = 0;
let skippedCount = 0;
let previewObjectId = 100000;

for (const comment of pageComments) {
  const oldId = unwrapObjectId(comment._id);
  const parentOldId = comment.parent ? unwrapObjectId(comment.parent) : null;
  const rootOldId = resolveRootOldId(comment);

  if (parentOldId && !importedIdMap.has(parentOldId)) {
    skippedCount += 1;
    console.warn(`[skip] missing imported parent for ${oldId}`);
    continue;
  }

  const payload = {
    nick: String(comment.author || "Anonymous").trim() || "Anonymous",
    mail: String(comment.mail || "").trim() || undefined,
    link: normalizePublicUrl(comment.url),
    comment: String(comment.text || "").trim(),
    ua: String(comment.agent || "").trim() || fallbackUa,
    url: targetPath,
    pid: parentOldId ? importedIdMap.get(parentOldId) : undefined,
    rid: parentOldId ? (importedIdMap.get(rootOldId) ?? importedIdMap.get(parentOldId)) : undefined,
  };

  if (!payload.comment) {
    skippedCount += 1;
    console.warn(`[skip] empty comment ${oldId}`);
    continue;
  }

  if (!shouldWrite) {
    const simulatedObjectId = previewObjectId;
    previewObjectId += 1;
    importedIdMap.set(oldId, simulatedObjectId);
    console.log(
      `[preview] ${oldId} -> ${targetPath} ${payload.pid ? `(reply to ${payload.pid})` : "(root)"} => ${simulatedObjectId}`,
    );
    continue;
  }

  const result = await createWalineComment(payload);

  if (result.errno) {
    fail(`Import failed for ${oldId}: ${result.errmsg}`);
  }

  const newObjectId = result.data?.objectId;

  if (!newObjectId) {
    fail(`Import failed for ${oldId}: missing objectId in response.`);
  }

  importedIdMap.set(oldId, newObjectId);
  createdCount += 1;
  console.log(`[create] ${oldId} -> ${newObjectId}`);
}

console.log("");
console.log("Summary");
console.log(`created: ${createdCount}`);
console.log(`skipped: ${skippedCount}`);
console.log(`targetPath: ${targetPath}`);
console.log(`writeMode: ${shouldWrite}`);
