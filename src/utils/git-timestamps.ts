import { execFileSync } from "node:child_process";
import { statSync } from "node:fs";
import { fileURLToPath } from "node:url";

interface GitTimestamps {
  createdAt: Date | null;
  updatedAt: Date | null;
}

const timestampCache = new Map<string, GitTimestamps>();
const repoRoot = fileURLToPath(new URL("../../", import.meta.url));

function isValidDate(value: Date | null): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

export function getGitTimestamps(file: string | URL): GitTimestamps {
  const filePath = typeof file === "string" ? file : fileURLToPath(file);
  const cached = timestampCache.get(filePath);

  if (cached) {
    return cached;
  }

  let createdAt: Date | null = null;
  let updatedAt: Date | null = null;

  try {
    const gitLog = execFileSync("git", ["log", "--follow", "--format=%aI", "--", filePath], {
      cwd: repoRoot,
      encoding: "utf8",
    });
    const timestamps = gitLog
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (timestamps.length > 0) {
      updatedAt = new Date(timestamps[0]);
      createdAt = new Date(timestamps[timestamps.length - 1]);
    }
  } catch {
  }

  try {
    const stats = statSync(filePath);

    if (!isValidDate(createdAt)) {
      createdAt = stats.birthtime;
    }

    if (!isValidDate(updatedAt)) {
      updatedAt = stats.mtime;
    }
  } catch {
  }

  const result = {
    createdAt: isValidDate(createdAt) ? createdAt : null,
    updatedAt: isValidDate(updatedAt) ? updatedAt : null,
  } satisfies GitTimestamps;

  timestampCache.set(filePath, result);
  return result;
}
