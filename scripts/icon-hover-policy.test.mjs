import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("shared icon hover styles provide round backgrounds and accessible, positioned labels", async () => {
  const css = await source("src/style/components/ui/icon-hover.css");
  const layout = await source("src/layouts/BaseLayout.astro");
  assert.match(layout, /import "\.\.\/style\/components\/ui\/icon-hover\.css"/);
  assert.match(css, /border-radius: 999px/);
  assert.match(css, /content: attr\(aria-label\)/);
  assert.match(css, /content: attr\(data-icon-tooltip\)/);
  assert.match(css, /:focus-visible::after/);
  assert.match(css, /data-tooltip-placement="bottom"/);
  assert.match(css, /data-tooltip-placement="left"/);
  assert.match(css, /prefers-reduced-motion: reduce/);
});

test("shell icons use shared labels instead of duplicate native tooltips", async () => {
  const frame = await source("src/components/layout/HomeShellFrame.astro");
  for (const label of [
    "Theme switcher",
    "Search",
    "Navigation",
    "Projects",
    "RSS Feed",
    "GitHub",
  ]) {
    assert.ok(frame.includes(`data-icon-tooltip="${label}"`));
    assert.ok(!frame.includes(`title="${label}"`));
  }
  const floating = await source("src/components/ui/FloatingActionButton.astro");
  assert.match(floating, /data-icon-tooltip=""/);
  assert.match(floating, /data-tooltip-placement="left"/);
});

test("footer icons stay centered inside their circular hover targets", async () => {
  const styles = await source("src/style/layouts/home-layout.css");
  const button = styles.match(/\.footer-rss-btn\s*\{([^}]+)\}/)?.[1];
  assert.ok(button);
  assert.match(button, /align-items: center;/);
  assert.match(button, /justify-content: center;/);
  assert.match(button, /width: var\(--icon-btn-size\);/);
  assert.match(button, /height: var\(--icon-btn-size\);/);
});

test("article icon labels track live state with a concise license tooltip and rich reward popover", async () => {
  for (const path of [
    "src/scripts/home-shell-code-copy.ts",
    "src/scripts/home-shell-article-actions.ts",
  ]) {
    const script = await source(path);
    assert.match(script, /setAttribute\("aria-label"/);
    assert.doesNotMatch(script, /button\.title\s*=/);
  }
  const actions = await source(
    "src/components/content/ArticleActionCard.astro",
  );
  assert.match(actions, /data-icon-tooltip=""/);
  assert.equal((actions.match(/data-icon-hover/g) ?? []).length, 1);
  assert.match(actions, /aria-label=\{licenseLabel\}/);
  assert.match(
    actions,
    /const licenseLabel = license\.name\.split\(" - "\)\[0\]\.trim\(\)/,
  );
  assert.match(actions, /href=\{license.href\}/);
  assert.doesNotMatch(
    actions,
    /article-action-license-popover|license\.statement/,
  );
  assert.match(actions, /id="article-action-reward-popover"/);
});
