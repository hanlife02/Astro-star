import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const homePageSource = await readFile(
  new URL("../src/components/home/HomePageContent.astro", import.meta.url),
  "utf8",
);
const homeShellSource = await readFile(
  new URL("../src/components/layout/HomeShellFrame.astro", import.meta.url),
  "utf8",
);
const homeLayoutSource = await readFile(
  new URL("../src/layouts/HomeLayout.astro", import.meta.url),
  "utf8",
);
const contentShellSource = await readFile(
  new URL("../src/components/layout/ContentShell.astro", import.meta.url),
  "utf8",
);
const entranceScriptExists = await readFile(
  new URL("../src/scripts/home-shell-home-entrance.ts", import.meta.url),
  "utf8",
).then(
  () => true,
  () => false,
);
const avatarScriptSource = await readFile(
  new URL("../src/scripts/home-shell-profile-avatar.ts", import.meta.url),
  "utf8",
).catch(() => "");
const pageModulesSource = await readFile(
  new URL("../src/scripts/home-shell-page-modules.ts", import.meta.url),
  "utf8",
);
const entranceStylesSource = await readFile(
  new URL("../src/style/pages/home-page-entrance.css", import.meta.url),
  "utf8",
);
const profileStylesSource = await readFile(
  new URL("../src/style/components/home/profile.css", import.meta.url),
  "utf8",
);
const heatmapSource = await readFile(
  new URL("../src/components/home/githeatmap.astro", import.meta.url),
  "utf8",
);
const heatmapStylesSource = await readFile(
  new URL("../src/style/components/home/githeatmap.css", import.meta.url),
  "utf8",
);
const siteConfigSource = await readFile(
  new URL("../src/config/site.ts", import.meta.url),
  "utf8",
);

function getConfiguredSignatureSvg(source) {
  const match = source.match(/signatureSvg:\s*'([^']+)'/);
  assert.ok(match?.[1], "site.profile.signatureSvg must be a quoted SVG");
  return match[1];
}

test("the homepage preloads its avatar and has a local fallback", () => {
  assert.match(homePageSource, /data-home-avatar-preload/);
  assert.match(homePageSource, /href=\{profile\.avatarSrc\}/);
  assert.match(homePageSource, /data-profile-avatar-fallback/);
  assert.match(homePageSource, /data-home-profile-avatar/);
  assert.match(avatarScriptSource, /dataset\.profileAvatarState = "loaded"/);
  assert.match(avatarScriptSource, /dataset\.profileAvatarState = "fallback"/);
  assert.doesNotMatch(
    avatarScriptSource,
    /homeMainState|HOME_MAIN_READY_EVENT/,
  );
});

test("the homepage entrance is CSS-only", () => {
  assert.doesNotMatch(homeShellSource, /data-home-main-state=/);
  assert.match(homeShellSource, /data-home-shell-main/);
  assert.equal(entranceScriptExists, false);
  assert.doesNotMatch(pageModulesSource, /name: "home-entrance"/);
  assert.match(pageModulesSource, /name: "profile-avatar"/);
});

test("CSS restarts the profile and latest entrance for every document", () => {
  assert.match(homeShellSource, /data-home-entrance-content="profile"/);
  assert.match(homeShellSource, /data-home-entrance-content="latest"/);
  assert.doesNotMatch(homeShellSource, /<aside[^>]*data-home-entrance-content/);
  assert.doesNotMatch(entranceStylesSource, /data-home-main-state/);
  assert.doesNotMatch(entranceStylesSource, /html\[data-js=/);
  assert.match(entranceStylesSource, /animation:\s*300ms home-content-in/);
  assert.match(entranceStylesSource, /animation-fill-mode:\s*forwards/);
  assert.match(
    entranceStylesSource,
    /data-home-entrance-content="profile"[\s\S]*?animation-delay:\s*50ms/,
  );
  assert.match(
    entranceStylesSource,
    /data-home-entrance-content="latest"[\s\S]*?animation-delay:\s*100ms/,
  );
  assert.match(entranceStylesSource, /translateY\(2rem\)/);
  assert.match(
    entranceStylesSource,
    /@media \(prefers-reduced-motion: reduce\)/,
  );
});

test("the avatar has no decorative border", () => {
  const avatarRule = profileStylesSource.match(
    /\.profile-avatar \{([\s\S]*?)\}/,
  )?.[1];
  const fallbackRule = profileStylesSource.match(
    /\.profile-avatar-fallback \{([\s\S]*?)\}/,
  )?.[1];

  assert.ok(avatarRule);
  assert.ok(fallbackRule);
  assert.doesNotMatch(avatarRule, /\bborder(?:-color)?:/);
  assert.doesNotMatch(fallbackRule, /\bborder(?:-color)?:/);
  assert.doesNotMatch(
    profileStylesSource,
    /profile-avatar[^\{]*\{[^\}]*border-color:/,
  );
});

test("content page styles are owned by the content shell", () => {
  assert.doesNotMatch(
    homeLayoutSource,
    /import "\.\.\/style\/pages\/content-page\.css";/,
  );
  assert.match(
    contentShellSource,
    /import "\.\.\/\.\.\/style\/pages\/content-page\.css";/,
  );
});

test("the homepage heatmap compacts layout metadata by week", () => {
  assert.match(heatmapSource, /const heatmapWeeks =/);
  assert.match(heatmapSource, /class="githeatmap-week"/);
  assert.match(heatmapSource, /--githeatmap-hover-delay:/);
  assert.doesNotMatch(heatmapSource, /grid-column:\s*\$\{day\.weekIndex/);
  assert.doesNotMatch(heatmapSource, /grid-row:\s*\$\{\s*day\.dayIndex/);
  assert.doesNotMatch(heatmapSource, /aria-label=\{day\.label/);
  assert.match(heatmapSource, /title=\{day\.label \|\| undefined\}/);
  assert.match(heatmapSource, /data-level=\{day\.level\}/);
  assert.match(heatmapSource, /data-blank=\{day\.isBlank/);
  assert.match(
    heatmapStylesSource,
    /\.githeatmap-grid\s*\{[\s\S]*?grid-auto-flow:\s*column;/,
  );
  assert.match(
    heatmapStylesSource,
    /\.githeatmap-week\s*\{[\s\S]*?display:\s*contents;/,
  );
});

test("the inline signature source stays below 16 KiB", () => {
  const signatureSvg = getConfiguredSignatureSvg(siteConfigSource);

  assert.ok(
    Buffer.byteLength(signatureSvg, "utf8") < 16 * 1024,
    `Expected signatureSvg below 16 KiB, received ${Buffer.byteLength(
      signatureSvg,
      "utf8",
    )} bytes`,
  );
});
