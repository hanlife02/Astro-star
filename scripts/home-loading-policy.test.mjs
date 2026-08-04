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
const entranceScriptSource = await readFile(
  new URL("../src/scripts/home-shell-home-entrance.ts", import.meta.url),
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

test("the homepage preloads its avatar and has a local fallback", () => {
  assert.match(homePageSource, /data-home-avatar-preload/);
  assert.match(homePageSource, /href=\{profile\.avatarSrc\}/);
  assert.match(homePageSource, /data-profile-avatar-fallback/);
  assert.match(homePageSource, /data-home-profile-avatar/);
});

test("the homepage reveals as one unit with a bounded wait", () => {
  assert.match(homeShellSource, /data-home-main-state=/);
  assert.match(homeShellSource, /data-home-shell-main/);
  assert.match(entranceScriptSource, /HOME_MAIN_WAIT_MS = 350/);
  assert.match(entranceScriptSource, /dataset\.homeMainState = "ready"/);
  assert.match(
    entranceScriptSource,
    /new CustomEvent\(HOME_MAIN_READY_EVENT\)/,
  );
  assert.match(pageModulesSource, /name: "home-entrance"/);
});

test("CSS provides the entrance and a no-script-failure escape hatch", () => {
  assert.equal(homeShellSource.match(/data-home-entrance-content/g)?.length, 2);
  assert.doesNotMatch(homeShellSource, /<aside[^>]*data-home-entrance-content/);
  assert.match(
    entranceStylesSource,
    /data-home-main-state="waiting"[\s\S]*?data-home-entrance-content[\s\S]*?350ms/,
  );
  assert.match(
    entranceStylesSource,
    /data-home-main-state="ready"[\s\S]*?data-home-entrance-content/,
  );
  assert.doesNotMatch(
    entranceStylesSource,
    /data-home-main-state="(?:waiting|ready)"[^\{]*\.home-main/,
  );
  assert.match(entranceStylesSource, /translate3d\(0, 14px, 0\)/);
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
