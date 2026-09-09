import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { join } from "node:path";
import { parse } from "parse5";

const BUILD_ROOT = join(process.cwd(), "dist", "client");

function getAttribute(node, name) {
  return node.attrs?.find((attribute) => attribute.name === name)?.value;
}

function hasClass(node, className) {
  return getAttribute(node, "class")?.split(/\s+/).includes(className) ?? false;
}

function findAll(node, predicate, matches = []) {
  if (predicate(node)) matches.push(node);
  for (const child of node.childNodes ?? []) findAll(child, predicate, matches);
  return matches;
}

function findOne(node, predicate) {
  return findAll(node, predicate)[0];
}

function getText(node) {
  if (node.nodeName === "#text") return node.value ?? "";
  return (node.childNodes ?? []).map(getText).join("");
}

function readPage(routePath) {
  const filePath = join(BUILD_ROOT, routePath, "index.html");
  assert.equal(existsSync(filePath), true, `missing built page: ${routePath}`);
  return parse(readFileSync(filePath, "utf8"));
}

function getTaxonomyHeadings(document) {
  const sidebar = findOne(
    document,
    (node) => getAttribute(node, "data-taxonomy-sidebar") !== undefined,
  );
  assert.ok(sidebar, "taxonomy sidebar is missing");
  return findAll(sidebar, (node) => hasClass(node, "content-toc-title")).map(
    (node) => getText(node).trim(),
  );
}

test("section indexes render Time then Tags for blog, note, and project", () => {
  const cases = [
    ["blog", "/blog/tag/blog/"],
    ["note", "/note/tag/note/"],
    ["project", "/project/tag/project/"],
  ];

  for (const [section, expectedTagHref] of cases) {
    const document = readPage(section);
    assert.deepEqual(getTaxonomyHeadings(document), ["Time", "Tags"]);
    assert.ok(
      findOne(
        document,
        (node) =>
          node.tagName === "a" && getAttribute(node, "href") === "#2026",
      ),
      `${section} is missing its year navigation`,
    );
    assert.ok(
      findOne(
        document,
        (node) =>
          node.tagName === "a" &&
          getAttribute(node, "href") === expectedTagHref,
      ),
      `${section} is missing its tag navigation`,
    );
  }
});

test("tag archives render filtered years, all section tags, and an active tag", () => {
  const cases = [
    ["blog/tag/astro", "# Astro", "/blog/tag/astro/"],
    ["note/tag/thoughts", "# Thoughts", "/note/tag/thoughts/"],
    ["project/tag/astro", "# Astro", "/project/tag/astro/"],
  ];

  for (const [routePath, heading, activeHref] of cases) {
    const document = readPage(routePath);
    assert.equal(
      getText(findOne(document, (node) => node.tagName === "h1")).trim(),
      heading,
    );
    assert.deepEqual(getTaxonomyHeadings(document), ["Time", "Tags"]);
    assert.ok(
      findOne(
        document,
        (node) =>
          node.tagName === "a" &&
          getAttribute(node, "href") === activeHref &&
          getAttribute(node, "aria-current") === "page",
      ),
      `${routePath} is missing its active tag`,
    );
  }
});

test("tagged articles render inline metadata and tag-backed metadata", () => {
  const document = readPage("blog/welcome-to-astro-star");
  assert.equal(
    findOne(document, (node) => hasClass(node, "content-tags--article")),
    undefined,
  );

  const metadataLines = findAll(document, (node) =>
    hasClass(node, "article-content-meta-line"),
  );
  const tagsLine = metadataLines.at(-1);
  assert.equal(
    getText(
      findOne(tagsLine, (node) => hasClass(node, "article-content-meta-label")),
    ).trim(),
    "Tags",
  );
  assert.equal(
    findAll(tagsLine, (node) => node.tagName === "strong").length,
    2,
  );
  assert.equal(findAll(tagsLine, (node) => node.tagName === "em").length, 2);
  assert.deepEqual(
    findAll(tagsLine, (node) => node.tagName === "a").map((node) =>
      getAttribute(node, "href"),
    ),
    ["/blog/tag/blog/", "/blog/tag/astro/"],
  );

  const keywords = findOne(
    document,
    (node) =>
      node.tagName === "meta" && getAttribute(node, "name") === "keywords",
  );
  assert.deepEqual(getAttribute(keywords, "content")?.split(", "), [
    "blog",
    "Astro",
  ]);

  const articleTagValues = findAll(
    document,
    (node) =>
      node.tagName === "meta" &&
      getAttribute(node, "property") === "article:tag",
  ).map((node) => getAttribute(node, "content"));
  assert.deepEqual(articleTagValues, ["blog", "Astro"]);

  const jsonLd = findAll(
    document,
    (node) =>
      node.tagName === "script" &&
      getAttribute(node, "type") === "application/ld+json",
  )
    .map((node) => JSON.parse(getText(node)))
    .find((value) => value["@type"] === "BlogPosting");
  assert.ok(jsonLd);
  assert.ok(jsonLd.keywords.includes("blog"));
  assert.ok(jsonLd.keywords.includes("Astro"));
  assert.ok(jsonLd.keywords.includes("Blog"));
  assert.ok(jsonLd.keywords.includes("Template"));
});

test("all published blog examples render their tag metadata", () => {
  const document = readPage("blog/mdx-rendering-formats");
  assert.equal(
    findOne(document, (node) => hasClass(node, "content-tags--article")),
    undefined,
  );

  const keywords = findOne(
    document,
    (node) =>
      node.tagName === "meta" && getAttribute(node, "name") === "keywords",
  );
  assert.deepEqual(getAttribute(keywords, "content")?.split(", "), [
    "blog",
    "MDX",
    "Template",
  ]);
});

test("tag archives are included in the generated sitemap", () => {
  const sitemap = readFileSync(join(BUILD_ROOT, "sitemap-0.xml"), "utf8");

  for (const route of [
    "/blog/tag/astro/",
    "/note/tag/thoughts/",
    "/project/tag/astro/",
  ]) {
    assert.match(
      sitemap,
      new RegExp(`<loc>https://example\\.com${route}</loc>`),
    );
  }
});
