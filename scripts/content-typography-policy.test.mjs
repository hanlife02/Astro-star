import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const tokens = await readFile(
  new URL("../src/style/base/tokens.css", import.meta.url),
  "utf8",
);
const prose = await readFile(
  new URL("../src/style/components/content/content-prose.css", import.meta.url),
  "utf8",
);

test("article typography uses a compact scale for both Chinese and English body text", () => {
  assert.match(tokens, /--type-content-body: 1\.0625rem;/);
  assert.match(tokens, /--type-content-body-zh: 1\.0625rem;/);
  assert.match(prose, /h1:not\(\.article-content-title\)\s*\{/);
  const sizes = [1.75, 1.5, 1.3125, 1.1875, 1.0625, 1];
  sizes.forEach((size, index) => {
    assert.ok(tokens.includes(`--type-content-h${index + 1}: ${size}rem;`));
  });
});

test("article heading contrast steps down by level using theme-aware colors", () => {
  const strengths = [96, 88, 80, 74, 68];
  strengths.forEach((strength, index) => {
    const rule = prose.match(
      new RegExp(
        `\\.content-page--article \\.content-page-body h${index + 2}\\s*\\{([^}]+)\\}`,
      ),
    )?.[1];
    assert.ok(rule);
    assert.ok(
      rule.includes(
        `color: color-mix(in srgb, var(--line) ${strength}%, transparent);`,
      ),
    );
  });
});
