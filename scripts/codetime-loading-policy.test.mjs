import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const homePageSource = await readFile(
  new URL("../src/components/home/HomePageContent.astro", import.meta.url),
  "utf8",
);
const codeTimeComponentSource = await readFile(
  new URL("../src/components/home/CodeTime.astro", import.meta.url),
  "utf8",
);
const codeTimeScriptSource = await readFile(
  new URL("../src/scripts/home-shell-codetime.ts", import.meta.url),
  "utf8",
);

function getImageTag(source, marker) {
  const markerIndex = source.indexOf(marker);
  assert.notEqual(markerIndex, -1, `missing ${marker}`);
  const tagStart = source.lastIndexOf("<img", markerIndex);
  const tagEnd = source.indexOf("/>", markerIndex);
  assert.notEqual(tagStart, -1, `missing img for ${marker}`);
  assert.notEqual(tagEnd, -1, `unterminated img for ${marker}`);
  return source.slice(tagStart, tagEnd + 2);
}

test("the CodeTime badge has no request URL before the main reveal", () => {
  const badgeTag = getImageTag(codeTimeComponentSource, "data-codetime-badge");

  assert.doesNotMatch(badgeTag, /\ssrc=/);
  assert.match(
    badgeTag,
    /data-codetime-badge-src="\/api\/codetime-badge\.svg"/,
  );
  assert.match(homePageSource, /data-codetime-state="waiting"/);
});

test("the hidden status image has no request URL before interaction", () => {
  const statusTag = getImageTag(homePageSource, "profile-codetime-status");

  assert.doesNotMatch(statusTag, /\ssrc=/);
  assert.doesNotMatch(statusTag, /loading="lazy"/);
  assert.match(
    statusTag,
    /data-codetime-status-src="\/api\/codetime-status\.svg"/,
  );
  assert.match(homePageSource, /data-codetime-status-popover[\s\S]*?hidden/);
});

test("the status request is reused after its first interaction", () => {
  assert.match(codeTimeScriptSource, /dataset\.codetimeStatusSrc/);
  assert.match(codeTimeScriptSource, /"pointerenter"/);
  assert.doesNotMatch(codeTimeScriptSource, /Date\.now\(\)/);
  assert.doesNotMatch(codeTimeScriptSource, /refreshCodeTimeStatusImage/);
});

test("the badge only occupies layout after it loads successfully", () => {
  assert.match(codeTimeScriptSource, /HOME_MAIN_READY_EVENT/);
  assert.match(codeTimeScriptSource, /dataset\.codetimeBadgeSrc/);
  assert.match(codeTimeScriptSource, /dataset\.codetimeState = "ready"/);
  assert.match(codeTimeScriptSource, /naturalWidth <= 0/);

  const heatmapIndex = homePageSource.indexOf("<GitHeatmap />");
  const codeTimeIndex = homePageSource.indexOf("<CodeTime />");
  assert.ok(heatmapIndex >= 0 && codeTimeIndex > heatmapIndex);
});

test("a failed status request removes its inactive controls", () => {
  assert.match(
    codeTimeScriptSource,
    /const disableStatus = \(\) => \{[\s\S]*?statusController\.abort\(\);[\s\S]*?themeObserver\?\.disconnect\(\);[\s\S]*?\};/,
  );
  assert.match(
    codeTimeScriptSource,
    /requestCodeTimeStatusImage\([\s\S]*?disableStatus,[\s\S]*?statusController\.signal/,
  );
});
