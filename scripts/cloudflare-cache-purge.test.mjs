import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const purgeModule = await import("./cloudflare-cache-purge.mjs").catch(
  () => ({}),
);

test("the Cloudflare purge helper exposes testable URL collection", () => {
  assert.equal(typeof purgeModule.collectPurgeUrls, "function");
  assert.equal(typeof purgeModule.chunkUrls, "function");
});

test("only page-like build outputs become purge URLs", async () => {
  const clientDir = await mkdtemp(join(tmpdir(), "astro-star-purge-"));

  try {
    await mkdir(join(clientDir, "about"));
    await mkdir(join(clientDir, "_astro"));
    await writeFile(
      join(clientDir, "index.html"),
      '<link rel="canonical" href="https://example.com/">',
    );
    await writeFile(join(clientDir, "about", "index.html"), "about");
    await writeFile(join(clientDir, "sitemap-0.xml"), "sitemap");
    await writeFile(join(clientDir, "avatar.webp"), "avatar");
    await writeFile(join(clientDir, "_astro", "app.hash.js"), "app");

    assert.deepEqual(await purgeModule.collectPurgeUrls(clientDir), [
      "https://example.com/",
      "https://example.com/about/",
      "https://example.com/favicon.ico",
      "https://example.com/robots.txt",
      "https://example.com/rss.xml",
      "https://example.com/sitemap-0.xml",
    ]);
  } finally {
    await rm(clientDir, { force: true, recursive: true });
  }
});

test("purge requests stay within Cloudflare's 100 URL limit", () => {
  const urls = Array.from({ length: 205 }, (_, index) => `url-${index}`);

  assert.deepEqual(
    purgeModule.chunkUrls(urls).map((batch) => batch.length),
    [100, 100, 5],
  );
});

test("the deployment workflow never purges all cached assets", async () => {
  const workflowSource = await readFile(
    new URL("../.github/workflows/deploy.yml", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(workflowSource, /purge_everything/);
  assert.match(
    workflowSource,
    /node scripts\/cloudflare-cache-purge\.mjs dist\/client/,
  );
});
