import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const indexSource = await readFile(
  new URL("../src/pages/index.astro", import.meta.url),
  "utf8",
);
const heatmapSource = await readFile(
  new URL("../src/components/home/githeatmap.astro", import.meta.url),
  "utf8",
);
const homePageContentSource = await readFile(
  new URL("../src/components/home/HomePageContent.astro", import.meta.url),
  "utf8",
);

test("the GitHub heatmap remains on the prerendered homepage build path", () => {
  assert.match(indexSource, /export const prerender = true;/);
  assert.match(
    homePageContentSource,
    /import GitHeatmap from "\.\/githeatmap\.astro";/,
  );
  assert.match(homePageContentSource, /<GitHeatmap \/>/);
  assert.match(heatmapSource, /await getGitHubContributionHeatmap\(username\)/);
  assert.doesNotMatch(heatmapSource, /client:(?:load|idle|visible|only)/);
});
