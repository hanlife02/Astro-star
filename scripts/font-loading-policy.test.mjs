import assert from "node:assert/strict";
import { glob, readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const layoutSource = await readFile(
  new URL("../src/layouts/BaseLayout.astro", import.meta.url),
  "utf8",
);

test("Biotif disables swaps and preloads first-viewport body and heading faces", () => {
  const faceBlocks = [...layoutSource.matchAll(/@font-face\s*\{([^}]+)\}/g)]
    .map((match) => match[1])
    .filter((block) => block.includes('font-family: "Biotif"'));

  assert.equal(faceBlocks.length, 4, "expected all four Biotif faces");
  for (const block of faceBlocks) {
    assert.match(
      block,
      /font-display:\s*block;/,
      `fallback swap remains enabled in:\n${block.trim()}`,
    );
  }

  const preloadHrefs = [
    ...layoutSource.matchAll(/href="(\/fonts\/Biotif-[^"]+\.woff2)"/g),
  ].map((match) => match[1]);

  assert.deepEqual(
    preloadHrefs,
    [
      "/fonts/Biotif-Regular.woff2",
      "/fonts/Biotif-Bold.woff2",
      "/fonts/Biotif-SemiBold.woff2",
    ],
    "preload every Biotif face visible in the first viewport",
  );
  assert.match(
    layoutSource,
    /href="\/fonts\/Biotif-SemiBold\.woff2"[\s\S]*?media="\(max-width: 56\.25rem\)"/,
    "limit the SemiBold preload to viewports where the 600-weight hint is visible",
  );
});

test("Biotif face declarations stay centralized in the early document head", async () => {
  const sourcePaths = await Array.fromAsync(
    glob("src/**/*.{astro,css}", { cwd: projectRoot }),
  );
  const offenders = [];

  for (const sourcePath of sourcePaths) {
    if (sourcePath === "src/layouts/BaseLayout.astro") continue;
    const source = await readFile(
      new URL(`../${sourcePath}`, import.meta.url),
      "utf8",
    );
    if (/@font-face\s*\{[^}]*font-family:\s*"Biotif"/s.test(source)) {
      offenders.push(sourcePath);
    }
  }

  assert.deepEqual(
    offenders,
    [],
    "late Biotif face declarations reintroduce font swaps",
  );
});
