import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const homePageSource = await readFile(
  new URL("../src/components/home/HomePageContent.astro", import.meta.url),
  "utf8",
);
const homeShellSource = await readFile(
  new URL("../src/components/layout/HomeShellFrame.astro", import.meta.url),
  "utf8",
);
const homeShellScriptsSource = await readFile(
  new URL("../src/components/layout/HomeShellScripts.astro", import.meta.url),
  "utf8",
);
const homeLayoutSource = await readFile(
  new URL("../src/layouts/HomeLayout.astro", import.meta.url),
  "utf8",
);
const baseLayoutSource = await readFile(
  new URL("../src/layouts/BaseLayout.astro", import.meta.url),
  "utf8",
);
const routeTransitionStylesSource = await readFile(
  new URL("../src/style/base/route-transitions.css", import.meta.url),
  "utf8",
);
const routeTransitionLockSource = await readFile(
  new URL(
    "../src/scripts/home-shell-route-transition-lock.ts",
    import.meta.url,
  ),
  "utf8",
);
const contentShellSource = await readFile(
  new URL("../src/components/layout/ContentShell.astro", import.meta.url),
  "utf8",
);
const entranceScriptExists = await readFile(
  new URL("../src/scripts/home-shell-home-entrance.ts", import.meta.url),
  "utf8",
).then(
  () => true,
  () => false,
);
const avatarScriptExists = await access(
  new URL("../src/scripts/home-shell-profile-avatar.ts", import.meta.url),
).then(
  () => true,
  () => false,
);
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
const homePageStylesSource = await readFile(
  new URL(
    "../src/style/components/home/home-page-content.css",
    import.meta.url,
  ),
  "utf8",
);
const heatmapSource = await readFile(
  new URL("../src/components/home/githeatmap.astro", import.meta.url),
  "utf8",
);
const heatmapStylesSource = await readFile(
  new URL("../src/style/components/home/githeatmap.css", import.meta.url),
  "utf8",
);
const siteConfigSource = await readFile(
  new URL("../src/config/site.ts", import.meta.url),
  "utf8",
);
const astroConfigSource = await readFile(
  new URL("../astro.config.mjs", import.meta.url),
  "utf8",
);
const inlineHomepageStylesSource = await readFile(
  new URL("./inline-homepage-styles.mjs", import.meta.url),
  "utf8",
).catch(() => "");

function getConfiguredSignatureSvg(source) {
  const match = source.match(/signatureSvg:\s*'([^']+)'/);
  assert.ok(match?.[1], "site.profile.signatureSvg must be a quoted SVG");
  return match[1];
}

test("homepage timeline and GitHub headings share Latest typography and star styling", () => {
  for (const title of ["Article Timeline", "Github Heatmap"]) {
    assert.ok(
      homePageSource.includes(
        `class="home-activity-title-text">${title}</span>`,
      ),
    );
  }
  assert.match(
    homePageStylesSource,
    /\.home-latest-sequence \.latest-articles-title,\s*\.home-activity-title\s*\{[^}]*font-size: 1\.5rem;/,
  );
  assert.match(
    homePageStylesSource,
    /\.latest-articles-title-text,\s*\.home-activity-title-text\s*\{[^}]*-webkit-text-stroke: 0\.75px var\(--line\);/,
  );
  assert.match(
    homePageStylesSource,
    /\.home-activity-title\s*\{[^}]*justify-content: center;/,
  );
  assert.match(
    homePageStylesSource,
    /\.home-activity \.archive-activity-timeline-dot\s*\{[^}]*clip-path: var\(--home-star-shape\);/,
  );
});

test("the homepage directly paints its preloaded avatar without a fallback", () => {
  assert.match(homePageSource, /data-home-avatar-preload/);
  assert.match(homePageSource, /href=\{profile\.avatarSrc\}/);
  assert.match(homePageSource, /--profile-avatar-image/);
  assert.match(homePageSource, /data-home-profile-avatar/);
  assert.match(homePageSource, /role="img"/);
  assert.match(homePageSource, /aria-label=\{ownerName\}/);
  assert.doesNotMatch(homePageSource, /profileInitial/);
  assert.doesNotMatch(homePageSource, /profile-avatar-fallback/);
  assert.doesNotMatch(homePageSource, /data-profile-avatar-state/);
  assert.doesNotMatch(profileStylesSource, /profile-avatar-fallback/);
  assert.equal(avatarScriptExists, false);
  assert.doesNotMatch(pageModulesSource, /name: "profile-avatar"/);
  assert.doesNotMatch(
    homeShellScriptsSource,
    /__homeShellProfileAvatarCleanup/,
  );
});

test("the homepage entrance is CSS-only", () => {
  assert.doesNotMatch(homeShellSource, /data-home-main-state=/);
  assert.match(homeShellSource, /data-home-shell-main/);
  assert.equal(entranceScriptExists, false);
  assert.doesNotMatch(pageModulesSource, /name: "home-entrance"/);
  assert.doesNotMatch(pageModulesSource, /name: "profile-avatar"/);
});

test("the avatar star follows its ring while reduced motion keeps it still", () => {
  assert.match(
    homePageSource,
    /class="profile-avatar-orbit"\s+data-orbit-side="back"\s+aria-hidden="true"/,
  );
  assert.match(
    homePageStylesSource,
    /offset-path: ellipse\(50% 50% at 50% 50%\)/,
  );
  assert.match(
    homePageStylesSource,
    /@media \(prefers-reduced-motion: no-preference\)\s*\{\s*\.profile-avatar-orbit::after\s*\{\s*animation: profile-star-orbit 18s linear infinite/,
  );
  assert.match(
    homePageStylesSource,
    /\.home-profile-sequence \.profile-avatar\s*\{\s*opacity: 0\.85;/,
  );
});

test("the avatar occludes the far orbit while the near ring and synchronized star pass in front", () => {
  assert.equal(
    (homePageSource.match(/class="profile-avatar-orbit"/g) ?? []).length,
    2,
  );
  assert.match(homePageSource, /data-orbit-side="front"\s+aria-hidden="true"/);
  assert.match(
    homePageStylesSource,
    /\.profile-avatar-orbit\[data-orbit-side="back"\]\s*\{[^}]*z-index: 0;[^}]*clip-path: inset\(-0\.75rem -0\.75rem 50% -0\.75rem\);/,
  );
  assert.match(
    homePageStylesSource,
    /\.profile-avatar-orbit\[data-orbit-side="front"\]\s*\{[^}]*z-index: 2;[^}]*clip-path: inset\(50% -0\.75rem -0\.75rem -0\.75rem\);/,
  );
  assert.match(
    homePageStylesSource,
    /\.home-profile-sequence \.profile-avatar-wrap::before\s*\{[^}]*z-index: 1;[^}]*background: var\(--paper\);/,
  );
});

test("navigation skips route animations without disabling page entrances", () => {
  assert.match(baseLayoutSource, /transition:animate="none"/);
  assert.match(baseLayoutSource, /<ClientRouter fallback="swap"/);
  assert.match(routeTransitionStylesSource, /animation: none !important/);
  assert.doesNotMatch(routeTransitionStylesSource, /@keyframes/);
  assert.doesNotMatch(
    routeTransitionLockSource,
    /removeAttribute\("data-home-initial-entrance"\)/,
  );
  assert.match(entranceStylesSource, /animation: 300ms home-content-in/);
  assert.match(homeShellScriptsSource, /initHomeShellContentPageEntrance/);
});

test("CSS restarts the profile and latest entrance for every document", () => {
  assert.match(homeShellSource, /data-home-entrance-content="profile"/);
  assert.match(homeShellSource, /data-home-entrance-content="latest"/);
  assert.doesNotMatch(homeShellSource, /<aside[^>]*data-home-entrance-content/);
  assert.doesNotMatch(entranceStylesSource, /data-home-main-state/);
  assert.doesNotMatch(entranceStylesSource, /html\[data-js=/);
  assert.match(entranceStylesSource, /animation:\s*300ms home-content-in/);
  assert.match(entranceStylesSource, /animation-fill-mode:\s*forwards/);
  assert.match(
    entranceStylesSource,
    /data-home-entrance-content="profile"[\s\S]*?animation-delay:\s*50ms/,
  );
  assert.match(
    entranceStylesSource,
    /data-home-entrance-content="latest"[\s\S]*?animation-delay:\s*100ms/,
  );
  assert.match(entranceStylesSource, /translateY\(2rem\)/);
  assert.match(
    entranceStylesSource,
    /@media \(prefers-reduced-motion: reduce\)/,
  );
});

test("the avatar keeps a transparent circular border", () => {
  const avatarRule = profileStylesSource.match(
    /\.profile-avatar \{([\s\S]*?)\}/,
  )?.[1];

  assert.ok(avatarRule);
  assert.match(
    avatarRule,
    /border:\s*1px solid color-mix\(in srgb, var\(--line\) 14%, transparent\)/,
  );
  assert.match(avatarRule, /border-radius:\s*50%/);
  assert.match(avatarRule, /background-color:\s*transparent/);
  assert.match(avatarRule, /background-image:\s*var\(--profile-avatar-image\)/);
  assert.doesNotMatch(profileStylesSource, /profile-avatar-fallback/);
});

test("content page styles are owned by the content shell", () => {
  assert.doesNotMatch(
    homeLayoutSource,
    /import "\.\.\/style\/pages\/content-page\.css";/,
  );
  assert.match(
    contentShellSource,
    /import "\.\.\/\.\.\/style\/pages\/content-page\.css";/,
  );
});

test("the homepage heatmap compacts layout metadata by week", () => {
  assert.match(heatmapSource, /const heatmapWeeks =/);
  assert.match(heatmapSource, /class="githeatmap-week"/);
  assert.match(heatmapSource, /--githeatmap-hover-delay:/);
  assert.doesNotMatch(heatmapSource, /grid-column:\s*\$\{day\.weekIndex/);
  assert.doesNotMatch(heatmapSource, /grid-row:\s*\$\{\s*day\.dayIndex/);
  assert.doesNotMatch(heatmapSource, /aria-label=\{day\.label/);
  assert.match(heatmapSource, /title=\{day\.label \|\| undefined\}/);
  assert.match(heatmapSource, /data-level=\{day\.level\}/);
  assert.match(heatmapSource, /data-blank=\{day\.isBlank/);
  assert.match(
    heatmapStylesSource,
    /\.githeatmap-grid\s*\{[\s\S]*?grid-auto-flow:\s*column;/,
  );
  assert.match(
    heatmapStylesSource,
    /\.githeatmap-week\s*\{[\s\S]*?display:\s*contents;/,
  );
});

test("homepage GitHub cells and legend share the star theme without changing contribution levels", () => {
  assert.match(
    homePageStylesSource,
    /\.home-activity :is\(\.githeatmap-cell, \.githeatmap-legend-cell\)\s*\{[^}]*border-radius: 0;[^}]*clip-path: var\(--home-star-shape\);/,
  );
  for (const level of [1, 2, 3, 4]) {
    assert.ok(
      heatmapStylesSource.includes(`.githeatmap-cell[data-level="${level}"]`),
    );
    assert.ok(
      heatmapStylesSource.includes(
        `.githeatmap-legend-cell[data-level="${level}"]`,
      ),
    );
  }
  assert.match(
    heatmapStylesSource,
    /\.githeatmap-cell\[data-blank="true"\][\s\S]*?background-color: transparent;/,
  );
  assert.match(heatmapStylesSource, /prefers-reduced-motion: reduce/);
  assert.match(
    homePageStylesSource,
    /\.home-activity \.githeatmap-link:focus-visible\s*\{[^}]*outline: 1px solid/,
  );
});

test("the inline signature source stays below 16 KiB", () => {
  const signatureSvg = getConfiguredSignatureSvg(siteConfigSource);

  assert.ok(
    Buffer.byteLength(signatureSvg, "utf8") < 16 * 1024,
    `Expected signatureSvg below 16 KiB, received ${Buffer.byteLength(
      signatureSvg,
      "utf8",
    )} bytes`,
  );
});

test("the production build inlines styles only for the prerendered homepage", () => {
  assert.match(
    astroConfigSource,
    /import \{ inlineHomepageStylesIntegration \} from "\.\/scripts\/inline-homepage-styles\.mjs";/,
  );
  assert.match(astroConfigSource, /inlineHomepageStylesIntegration\(\)/);
  assert.doesNotMatch(astroConfigSource, /inlineStylesheets:\s*["']always["']/);
  assert.match(inlineHomepageStylesSource, /astro:build:done/);
  assert.match(inlineHomepageStylesSource, /index\.html/);
  assert.match(inlineHomepageStylesSource, /data-home-inline-stylesheet/);
});
