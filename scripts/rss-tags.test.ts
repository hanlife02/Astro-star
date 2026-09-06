import assert from "node:assert/strict";
import test from "node:test";
import { buildRssItems } from "../src/utils/rss-items.ts";

test("RSS items expose normalized article tags as categories", () => {
  const [item] = buildRssItems(
    [
      {
        id: "entry",
        data: { createdAt: "2026-01-01", tags: [" Astro ", "astro", "blog"] },
        body: "An article",
      },
    ],
    "blog",
  );

  assert.deepEqual(item.categories, ["Astro", "blog"]);
});

test("RSS items without tags do not emit an empty category list", () => {
  const [item] = buildRssItems(
    [{ id: "entry", data: { createdAt: "2026-01-01" }, body: "An article" }],
    "note",
  );

  assert.equal(item.categories, undefined);
});
