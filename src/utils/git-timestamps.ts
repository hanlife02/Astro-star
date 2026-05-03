import { execFileSync } from "node:child_process";
import { statSync } from "node:fs";
import { resolve } from "node:path";

interface GitTimestamps {
  createdAt: Date | null;
  updatedAt: Date | null;
}

type ManifestData = Record<
  string,
  { createdAt: string | null; updatedAt: string | null }
>;

// Vite bundles this JSON into the server output at build time.
// In dev without prebuild, the glob matches nothing → empty object → undefined.
const manifestModules = import.meta.glob<ManifestData>(
  "../gitlog/git-timestamps.json",
  { eager: true, import: "default" },
);
const manifest = Object.values(manifestModules)[0] as ManifestData | undefined;

const timestampCache = new Map<string, GitTimestamps>();

function isValidDate(value: Date | null): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

function toDate(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isValidDate(d) ? d : null;
}

/**
 * Get git timestamps for a content file.
 * @param contentPath Project-root-relative path, e.g. "src/content/blog/xxx.mdx"
 */
export function getGitTimestamps(contentPath: string): GitTimestamps {
  const cached = timestampCache.get(contentPath);
  if (cached) return cached;

  // 1. Pre-built manifest (production & dev after prebuild)
  const entry = manifest?.[contentPath];
  if (entry) {
    const result: GitTimestamps = {
      createdAt: toDate(entry.createdAt),
      updatedAt: toDate(entry.updatedAt),
    };
    timestampCache.set(contentPath, result);
    return result;
  }

  // 2. Live git log (development fallback)
  const absolutePath = resolve(contentPath);
  let createdAt: Date | null = null;
  let updatedAt: Date | null = null;

  try {
    const gitLog = execFileSync(
      "git",
      ["log", "--follow", "--format=%aI", "--", absolutePath],
      {
        encoding: "utf8",
      },
    );
    const timestamps = gitLog
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (timestamps.length > 0) {
      updatedAt = new Date(timestamps[0]);
      createdAt = new Date(timestamps[timestamps.length - 1]);
    }
  } catch {}

  // 3. File stats fallback
  try {
    const stats = statSync(absolutePath);

    if (!isValidDate(createdAt)) {
      createdAt = stats.birthtime;
    }

    if (!isValidDate(updatedAt)) {
      updatedAt = stats.mtime;
    }
  } catch {}

  const result = {
    createdAt: isValidDate(createdAt) ? createdAt : null,
    updatedAt: isValidDate(updatedAt) ? updatedAt : null,
  } satisfies GitTimestamps;

  timestampCache.set(contentPath, result);
  return result;
}
