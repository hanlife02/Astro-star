import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pageModulesSource = await readFile(
  new URL("../src/scripts/home-shell-page-modules.ts", import.meta.url),
  "utf8",
);

test("article videos load their client module only when a player exists", () => {
  assert.match(pageModulesSource, /name: "content-video"/);
  assert.match(
    pageModulesSource,
    /selector: "\.content-video-frame\[data-video-player='true'\]"/,
  );
  assert.match(pageModulesSource, /import\("\.\/home-shell-content-video"\)/);
  assert.match(
    pageModulesSource,
    /initialize: module\.initHomeShellContentVideo/,
  );
  assert.match(
    pageModulesSource,
    /cleanup: module\.cleanupHomeShellContentVideo/,
  );
});
