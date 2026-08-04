import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const layoutSource = await readFile(
  new URL("../src/layouts/BaseLayout.astro", import.meta.url),
  "utf8",
);
const faviconRouteSource = await readFile(
  new URL("../src/pages/favicon.ico.ts", import.meta.url),
  "utf8",
);
const syncWorkflowSource = await readFile(
  new URL("../.github/workflows/sync-main-to-ethan.yml", import.meta.url),
  "utf8",
);
const configExtractSource = await readFile(
  new URL("./config-extract.mjs", import.meta.url),
  "utf8",
);

test("favicon markup and legacy redirect follow site.iconSrc", () => {
  assert.match(layoutSource, /const faviconType =/);
  assert.match(layoutSource, /const faviconSizes =/);
  assert.match(
    layoutSource,
    /<link[\s\S]*?rel="icon"[\s\S]*?type=\{faviconType\}[\s\S]*?sizes=\{faviconSizes\}/,
  );
  assert.match(layoutSource, /: undefined;/);
  assert.match(faviconRouteSource, /import \{ site \}/);
  assert.match(faviconRouteSource, /site\.site\.iconSrc/);
  assert.doesNotMatch(faviconRouteSource, /return redirect\("\/site-icon\.svg/);
});

test("personal WebP avatars survive main-to-Ethan sync and config export", () => {
  assert.match(syncWorkflowSource, /^\s+public\/avatar\.webp$/m);
  assert.match(syncWorkflowSource, /^\s+public\/friend-avatars$/m);
  assert.match(configExtractSource, /"public\/avatar\.webp"/);
  assert.match(configExtractSource, /"public\/friend-avatars"/);
});
