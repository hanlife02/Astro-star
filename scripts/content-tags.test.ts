import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSectionTags,
  getContentTagHref,
  normalizeContentTags,
  slugifyContentTag,
} from "../src/utils/content-tags.ts";

test("missing, empty, and whitespace-only tags normalize to no tags", () => {
  assert.deepEqual(normalizeContentTags(), []);
  assert.deepEqual(normalizeContentTags([]), []);
  assert.deepEqual(normalizeContentTags("Astro" as unknown as string[]), []);
  assert.deepEqual(normalizeContentTags(["", "  ", "\t"]), []);
});

test("normalization trims tags and deduplicates case-insensitively", () => {
  assert.deepEqual(
    normalizeContentTags([" Astro ", "astro", "ASTRO", " 标签 ", "标签"]),
    [
      { label: "Astro", slug: "astro" },
      { label: "标签", slug: "标签" },
    ],
  );
});

test("tag slugs support English, CJK, spaces, and unsafe symbols", () => {
  assert.equal(slugifyContentTag("Astro Star"), "astro-star");
  assert.equal(slugifyContentTag("折腾"), "折腾");
  assert.equal(slugifyContentTag("C++ & Web!"), "c-web");
});

test("section tags count articles, sort by count then name, and link by section", () => {
  assert.deepEqual(
    buildSectionTags("blog", [
      { id: "first", tags: ["Astro", "中文"] },
      { id: "second", tags: ["astro", "中文", "Build"] },
      { id: "third", tags: ["Astro"] },
    ]),
    [
      { count: 3, href: "/blog/tag/astro/", label: "Astro", slug: "astro" },
      { count: 2, href: "/blog/tag/中文/", label: "中文", slug: "中文" },
      { count: 1, href: "/blog/tag/build/", label: "Build", slug: "build" },
    ],
  );
  assert.equal(
    getContentTagHref("project", "open-source"),
    "/project/tag/open-source/",
  );
});

test("different labels with the same slug fail with labels and source entries", () => {
  assert.throws(
    () =>
      buildSectionTags("note", [
        { id: "languages/c-plus-plus", tags: ["C++"] },
        { id: "languages/c-sharp", tags: ["C#"] },
      ]),
    (error: unknown) => {
      assert.match(String(error), /note/);
      assert.match(String(error), /C\+\+/);
      assert.match(String(error), /C#/);
      assert.match(String(error), /languages\/c-plus-plus/);
      assert.match(String(error), /languages\/c-sharp/);
      return true;
    },
  );
});

test("a tag that cannot produce a route slug fails with its source entry", () => {
  assert.throws(
    () => buildSectionTags("project", [{ id: "sparkle", tags: ["✨"] }]),
    /project.*✨.*sparkle/s,
  );
});
