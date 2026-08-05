import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const contentProseStyles = await readFile(
  new URL("../src/style/components/content/content-prose.css", import.meta.url),
  "utf8",
);

test("long code lines keep the container width and scroll horizontally", () => {
  const preRule = contentProseStyles.match(
    /\.content-page-body pre \{([\s\S]*?)\}/,
  )?.[1];
  const codeRule = contentProseStyles.match(
    /\.content-page-body pre code \{([\s\S]*?)\}/,
  )?.[1];

  assert.ok(preRule, "article pre rule is missing");
  assert.ok(codeRule, "article pre code rule is missing");
  assert.match(preRule, /overflow-x:\s*auto/);
  assert.match(codeRule, /min-width:\s*100%/);
  assert.doesNotMatch(codeRule, /min-width:\s*max-content/);
});
