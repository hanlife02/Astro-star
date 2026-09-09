import assert from "node:assert/strict";
import test from "node:test";
import { buildRecords, parseFrontmatter } from "./sync-algolia-index.ts";

test("Algolia frontmatter parsing reads YAML tag arrays and empty arrays", () => {
  const parsed = parseFrontmatter(`---
tags:
  - blog
  - "Astro"
title: Example
---
Body`);

  assert.deepEqual(parsed.frontmatter.tags, ["blog", "Astro"]);
  assert.deepEqual(
    parseFrontmatter("---\ntags: []\n---\nBody").frontmatter.tags,
    [],
  );
  assert.deepEqual(
    parseFrontmatter('---\ntags: [Astro, "Blog"]\n---\nBody').frontmatter.tags,
    ["Astro", "Blog"],
  );
});

test("Algolia records include normalized tags and searchable tag text", () => {
  const records = buildRecords();
  const taggedRecords = records.filter((record) =>
    record.objectID.startsWith("blog/welcome-to-astro-star"),
  );
  const mdxRecord = records.find(
    (record) => record.objectID === "blog/mdx-rendering-formats",
  );

  assert.ok(taggedRecords.length > 0);
  taggedRecords.forEach((record) =>
    assert.deepEqual(record.tags, ["blog", "Astro"]),
  );
  assert.match(taggedRecords.map((record) => record.content).join(" "), /blog/);
  assert.match(
    taggedRecords.map((record) => record.content).join(" "),
    /Astro/,
  );
  assert.deepEqual(mdxRecord?.tags, ["blog", "MDX", "Template"]);
});
