import { execFileSync } from "node:child_process";
import { Buffer } from "node:buffer";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import remarkMdx from "remark-mdx";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { algoliaSiteSearchConfig } from "../src/config/search.ts";
import { site } from "../src/config/site.ts";
import { resolveContentDates } from "../src/utils/content-dates.ts";
import { resolveContentSlug } from "../src/utils/content-slug.ts";
import { resolveContentTitle } from "../src/utils/content-title.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT_DIR = join(ROOT, "src", "content");
const VALID_SECTIONS = ["blog", "note", "project"] as const;
const ALGOLIA_RECORD_SIZE_LIMIT_BYTES = 10000;
const MAX_ALGOLIA_RECORD_BYTES = 9500;
const MAX_RECORD_CONTENT_BYTES = 5200;
const ALGOLIA_BATCH_SIZE = 500;

type SectionKey = (typeof VALID_SECTIONS)[number];

interface Frontmatter {
  archiveSlug?: string;
  createdAt?: string;
  description?: string;
  routeSlug?: string | number;
  title?: string;
  type?: string;
  updatedAt?: string;
}

interface TimestampEntry {
  createdAt: Date | null;
  updatedAt: Date | null;
}

interface AlgoliaRecord {
  objectID: string;
  content: string;
  createdAt?: string;
  description?: string;
  excerpt: string;
  headline: string;
  path: string;
  section: SectionKey;
  sourcePath: string;
  title: string;
  type: string;
  updatedAt?: string;
  url: string;
}

interface MdxNode {
  children?: MdxNode[];
  type?: string;
  value?: string;
}

function collectFiles(dir: string): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath));
    } else if (/\.(md|mdx)$/i.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

function parseFrontmatterValue(value: string): string | number {
  const trimmed = value.trim();
  const quoted = trimmed.match(/^(['"])(.*)\1$/);

  if (quoted) {
    return quoted[2].replace(/\\(["'])/g, "$1");
  }

  if (/^-?\d+$/.test(trimmed)) {
    return Number(trimmed);
  }

  return trimmed;
}

function parseFrontmatter(source: string) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\s*/);
  const frontmatter: Frontmatter = {};

  if (!match) {
    return { frontmatter, body: source };
  }

  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith("#") || /^\s/.test(line))
      continue;

    const separatorIndex = line.indexOf(":");
    if (separatorIndex < 1) continue;

    const key = line.slice(0, separatorIndex).trim() as keyof Frontmatter;
    const value = parseFrontmatterValue(line.slice(separatorIndex + 1));
    frontmatter[key] = value as never;
  }

  return { frontmatter, body: source.slice(match[0].length) };
}

function collectText(node: MdxNode, text: string[] = []) {
  if (
    node.type === "text" ||
    node.type === "inlineCode" ||
    node.type === "code"
  ) {
    const value = node.value?.trim();
    if (value) text.push(value);
  }

  for (const child of node.children ?? []) {
    collectText(child, text);
  }

  return text;
}

function fallbackText(source: string) {
  return source
    .replace(/^\s*(import|export)\s.+$/gmu, " ")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/[>#*_~|-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractText(source: string) {
  try {
    const tree = unified()
      .use(remarkParse)
      .use(remarkMdx)
      .parse(source) as MdxNode;
    return collectText(tree).join(" ").replace(/\s+/g, " ").trim();
  } catch {
    return fallbackText(source);
  }
}

function byteLength(value: string) {
  return Buffer.byteLength(value, "utf8");
}

function trimToByteLimit(text: string, maxBytes: number) {
  if (byteLength(text) <= maxBytes) return text;

  let result = "";

  for (const char of text) {
    const next = `${result}${char}`;
    if (byteLength(next) > maxBytes) break;
    result = next;
  }

  return result.trim();
}

function splitByByteLimit(text: string, maxBytes: number) {
  const chunks: string[] = [];
  let current = "";

  for (const char of text) {
    const next = `${current}${char}`;

    if (current && byteLength(next) > maxBytes) {
      chunks.push(current.trim());
      current = char;
    } else {
      current = next;
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

function chunkText(text: string) {
  const compact = text.replace(/\s+/g, " ").trim();
  if (byteLength(compact) <= MAX_RECORD_CONTENT_BYTES) return [compact];

  const chunks: string[] = [];
  let current = "";

  for (const paragraph of compact.split(/(?<=[.!?。！？])\s+/u)) {
    if (!paragraph) continue;

    const next = current ? `${current} ${paragraph}` : paragraph;

    if (byteLength(next) > MAX_RECORD_CONTENT_BYTES) {
      if (current) chunks.push(current.trim());

      if (byteLength(paragraph) > MAX_RECORD_CONTENT_BYTES) {
        chunks.push(...splitByByteLimit(paragraph, MAX_RECORD_CONTENT_BYTES));
        current = "";
      } else {
        current = paragraph;
      }
    } else {
      current = next;
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks.filter(Boolean);
}

function excerpt(text: string) {
  const compact = text.replace(/\s+/g, " ").trim();
  return compact.length > 180 ? `${compact.slice(0, 177)}...` : compact;
}

function recordSize(record: AlgoliaRecord) {
  return byteLength(JSON.stringify(record));
}

function fitRecordSize(record: AlgoliaRecord) {
  let fitted = record;
  let size = recordSize(fitted);

  while (size > MAX_ALGOLIA_RECORD_BYTES && byteLength(fitted.content) > 1000) {
    const overflow = size - MAX_ALGOLIA_RECORD_BYTES;
    const nextContentBytes = Math.max(
      1000,
      byteLength(fitted.content) - overflow - 300,
    );
    const content = trimToByteLimit(fitted.content, nextContentBytes);

    fitted = {
      ...fitted,
      content,
      excerpt: excerpt(content),
    };
    size = recordSize(fitted);
  }

  if (size > ALGOLIA_RECORD_SIZE_LIMIT_BYTES) {
    throw new Error(
      `Generated Algolia record is too large: ${fitted.objectID} size=${size}/${ALGOLIA_RECORD_SIZE_LIMIT_BYTES} bytes.`,
    );
  }

  return fitted;
}

function getLargestRecordSize(records: AlgoliaRecord[]) {
  return records.reduce(
    (largest, record) => {
      const size = recordSize(record);
      return size > largest.size
        ? { objectID: record.objectID, size }
        : largest;
    },
    { objectID: "", size: 0 },
  );
}

function getGitTimestamps(filePath: string): TimestampEntry {
  try {
    const gitLog = execFileSync(
      "git",
      ["log", "--follow", "--format=%aI", "--", filePath],
      {
        cwd: ROOT,
        encoding: "utf8",
      },
    );
    const timestamps = gitLog
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (timestamps.length > 0) {
      return {
        createdAt: new Date(timestamps[timestamps.length - 1]),
        updatedAt: new Date(timestamps[0]),
      };
    }
  } catch {}

  try {
    const stats = statSync(filePath);
    return {
      createdAt: stats.birthtime,
      updatedAt: stats.mtime,
    };
  } catch {
    return { createdAt: null, updatedAt: null };
  }
}

function isSection(value: string): value is SectionKey {
  return VALID_SECTIONS.includes(value as SectionKey);
}

function buildRecords() {
  const records: AlgoliaRecord[] = [];

  for (const section of VALID_SECTIONS) {
    const sectionDir = join(CONTENT_DIR, section);

    for (const filePath of collectFiles(sectionDir)) {
      const source = readFileSync(filePath, "utf8");
      const { frontmatter, body } = parseFrontmatter(source);
      const entryId = relative(sectionDir, filePath).replace(/\\/g, "/");
      const sourcePath = relative(ROOT, filePath).replace(/\\/g, "/");
      const routeSlug = resolveContentSlug(entryId, frontmatter.routeSlug);
      const title = resolveContentTitle(entryId, frontmatter.title);
      const description = frontmatter.description?.trim();
      const type = frontmatter.type?.trim() || "Uncategorized";
      const path = `/${section}/${routeSlug}/`;
      const url = new URL(path, site.site.url).toString();
      const dates = resolveContentDates(
        frontmatter,
        getGitTimestamps(filePath),
      );
      const text = extractText(body);
      const content = [description, text].filter(Boolean).join(" ").trim();
      const chunks = chunkText(content || title);

      chunks.forEach((chunk, index) => {
        records.push(
          fitRecordSize({
            objectID: `${section}/${routeSlug}${chunks.length > 1 ? `#${index + 1}` : ""}`,
            content: chunk,
            createdAt: dates.createdAt?.toISOString(),
            description,
            excerpt: excerpt(chunk),
            headline: title,
            path,
            section,
            sourcePath,
            title,
            type,
            updatedAt: dates.updatedAt?.toISOString(),
            url,
          }),
        );
      });
    }
  }

  return records.filter((record) => isSection(record.section));
}

async function algoliaRequest(path: string, apiKey: string, body?: unknown) {
  const response = await fetch(
    `https://${algoliaSiteSearchConfig.applicationId}.algolia.net${path}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Algolia-API-Key": apiKey,
        "X-Algolia-Application-Id": algoliaSiteSearchConfig.applicationId,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Algolia request failed (${response.status}): ${await response.text()}`,
    );
  }

  return response.json() as Promise<unknown>;
}

async function clearIndex(apiKey: string) {
  const indexPath = encodeURIComponent(algoliaSiteSearchConfig.indexName);
  await algoliaRequest(`/1/indexes/${indexPath}/clear`, apiKey);
}

async function saveRecords(apiKey: string, records: AlgoliaRecord[]) {
  const indexPath = encodeURIComponent(algoliaSiteSearchConfig.indexName);

  for (let offset = 0; offset < records.length; offset += ALGOLIA_BATCH_SIZE) {
    const batch = records.slice(offset, offset + ALGOLIA_BATCH_SIZE);

    await algoliaRequest(`/1/indexes/${indexPath}/batch`, apiKey, {
      requests: batch.map((record) => ({
        action: "addObject",
        body: record,
      })),
    });
  }
}

async function main() {
  const indexingKey =
    process.env.ALGOLIA_WRITE_API_KEY || process.env.ALGOLIA_ADMIN_API_KEY;
  const adminKey = process.env.ALGOLIA_ADMIN_API_KEY;
  const dryRun = process.env.ALGOLIA_SYNC_DRY_RUN === "true";

  if (
    !algoliaSiteSearchConfig.applicationId ||
    !algoliaSiteSearchConfig.indexName
  ) {
    console.log(
      "Algolia sync skipped: missing applicationId or indexName in src/config/search.ts.",
    );
    return;
  }

  const records = buildRecords();
  const largestRecord = getLargestRecordSize(records);

  if (dryRun) {
    console.log(
      `Algolia sync dry run: generated ${records.length} records. Largest record: ${largestRecord.objectID} (${largestRecord.size} bytes).`,
    );
    return;
  }

  if (!indexingKey) {
    console.log(
      "Algolia sync skipped: set ALGOLIA_WRITE_API_KEY or ALGOLIA_ADMIN_API_KEY.",
    );
    return;
  }

  if (records.length === 0) {
    throw new Error(
      "Refusing to clear Algolia index because no content records were generated.",
    );
  }

  if (adminKey) {
    await clearIndex(adminKey);
  } else {
    console.log(
      "ALGOLIA_ADMIN_API_KEY is not set; stale records from deleted articles will not be removed.",
    );
  }

  await saveRecords(indexingKey, records);
  console.log(
    `Synced ${records.length} Algolia records to ${algoliaSiteSearchConfig.indexName}.`,
  );
}

await main();
