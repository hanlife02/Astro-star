import { existsSync, readFileSync, readdirSync } from "node:fs";
import { extname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import type { SitemapItem } from "@astrojs/sitemap";
import { resolveContentDates } from "./content-dates";
import {
  normalizeArchiveSlug,
  resolveContentSlug,
  slugifyCategoryLabel,
} from "./content-slug";

type Frontmatter = Record<string, boolean | number | string | undefined>;
type GitTimestampManifest = Record<
  string,
  { createdAt: string | null; updatedAt: string | null }
>;

const CONTENT_COLLECTIONS = ["blog", "note", "project"] as const;
const ARCHIVE_COLLECTIONS = ["blog", "note"] as const;
const PROJECT_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const CONTENT_ROOT = join(PROJECT_ROOT, "src", "content");
const GIT_TIMESTAMPS_PATH = join(
  PROJECT_ROOT,
  "src",
  "gitlog",
  "git-timestamps.json",
);

interface ContentRouteEntry {
  archiveSlug?: string;
  collection: "blog" | "note" | "page" | "project";
  date: Date;
  id: string;
  path: string;
  routeSlug?: number | string;
  type?: string;
}

function isContentCollection(
  collection: ContentRouteEntry["collection"],
): collection is (typeof CONTENT_COLLECTIONS)[number] {
  return CONTENT_COLLECTIONS.some((item) => item === collection);
}

function isArchiveCollection(
  collection: ContentRouteEntry["collection"],
): collection is (typeof ARCHIVE_COLLECTIONS)[number] {
  return ARCHIVE_COLLECTIONS.some((item) => item === collection);
}

function isValidDate(value: Date | null): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

function toDate(value: string | null | undefined) {
  if (!value) return null;

  const date = new Date(value);
  return isValidDate(date) ? date : null;
}

function parseFrontmatterValue(value: string) {
  const trimmed = value.trim();
  const quoted = trimmed.match(/^(['"])(.*)\1$/);

  if (quoted) {
    return quoted[2].replace(/\\(["'])/g, "$1");
  }

  if (/^-?\d+$/.test(trimmed)) {
    return Number(trimmed);
  }

  if (/^(true|false)$/i.test(trimmed)) {
    return trimmed.toLowerCase() === "true";
  }

  return trimmed;
}

function parseFrontmatter(source: string) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\s*/);
  const frontmatter: Frontmatter = {};

  if (!match) return frontmatter;

  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith("#") || /^\s/.test(line)) {
      continue;
    }

    const separatorIndex = line.indexOf(":");
    if (separatorIndex < 1) continue;

    const key = line.slice(0, separatorIndex).trim();
    frontmatter[key] = parseFrontmatterValue(line.slice(separatorIndex + 1));
  }

  return frontmatter;
}

function readGitTimestamps() {
  if (!existsSync(GIT_TIMESTAMPS_PATH)) return {};

  try {
    return JSON.parse(
      readFileSync(GIT_TIMESTAMPS_PATH, "utf8"),
    ) as GitTimestampManifest;
  } catch {
    return {};
  }
}

function getStringFrontmatterValue(value: Frontmatter[string]) {
  return typeof value === "string" ? value.trim() : "";
}

function getSlugFrontmatterValue(value: Frontmatter[string]) {
  return typeof value === "string" || typeof value === "number"
    ? value
    : undefined;
}

function listContentFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];

  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) return listContentFiles(path);
    if (!entry.isFile()) return [];
    if (![".md", ".mdx"].includes(extname(entry.name).toLowerCase())) return [];

    return [path];
  });
}

function getContentId(collection: string, relativeContentPath: string) {
  const prefix = `${collection}/`;
  const path = relativeContentPath.startsWith(prefix)
    ? relativeContentPath.slice(prefix.length)
    : relativeContentPath;

  return path.replace(/\.(md|mdx)$/i, "");
}

function getContentPath(path: string) {
  return relative(PROJECT_ROOT, path).split(sep).join("/");
}

function getArchiveSlug(collection: "blog" | "note", entry: ContentRouteEntry) {
  const directoryArchiveSlug = normalizeArchiveSlug(
    entry.id.split("/").slice(0, -1).at(-1),
  );
  const label = entry.type || directoryArchiveSlug || "Uncategorized";

  return (
    (collection === "blog" ? directoryArchiveSlug : "") ||
    normalizeArchiveSlug(entry.archiveSlug) ||
    directoryArchiveSlug ||
    slugifyCategoryLabel(label) ||
    "uncategorized"
  );
}

function setLatest(map: Map<string, Date>, path: string, date: Date) {
  const existing = map.get(path);

  if (!existing || date.getTime() > existing.getTime()) {
    map.set(path, date);
  }
}

function toSitemapUrl(siteUrl: string, path: string) {
  return new URL(path, siteUrl).toString();
}

function getEntries() {
  const gitTimestamps = readGitTimestamps();

  return listContentFiles(CONTENT_ROOT).flatMap((path) => {
    const contentPath = getContentPath(path);
    const relativeContentPath = relative(CONTENT_ROOT, path)
      .split(sep)
      .join("/");
    const [collection] = relativeContentPath.split("/");

    if (!["blog", "note", "page", "project"].includes(collection)) return [];

    const source = readFileSync(path, "utf8");
    const frontmatter = parseFrontmatter(source);
    if (frontmatter.published === false) return [];

    const gitTimestamp = gitTimestamps[contentPath];
    const { createdAt, updatedAt } = resolveContentDates(
      {
        createdAt: getStringFrontmatterValue(frontmatter.createdAt),
        updatedAt: getStringFrontmatterValue(frontmatter.updatedAt),
      },
      {
        createdAt: toDate(gitTimestamp?.createdAt),
        updatedAt: toDate(gitTimestamp?.updatedAt),
      },
    );
    const date = updatedAt ?? createdAt;

    if (!date) return [];

    return [
      {
        archiveSlug: getStringFrontmatterValue(frontmatter.archiveSlug),
        collection: collection as ContentRouteEntry["collection"],
        date,
        id: getContentId(collection, relativeContentPath),
        path: contentPath,
        routeSlug: getSlugFrontmatterValue(frontmatter.routeSlug),
        type: getStringFrontmatterValue(frontmatter.type),
      } satisfies ContentRouteEntry,
    ];
  });
}

export function createSitemapLastmodSerializer(siteUrl: string) {
  const entries = getEntries();
  const lastmodByPath = new Map<string, Date>();

  for (const entry of entries) {
    if (entry.collection === "page") {
      setLatest(lastmodByPath, `/${entry.id}/`, entry.date);
      setLatest(lastmodByPath, "/", entry.date);
      continue;
    }

    if (!isContentCollection(entry.collection)) continue;

    const slug = resolveContentSlug(entry.id, entry.routeSlug);
    setLatest(lastmodByPath, `/${entry.collection}/${slug}/`, entry.date);
    setLatest(lastmodByPath, `/${entry.collection}/`, entry.date);
    setLatest(lastmodByPath, "/", entry.date);

    if (isArchiveCollection(entry.collection)) {
      const archiveSlug = getArchiveSlug(entry.collection, entry);
      setLatest(lastmodByPath, `/${entry.collection}-archive/`, entry.date);
      setLatest(
        lastmodByPath,
        `/${entry.collection}-archive/${archiveSlug}/`,
        entry.date,
      );
    }
  }

  const lastmodByUrl = new Map(
    Array.from(lastmodByPath, ([path, date]) => [
      toSitemapUrl(siteUrl, path),
      date.toISOString(),
    ]),
  );

  return (item: SitemapItem) => {
    const lastmod = lastmodByUrl.get(item.url);

    if (lastmod) {
      item.lastmod = lastmod;
    }

    return item;
  };
}
