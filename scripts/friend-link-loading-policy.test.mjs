import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const cardSource = await readFile(
  new URL("../src/components/links/FriendLinkCard.astro", import.meta.url),
  "utf8",
);
const avatarScriptSource = await readFile(
  new URL("../src/scripts/home-shell-friend-link-avatars.ts", import.meta.url),
  "utf8",
);

test("friend avatars do not expose request URLs before viewport proximity", () => {
  const enhancedImages = cardSource.match(
    /<img[\s\S]*?data-friend-link-image="true"[\s\S]*?\/>/g,
  );

  assert.equal(enhancedImages?.length, 2);

  for (const image of enhancedImages ?? []) {
    assert.doesNotMatch(image, /\ssrc=\{avatarSrc\}/);
    assert.match(image, /data-friend-link-src=\{avatarSrc\}/);
    assert.match(image, /loading="lazy"/);
    assert.match(image, /decoding="async"/);
    assert.match(image, /fetchpriority="low"/);
  }

  assert.match(cardSource, /<noscript>[\s\S]*?src=\{avatarSrc\}/);
});

test("friend avatars load near the viewport and observers are cleaned up", () => {
  assert.match(avatarScriptSource, /new IntersectionObserver/);
  assert.match(avatarScriptSource, /rootMargin: "160px 0px"/);
  assert.match(avatarScriptSource, /image\.src = source/);
  assert.match(avatarScriptSource, /observer\.unobserve\(card\)/);
  assert.match(avatarScriptSource, /observer\.disconnect\(\)/);
});
