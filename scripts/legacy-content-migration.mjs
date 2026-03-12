import { deserialize } from "bson";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, basename, relative } from "node:path";

const LEGACY_MOVE_DIR = "move";
const CONTENT_ROOT = "src/content";
const PLACEHOLDER_CREATED_AT = "2025-04-04 01:37:49";
const BLOG_CATEGORY_DIR_MAP = {
  building: "build",
  tools: "project",
  notes: "note",
  eihei: "try",
  course: "course",
  materials: "materials",
};

function readBsonCollection(name) {
  const buffer = readFileSync(join(LEGACY_MOVE_DIR, `${name}.bson`));
  const docs = [];
  let offset = 0;

  while (offset < buffer.length) {
    const size = buffer.readInt32LE(offset);
    docs.push(deserialize(buffer.subarray(offset, offset + size)));
    offset += size;
  }

  return docs;
}

function walk(dir) {
  const entries = [];

  for (const name of readdirSync(dir)) {
    const fullPath = join(dir, name);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      entries.push(...walk(fullPath));
      continue;
    }

    if (/\.(md|mdx)$/i.test(name)) {
      entries.push(fullPath);
    }
  }

  return entries;
}

function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return {};

  const frontmatter = {};

  for (const line of match[1].split(/\r?\n/)) {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    frontmatter[key] = value.replace(/^['"]|['"]$/g, "");
  }

  return frontmatter;
}

function formatFrontmatterDate(value) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return "";

  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  return formatter.format(value);
}

function escapeFrontmatterString(value) {
  return JSON.stringify(String(value));
}

function sanitizeFileSegment(value) {
  return String(value)
    .replace(/[<>:"/\\|?*]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/g, "");
}

function normalizeLegacyBody(value) {
  return String(value || "").replace(/\r\n/g, "\n").trim();
}

function buildMdxDocument(frontmatter, body) {
  const lines = ["---"];

  for (const [key, value] of Object.entries(frontmatter)) {
    if (value === "") continue;
    lines.push(`${key}: ${escapeFrontmatterString(value)}`);
  }

  lines.push("---", "", body);
  return `${lines.join("\n").trimEnd()}\n`;
}

function resetDirectory(dir) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
}

function getFileExtension(filePath) {
  const match = filePath.match(/\.(md|mdx)$/i);
  return match ? `.${match[1].toLowerCase()}` : ".md";
}

function buildExistingExtensionMap(section) {
  const dir = join(CONTENT_ROOT, section);
  if (!existsSync(dir)) return new Map();

  const files = walk(dir);
  const map = new Map();

  for (const filePath of files) {
    const raw = readFileSync(filePath, "utf8");
    const frontmatter = parseFrontmatter(raw);
    const title = frontmatter.title?.trim() || basename(filePath).replace(/\.(md|mdx)$/i, "");
    map.set(title, getFileExtension(filePath));
  }

  return map;
}

function writeLegacyNotes() {
  const notes = readBsonCollection("notes");
  const topics = new Map(readBsonCollection("topics").map((item) => [String(item._id), item]));
  const titleCounts = buildCountMap(notes.map((item) => String(item.title || "").trim() || "Untitled"));
  const noteRoot = join(CONTENT_ROOT, "note");

  resetDirectory(noteRoot);

  let writtenCount = 0;

  for (const note of notes) {
    const title = String(note.title || "").trim() || "Untitled";
    const topic = note.topicId ? topics.get(String(note.topicId)) : null;
    const archiveSlug = sanitizeFileSegment(topic?.slug || "uncategorized") || "uncategorized";
    const type = topic?.name || "Uncategorized";
    const nid = String(note.nid || "");
    const duplicateCount = titleCounts.get(title) || 0;
    const baseFileName = sanitizeFileSegment(title) || `note-${nid || writtenCount + 1}`;
    const fileName = duplicateCount > 1 ? `${baseFileName}__${nid}.mdx` : `${baseFileName}.mdx`;
    const outputDir = join(noteRoot, archiveSlug);
    const outputPath = join(outputDir, fileName);

    mkdirSync(outputDir, { recursive: true });

    const document = buildMdxDocument(
      {
        title,
        routeSlug: nid || baseFileName,
        createdAt: formatFrontmatterDate(note.created),
        type,
        archiveSlug,
      },
      normalizeLegacyBody(note.text),
    );

    writeFileSync(outputPath, document, "utf8");
    writtenCount += 1;
  }

  console.log(`# Wrote note content`);
  console.log(`- Output directory: src/content/note`);
  console.log(`- Files written: ${writtenCount}`);
}

function writeLegacyBlog() {
  const posts = readBsonCollection("posts");
  const categories = new Map(readBsonCollection("categories").map((item) => [String(item._id), item]));
  const extensionMap = buildExistingExtensionMap("blog");
  const blogRoot = join(CONTENT_ROOT, "blog");

  resetDirectory(blogRoot);

  let writtenCount = 0;

  for (const post of posts) {
    const title = String(post.title || "").trim() || "Untitled";
    const category = post.categoryId ? categories.get(String(post.categoryId)) : null;
    const legacyCategorySlug = String(category?.slug || "").trim();
    const archiveSlug = BLOG_CATEGORY_DIR_MAP[legacyCategorySlug] || sanitizeFileSegment(legacyCategorySlug) || "uncategorized";
    const type = category?.name || "Uncategorized";
    const fileName = `${sanitizeFileSegment(title) || `post-${writtenCount + 1}`}${extensionMap.get(title) || ".md"}`;
    const outputDir = join(blogRoot, archiveSlug);
    const outputPath = join(outputDir, fileName);
    const summary = typeof post.summary === "string" && post.summary.trim() && post.summary.trim() !== "null"
      ? post.summary.trim()
      : "";

    mkdirSync(outputDir, { recursive: true });

    const document = buildMdxDocument(
      {
        title,
        routeSlug: String(post.slug || "").trim(),
        createdAt: formatFrontmatterDate(post.created),
        type,
        archiveSlug,
        description: summary,
      },
      normalizeLegacyBody(post.text),
    );

    writeFileSync(outputPath, document, "utf8");
    writtenCount += 1;
  }

  console.log(`# Wrote blog content`);
  console.log(`- Output directory: src/content/blog`);
  console.log(`- Files written: ${writtenCount}`);
}

function readCurrentEntries(section) {
  const dir = join(CONTENT_ROOT, section);
  if (!existsSync(dir)) return [];
  const files = walk(dir);

  return files.map((filePath) => {
    const raw = readFileSync(filePath, "utf8");
    const frontmatter = parseFrontmatter(raw);
    const fileTitle = basename(filePath).replace(/\.(md|mdx)$/i, "");

    return {
      filePath: relative(process.cwd(), filePath).replace(/\\/g, "/"),
      title: frontmatter.title?.trim() || fileTitle,
      routeSlug: frontmatter.routeSlug?.trim() || "",
      createdAt: frontmatter.createdAt?.trim() || "",
    };
  });
}

function buildCountMap(items) {
  const counts = new Map();

  for (const item of items) {
    counts.set(item, (counts.get(item) || 0) + 1);
  }

  return counts;
}

function formatLegacyDate(value) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return "";

  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(value).replace(" ", " ");
}

function buildLegacyTimeMap(items, titleField) {
  const map = new Map();

  for (const item of items) {
    const title = item[titleField];
    if (typeof title !== "string" || !title.trim()) continue;

    const createdAt = formatLegacyDate(item.created);
    const updatedAt = formatLegacyDate(item.modified);
    const value = {
      title,
      createdAt,
      updatedAt,
      rawCreatedAt: item.created instanceof Date ? item.created.toISOString() : "",
      rawUpdatedAt: item.modified instanceof Date ? item.modified.toISOString() : "",
    };

    const current = map.get(title) || [];
    current.push(value);
    map.set(title, current);
  }

  return map;
}

function buildCurrentTimeMap(entries) {
  const map = new Map();

  for (const entry of entries) {
    const current = map.get(entry.title) || [];
    current.push(entry);
    map.set(entry.title, current);
  }

  return map;
}

function collectTimeMismatches(legacyMap, currentMap) {
  const mismatches = [];

  for (const [title, legacyEntries] of legacyMap) {
    const currentEntries = currentMap.get(title) || [];
    const pairCount = Math.min(legacyEntries.length, currentEntries.length);

    for (let index = 0; index < pairCount; index += 1) {
      const legacyEntry = legacyEntries[index];
      const currentEntry = currentEntries[index];
      const currentCreatedAt = currentEntry.createdAt || "(empty)";

      if (!legacyEntry.createdAt || legacyEntry.createdAt === currentCreatedAt) continue;

      mismatches.push({
        title,
        legacyCreatedAt: legacyEntry.createdAt,
        legacyCreatedAtUtc: legacyEntry.rawCreatedAt || "(empty)",
        currentCreatedAt,
        filePath: currentEntry.filePath,
      });
    }
  }

  return mismatches;
}

function diffTitleCounts(legacyTitles, currentTitles) {
  const legacyCounts = buildCountMap(legacyTitles);
  const currentCounts = buildCountMap(currentTitles);
  const missing = [];
  const extra = [];

  for (const [title, legacyCount] of legacyCounts) {
    const currentCount = currentCounts.get(title) || 0;

    if (legacyCount > currentCount) {
      missing.push({ title, count: legacyCount - currentCount });
    }
  }

  for (const [title, currentCount] of currentCounts) {
    const legacyCount = legacyCounts.get(title) || 0;

    if (currentCount > legacyCount) {
      extra.push({ title, count: currentCount - legacyCount });
    }
  }

  return { missing, extra };
}

function summarizeById(items, lookupMap, fieldName) {
  const counts = new Map();

  for (const item of items) {
    const key = item[fieldName] ? String(item[fieldName]) : "__none__";
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  return [...counts.entries()]
    .map(([key, count]) => {
      const target = lookupMap.get(key);
      return {
        id: key,
        count,
        label: target?.name || "(unmapped)",
        slug: target?.slug || "",
      };
    })
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "zh-CN"));
}

function findPlaceholderEntries(entries) {
  return entries.filter(
    (entry) => entry.routeSlug === "1" && entry.createdAt === PLACEHOLDER_CREATED_AT,
  );
}

function printSection(title) {
  console.log(`\n## ${title}`);
}

function printList(items, formatter) {
  if (!items.length) {
    console.log("- none");
    return;
  }

  for (const item of items) {
    console.log(`- ${formatter(item)}`);
  }
}

function main() {
  const [command = "report", target = ""] = process.argv.slice(2);

  if (command === "write" && target === "note") {
    writeLegacyNotes();
    return;
  }

  if (command === "write" && target === "blog") {
    writeLegacyBlog();
    return;
  }

  const posts = readBsonCollection("posts");
  const notes = readBsonCollection("notes");
  const projects = readBsonCollection("projects");
  const links = readBsonCollection("links");
  const categories = readBsonCollection("categories");
  const topics = readBsonCollection("topics");

  const categoryMap = new Map(categories.map((item) => [String(item._id), item]));
  const topicMap = new Map(topics.map((item) => [String(item._id), item]));

  const currentBlogEntries = readCurrentEntries("blog");
  const currentNoteEntries = readCurrentEntries("note");
  const currentProjectEntries = readCurrentEntries("project");

  const blogTitleDiff = diffTitleCounts(
    posts.map((item) => item.title),
    currentBlogEntries.map((item) => item.title),
  );
  const noteTitleDiff = diffTitleCounts(
    notes.map((item) => item.title),
    currentNoteEntries.map((item) => item.title),
  );

  const placeholderBlogEntries = findPlaceholderEntries(currentBlogEntries);
  const placeholderNoteEntries = findPlaceholderEntries(currentNoteEntries);
  const legacyPostTimeMap = buildLegacyTimeMap(posts, "title");
  const legacyNoteTimeMap = buildLegacyTimeMap(notes, "title");
  const currentBlogTimeMap = buildCurrentTimeMap(currentBlogEntries);
  const currentNoteTimeMap = buildCurrentTimeMap(currentNoteEntries);
  const blogTimeMismatches = collectTimeMismatches(legacyPostTimeMap, currentBlogTimeMap);
  const noteTimeMismatches = collectTimeMismatches(legacyNoteTimeMap, currentNoteTimeMap);

  console.log("# Legacy Content Migration Report");
  console.log(`- Legacy posts: ${posts.length}`);
  console.log(`- Legacy notes: ${notes.length}`);
  console.log(`- Legacy projects: ${projects.length}`);
  console.log(`- Legacy links: ${links.length}`);
  console.log(`- Current blog files: ${currentBlogEntries.length}`);
  console.log(`- Current note files: ${currentNoteEntries.length}`);
  console.log(`- Current project files: ${currentProjectEntries.length}`);

  printSection("Legacy Post Categories");
  printList(summarizeById(posts, categoryMap, "categoryId"), (item) => {
    const slug = item.slug ? ` / slug=${item.slug}` : "";
    return `${item.label}: ${item.count}${slug}`;
  });

  printSection("Legacy Note Topics");
  printList(summarizeById(notes, topicMap, "topicId"), (item) => {
    const slug = item.slug ? ` / slug=${item.slug}` : "";
    return `${item.label}: ${item.count}${slug}`;
  });

  printSection("Blog Title Gaps");
  console.log("Missing in current blog content:");
  printList(blogTitleDiff.missing, (item) => `${item.title} x${item.count}`);
  console.log("Extra in current blog content:");
  printList(blogTitleDiff.extra, (item) => `${item.title} x${item.count}`);

  printSection("Note Title Gaps");
  console.log("Missing in current note content:");
  printList(noteTitleDiff.missing, (item) => `${item.title} x${item.count}`);
  console.log("Extra in current note content:");
  printList(noteTitleDiff.extra, (item) => `${item.title} x${item.count}`);

  printSection("Suspicious Current Files");
  console.log(`Current blog files with placeholder frontmatter: ${placeholderBlogEntries.length}`);
  printList(placeholderBlogEntries.slice(0, 10), (item) => item.filePath);
  console.log(`Current note files with placeholder frontmatter: ${placeholderNoteEntries.length}`);
  printList(placeholderNoteEntries.slice(0, 10), (item) => item.filePath);

  printSection("Timestamp Mismatches");
  console.log("Blog examples:");
  printList(blogTimeMismatches.slice(0, 5), (item) => {
    return `${item.title} -> legacy ${item.legacyCreatedAt} (UTC ${item.legacyCreatedAtUtc}) / current ${item.currentCreatedAt} / ${item.filePath}`;
  });
  console.log("Note examples:");
  printList(noteTimeMismatches.slice(0, 10), (item) => {
    return `${item.title} -> legacy ${item.legacyCreatedAt} (UTC ${item.legacyCreatedAtUtc}) / current ${item.currentCreatedAt} / ${item.filePath}`;
  });

  printSection("Immediate Migration Targets");
  if (currentProjectEntries.length === 0) {
    console.log("- `src/content/project/` is empty, but legacy `projects` has 4 entries.");
  }
  if (noteTitleDiff.missing.length > 0) {
    console.log("- Current `note` content is still missing entries compared with the legacy export.");
  }
  if (placeholderNoteEntries.length > 0) {
    console.log("- Some current `note` files still look like placeholder imports and should be regenerated.");
  }
  console.log("- `links` still live in `src/config/links.ts`; legacy data contains 27 entries and should be migrated separately from Markdown content.");
  console.log("- Run `node scripts/legacy-content-migration.mjs write note` to overwrite the current note content with legacy data.");
}

main();
