import assert from "node:assert/strict";
import { access, glob, readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const layoutSource = await readFile(
  new URL("../src/layouts/BaseLayout.astro", import.meta.url),
  "utf8",
);
const fontNames = ["Regular", "Medium", "SemiBold", "Bold"];

test("Biotif remains visible while custom faces load", () => {
  const normalizedLayoutSource = layoutSource.replace(
    /\$\{[^}]+\}/g,
    "ASSET_URL",
  );
  const faceBlocks = [
    ...normalizedLayoutSource.matchAll(/@font-face\s*\{([^}]+)\}/g),
  ]
    .map((match) => match[1])
    .filter((block) => block.includes('font-family: "Biotif"'));

  assert.equal(faceBlocks.length, 4, "expected all four Biotif faces");
  for (const block of faceBlocks) {
    assert.match(
      block,
      /font-display:\s*swap;/,
      `Biotif can still hide fallback text:\n${block.trim()}`,
    );
  }
});

test("only the regular first-viewport face is preloaded", () => {
  const preloadTags = [
    ...layoutSource.matchAll(/<link\s+[\s\S]*?rel="preload"[\s\S]*?\/>/g),
  ]
    .map((match) => match[0])
    .filter((tag) => tag.includes("Biotif") || tag.includes("biotif"));

  assert.deepEqual(
    preloadTags.map((tag) => tag.match(/href=\{([^}]+)\}/)?.[1]),
    ["biotifRegularUrl"],
  );
  assert.match(preloadTags[0] ?? "", /fetchpriority="high"/);
});

test("Vite fingerprints every Biotif file instead of serving public URLs", async () => {
  for (const fontName of fontNames) {
    assert.match(
      layoutSource,
      new RegExp(
        `import\\s+biotif${fontName}Url\\s+from\\s+"\\.\\.\\/assets\\/fonts\\/Biotif-${fontName}\\.woff2\\?url"`,
      ),
    );
    await access(
      new URL(`../src/assets/fonts/Biotif-${fontName}.woff2`, import.meta.url),
    );
  }

  const publicFonts = await Array.fromAsync(
    glob("public/fonts/Biotif-*.woff2", { cwd: projectRoot }),
  );
  assert.deepEqual(publicFonts, []);
});
