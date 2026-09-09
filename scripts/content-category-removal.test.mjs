import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { join } from "node:path";

const PROJECT_ROOT = process.cwd();

test("category archive routes and listing component are removed", () => {
  for (const relativePath of [
    "src/pages/[section]-archive.astro",
    "src/pages/[section]-archive/[archiveSlug].astro",
    "src/components/content/SectionListingPage.astro",
  ]) {
    assert.equal(
      existsSync(join(PROJECT_ROOT, relativePath)),
      false,
      `${relativePath} should be absent so the old category URL returns 404`,
    );
  }
});

test("section indexes expose tags without category actions", () => {
  const source = readFileSync(
    join(PROJECT_ROOT, "src/pages/[section].astro"),
    "utf8",
  );

  assert.doesNotMatch(
    source,
    /viewCategoriesLabel|section}-archive|Categories/,
  );
  assert.match(source, /buildSectionTags/);
});

test("frontmatter keeps display metadata while sitemap omits category archives", () => {
  const schemaSource = readFileSync(
    join(PROJECT_ROOT, "src/content.config.ts"),
    "utf8",
  );
  const sitemapSource = readFileSync(
    join(PROJECT_ROOT, "src/utils/sitemap-lastmod.ts"),
    "utf8",
  );

  assert.match(schemaSource, /type:\s*z\.string/);
  assert.match(schemaSource, /tags:\s*z\.array/);
  assert.doesNotMatch(sitemapSource, /archiveSlug|blog-archive|note-archive/);
});
