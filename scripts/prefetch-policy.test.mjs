import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const configSource = await readFile(
  new URL("../astro.config.mjs", import.meta.url),
  "utf8",
);
const frameSource = await readFile(
  new URL("../src/components/layout/HomeShellFrame.astro", import.meta.url),
  "utf8",
);
const homeSource = await readFile(
  new URL("../src/components/home/HomePageContent.astro", import.meta.url),
  "utf8",
);
const articleSource = await readFile(
  new URL("../src/components/content/ArticleDetailPage.astro", import.meta.url),
  "utf8",
);

function getAnchorByHref(source, href) {
  const hrefIndex = source.indexOf(href);
  assert.notEqual(hrefIndex, -1, `expected ${href} to exist`);

  const anchorStart = source.lastIndexOf("<a", hrefIndex);
  const anchorEnd = source.indexOf("</a>", hrefIndex);
  assert.notEqual(anchorStart, -1, `expected an anchor before ${href}`);
  assert.notEqual(anchorEnd, -1, `expected an anchor after ${href}`);

  return source.slice(anchorStart, anchorEnd + "</a>".length);
}

test("Astro prefetch stays opt-in with hover as the default strategy", () => {
  // Given the project-wide Astro configuration
  // When ClientRouter prefetch settings are inspected
  // Then only explicitly marked links may prefetch on hover or focus
  assert.match(
    configSource,
    /prefetch:\s*\{[\s\S]*?prefetchAll:\s*false,[\s\S]*?defaultStrategy:\s*"hover"/,
  );
});

test("high-probability internal navigation opts into prefetch", () => {
  // Given navigation, home timeline, and adjacent-article links
  // When their Astro templates are inspected
  // Then each high-probability link group opts into prefetch
  assert.equal(
    frameSource.match(/data-astro-prefetch/g)?.length,
    3,
    "expected mobile nav, desktop nav, and project footer prefetch",
  );
  assert.equal(
    homeSource.match(/data-astro-prefetch/g)?.length,
    2,
    "expected archive headings and latest article links to prefetch",
  );
  assert.equal(
    articleSource.match(/data-astro-prefetch/g)?.length,
    2,
    "expected previous and next article links to prefetch",
  );
});

test("RSS and external profile links stay outside the prefetch boundary", () => {
  // Given links that do not navigate to an Astro document
  // When their containing anchors are inspected
  // Then they do not opt into prefetch
  const rssAnchor = getAnchorByHref(frameSource, 'href="/rss.xml"');
  const githubAnchor = getAnchorByHref(frameSource, "href={githubHref}");

  assert.doesNotMatch(rssAnchor, /data-astro-prefetch/);
  assert.doesNotMatch(githubAnchor, /data-astro-prefetch/);
});
