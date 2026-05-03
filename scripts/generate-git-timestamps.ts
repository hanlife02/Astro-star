import { execFileSync } from "node:child_process";
import { readdirSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT_DIR = join(ROOT, "src", "content");
const OUT_DIR = join(ROOT, "src", "gitlog");
const OUT_FILE = join(OUT_DIR, "git-timestamps.json");

interface TimestampEntry {
  createdAt: string | null;
  updatedAt: string | null;
}

function collectFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFiles(full));
    } else if (/\.(md|mdx)$/i.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

function getGitTimestamps(filePath: string): TimestampEntry {
  try {
    const gitLog = execFileSync(
      "git",
      ["log", "--follow", "--format=%aI", "--", filePath],
      { cwd: ROOT, encoding: "utf8" },
    );
    const timestamps = gitLog
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (timestamps.length > 0) {
      return {
        updatedAt: timestamps[0],
        createdAt: timestamps[timestamps.length - 1],
      };
    }
  } catch {
    // git not available or file not tracked
  }

  try {
    const stats = statSync(filePath);
    return {
      createdAt: stats.birthtime.toISOString(),
      updatedAt: stats.mtime.toISOString(),
    };
  } catch {
    return { createdAt: null, updatedAt: null };
  }
}

const files = collectFiles(CONTENT_DIR);
const result: Record<string, TimestampEntry> = {};

for (const file of files) {
  const key = relative(ROOT, file).replace(/\\/g, "/");
  result[key] = getGitTimestamps(file);
}

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_FILE, JSON.stringify(result, null, 2), "utf8");

console.log(
  `Generated ${OUT_FILE} with ${Object.keys(result).length} entries.`,
);
