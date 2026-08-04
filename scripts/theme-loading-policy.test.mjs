import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const layoutSource = await readFile(
  new URL("../src/layouts/BaseLayout.astro", import.meta.url),
  "utf8",
);

test("theme bootstrap runs before first-paint color signals", () => {
  const bootstrapIndex = layoutSource.indexOf(
    'var storageKey = "theme-preference"',
  );
  const themeColorIndex = layoutSource.indexOf(
    '<meta name="theme-color" content="#ffffff" />',
  );
  const colorSchemeIndex = layoutSource.indexOf(
    '<meta name="color-scheme" content="light dark" />',
  );
  const biotifPreloadIndex = layoutSource.indexOf(
    "<!-- The body face is enough to start loading Biotif without blocking text. -->",
  );

  assert.notEqual(bootstrapIndex, -1, "expected theme bootstrap marker");
  assert.notEqual(themeColorIndex, -1, "expected theme-color meta marker");
  assert.notEqual(colorSchemeIndex, -1, "expected color-scheme meta marker");
  assert.notEqual(biotifPreloadIndex, -1, "expected Biotif preload marker");

  assert.ok(
    themeColorIndex < bootstrapIndex,
    "theme-color must precede the bootstrap so it can be updated",
  );
  assert.ok(
    bootstrapIndex < colorSchemeIndex,
    "theme bootstrap must precede the color-scheme signal",
  );
  assert.ok(
    bootstrapIndex < biotifPreloadIndex,
    "theme bootstrap must precede the Biotif preload marker",
  );
});
