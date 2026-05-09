import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT_DIR = join(ROOT, "src", "content");
const CONTENT_SECTIONS = ["blog", "note", "project"] as const;
const REQUIRED_FIELDS_BY_SECTION = {
  blog: ["title", "description"],
  note: ["title"],
  project: ["routeSlug", "title", "description"],
} as const;

type Section = (typeof CONTENT_SECTIONS)[number];

function walk(dir: string) {
  const files: string[] = [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
    } else if (/\.(md|mdx)$/i.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

function parseFrontmatter(source: string) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\s*/);
  const frontmatter = new Map<string, string>();

  if (!match) return frontmatter;

  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith("#") || /^\s/.test(line)) {
      continue;
    }

    const separatorIndex = line.indexOf(":");
    if (separatorIndex < 1) continue;

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    frontmatter.set(key, value.replace(/^(['"])(.*)\1$/, "$2"));
  }

  return frontmatter;
}

function isValidDate(value: string | undefined) {
  if (!value) return false;
  return !Number.isNaN(new Date(value).getTime());
}

function auditFile(section: Section, filePath: string) {
  const source = readFileSync(filePath, "utf8");
  const frontmatter = parseFrontmatter(source);
  const issues: string[] = [];

  for (const field of REQUIRED_FIELDS_BY_SECTION[section]) {
    if (!frontmatter.get(field)?.trim()) {
      issues.push(`missing ${field}`);
    }
  }

  for (const field of ["createdAt", "updatedAt"]) {
    const value = frontmatter.get(field)?.trim();
    if (value && !isValidDate(value)) {
      issues.push(`invalid ${field}: ${value}`);
    }
  }

  return issues;
}

function main() {
  const findings: { file: string; issues: string[] }[] = [];

  for (const section of CONTENT_SECTIONS) {
    const sectionDir = join(CONTENT_DIR, section);

    for (const filePath of walk(sectionDir)) {
      const issues = auditFile(section, filePath);
      if (issues.length === 0) continue;

      findings.push({
        file: relative(ROOT, filePath).replace(/\\/g, "/"),
        issues,
      });
    }
  }

  if (findings.length === 0) {
    console.log("Content audit: no metadata issues found.");
    return;
  }

  console.log(`Content audit: ${findings.length} files need metadata cleanup.`);
  findings.forEach((finding) => {
    console.log(`${finding.file}: ${finding.issues.join(", ")}`);
  });
}

main();
