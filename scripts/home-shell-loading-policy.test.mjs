import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const homeShellSource = await readFile(
  new URL("../src/components/layout/HomeShellScripts.astro", import.meta.url),
  "utf8",
);
const pageModulesUrl = new URL(
  "../src/scripts/home-shell-page-modules.ts",
  import.meta.url,
);
const pageModulesSource = await readFile(pageModulesUrl, "utf8").catch(
  (error) => {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return "";
    }
    throw error;
  },
);

const PAGE_MODULE_NAMES = [
  "home-shell-article-actions",
  "home-shell-code-copy",
  "home-shell-codetime",
  "home-shell-constellation-background",
  "home-shell-content-fold",
  "home-shell-content-image-lightbox",
  "home-shell-content-toc",
  "home-shell-document-progress",
  "home-shell-friend-feed",
  "home-shell-friend-link-avatars",
  "home-shell-github-repo-cards",
  "home-shell-mobile-toc",
  "home-shell-waline",
];

test("HomeShell keeps page-specific modules behind dynamic imports", () => {
  // Given the global HomeShell entry and page-module coordinator
  // When module boundaries are inspected
  // Then route-specific capabilities are absent from static imports
  for (const moduleName of PAGE_MODULE_NAMES) {
    assert.doesNotMatch(
      homeShellSource,
      new RegExp(`from ["'][^"']*${moduleName}["']`),
      `${moduleName} remains in the global static entry`,
    );
    assert.match(
      pageModulesSource,
      new RegExp(`import\\(["'][^"']*${moduleName}["']\\)`),
      `${moduleName} is missing from the dynamic coordinator`,
    );
  }
});

test("HomeShell initializes only through astro:page-load", () => {
  // Given the ClientRouter lifecycle bindings
  // When direct initializer calls are counted
  // Then no eager call competes with astro:page-load on first load
  assert.match(
    homeShellSource,
    /document\.addEventListener\("astro:page-load", initHomeShell\)/,
  );
  assert.equal(
    homeShellSource.match(/^\s*initHomeShell\(\);\s*$/gm)?.length ?? 0,
    0,
    "remove the eager initHomeShell call",
  );
});
