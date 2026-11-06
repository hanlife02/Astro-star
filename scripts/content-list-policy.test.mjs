import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const styles = await readFile(
  new URL("../src/style/components/content/content-prose.css", import.meta.url),
  "utf8",
);

test("prose unordered lists use decorative four-point stars aligned to the first line", () => {
  const marker = styles.match(
    /\.content-page-body ul > li::before\s*\{([^}]+)\}/,
  )?.[1];
  assert.ok(marker);
  assert.match(
    styles,
    /\.content-page-body ul > li\s*\{[^}]*padding-inline-start: 1\.3em;/,
  );
  assert.match(marker, /content: "";/);
  assert.match(marker, /clip-path: polygon\(/);
  assert.match(marker, /top: calc\(0\.5lh - 0\.275em\);/);
  assert.match(marker, /width: 0\.55em;/);
  assert.match(marker, /height: 0\.55em;/);
  assert.match(marker, /background: var\(--content-strong-color\);/);
  assert.doesNotMatch(marker, /border-radius/);
  assert.doesNotMatch(styles, /\.content-page-body ol > li::(?:before|marker)/);
  assert.match(
    styles,
    /\.content-page-body li > ul\s*\{\s*padding-left: 1\.4rem;/,
  );
});
