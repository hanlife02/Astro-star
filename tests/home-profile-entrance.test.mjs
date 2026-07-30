import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const componentSource = await readFile(
  new URL("../src/components/home/HomePageContent.astro", import.meta.url),
  "utf8",
);
const entranceStyles = await readFile(
  new URL("../src/style/pages/home-page-entrance.css", import.meta.url),
  "utf8",
);

test("home profile remains hidden until the avatar settles", () => {
  // Given the server-rendered home profile markup
  // When JavaScript is enabled before the avatar request completes
  // Then the complete profile starts in an explicit loading state
  assert.match(
    componentSource,
    /class="profile-card home-profile-sequence"[\s\S]*data-profile-avatar-state="loading"/,
  );
});

test("home profile avatar is requested as above-the-fold content", () => {
  // Given the profile avatar is the reveal gate for the profile block
  // When the browser discovers the image
  // Then it requests the image eagerly and at high priority
  assert.match(
    componentSource,
    /class="profile-avatar"[\s\S]*loading="eager"[\s\S]*fetchpriority="high"/,
  );
});

test("home profile entrance waits for avatar load or error", () => {
  // Given an avatar request that has not settled yet
  // When the entrance initializer runs
  // Then it binds both terminal image events before revealing the profile
  assert.match(
    componentSource,
    /profileAvatar\.addEventListener\("load", revealProfile[\s\S]*profileAvatar\.addEventListener\("error", revealProfile/,
  );
});

test("home profile reveals quickly after the avatar settles", () => {
  // Given the avatar has settled and the profile entrance starts
  // When the complete profile block becomes visible
  // Then its reveal stays within a short interaction-scale duration
  assert.match(
    entranceStyles,
    /\.home-profile-sequence\.home-profile--entered\s*{[\s\S]*animation:\s*home-section-fade-in 0\.28s/,
  );
});
