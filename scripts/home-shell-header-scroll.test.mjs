import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { initHomeShellHeaderScroll } from "../src/scripts/home-shell-header-scroll.ts";

function setup(t) {
  const menu = new EventTarget();
  menu.open = false;
  const media = new EventTarget();
  media.matches = false;
  const styles = new Map();
  class Header extends EventTarget {
    offsetHeight = 68;
    dataset = {};
    keyboardFocus = false;
    style = {
      setProperty: (key, value) => styles.set(key, value),
      removeProperty: (key) => styles.delete(key),
    };
    querySelector(selector) {
      return selector === ":focus-visible" ? this.keyboardFocus || null : menu;
    }
  }
  const header = new Header();
  const frames = new Map();
  let nextFrame = 0;
  const browser = Object.assign(new EventTarget(), {
    scrollY: 0,
    innerHeight: 800,
    matchMedia: () => media,
    getComputedStyle: () => ({ top: "12px" }),
    requestAnimationFrame(callback) {
      frames.set(++nextFrame, callback);
      return nextFrame;
    },
    cancelAnimationFrame: (id) => frames.delete(id),
  });
  const replacements = {
    window: browser,
    document: {
      querySelector: () => header,
      documentElement: { scrollHeight: 2800 },
    },
    HTMLElement: Header,
  };
  const originals = new Map();
  for (const [key, value] of Object.entries(replacements)) {
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, value });
  }
  t.after(() => {
    browser.__homeShellHeaderScrollCleanup?.();
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  const flush = () => {
    const callbacks = [...frames.values()];
    frames.clear();
    callbacks.forEach((callback) => callback(0));
  };
  const scroll = (y) => {
    browser.scrollY = y;
    browser.dispatchEvent(new Event("scroll"));
    flush();
  };
  initHomeShellHeaderScroll();
  return {
    header,
    browser,
    menu,
    media,
    styles,
    frames,
    flush,
    scroll,
    opacity: () => Number(styles.get("--header-opacity")),
  };
}

test("the header gradually retreats down the page and returns on upward scroll", (t) => {
  const page = setup(t);
  page.scroll(20);
  assert.equal(page.opacity(), 1);
  page.scroll(60);
  assert.equal(page.header.dataset.floating, "false");
  assert.ok(page.opacity() > 0 && page.opacity() < 1);
  assert.ok(Number.parseFloat(page.styles.get("--header-shift")) < 0);
  page.scroll(200);
  assert.equal(page.opacity(), 0);
  assert.equal(page.header.dataset.scrollHidden, "true");
  assert.equal(page.header.dataset.floating, "false");
  page.scroll(170);
  assert.equal(page.header.dataset.floating, "true");
  assert.equal(page.opacity(), 1);
  page.scroll(70);
  assert.equal(page.opacity(), 1);
  assert.equal(page.header.dataset.floating, "true");
  page.scroll(110);
  assert.ok(page.opacity() > 0 && page.opacity() < 1);
  assert.equal(page.header.dataset.floating, "true");
  page.scroll(240);
  assert.equal(page.opacity(), 0);
  assert.equal(page.header.dataset.floating, "true");
  page.scroll(100);
  assert.equal(page.opacity(), 1);
  assert.equal(page.header.dataset.floating, "true");
  page.scroll(0);
  assert.equal(page.opacity(), 1);
  assert.equal(page.header.dataset.floating, "false");
  page.scroll(60);
  assert.equal(page.header.dataset.floating, "false");
  assert.ok(page.opacity() > 0 && page.opacity() < 1);
});

test("a tiny upward scroll reveals the island fully with at most six pixels of motion", (t) => {
  const page = setup(t);
  page.scroll(300);
  assert.equal(page.opacity(), 0);
  assert.equal(
    Number(page.styles.get("--header-shift")?.replace("px", "")),
    -6,
  );
  page.scroll(298);
  assert.equal(page.opacity(), 1);
  assert.equal(page.header.dataset.floating, "true");
  assert.equal(page.header.dataset.scrollHidden, "false");
  assert.equal(Number.parseFloat(page.styles.get("--header-shift")), 0);
});

test("non-scroll events do not turn the departing top navigation into an island", (t) => {
  const page = setup(t);
  page.scroll(60);
  page.browser.dispatchEvent(new Event("resize"));
  page.flush();
  assert.equal(page.header.dataset.floating, "false");
  page.scroll(60);
  assert.equal(page.header.dataset.floating, "false");
  page.scroll(50);
  assert.equal(page.header.dataset.floating, "true");
});

test("the floating orbit capsule reuses navigation inside a stable header shell", async () => {
  const frame = await readFile(
    new URL("../src/components/layout/HomeShellFrame.astro", import.meta.url),
    "utf8",
  );
  const styles = await readFile(
    new URL("../src/style/layouts/home-layout.css", import.meta.url),
    "utf8",
  );
  assert.equal((frame.match(/class="home-header-inner"/g) ?? []).length, 1);
  assert.match(frame, /class="header-star-field" aria-hidden="true"/);
  assert.match(
    frame,
    /class="header-star-field"[^>]*>\s*(?:<span><\/span>\s*){5}<\/span>/,
  );
  assert.match(
    styles,
    /\.home-header\[data-floating="true"\] \.home-header-inner\s*\{\s*max-width: 44rem;/,
  );
  assert.match(
    styles,
    /\.home-header\[data-floating="true"\] \.home-header-inner\s*\{[^}]*width: fit-content;[^}]*grid-template-columns: auto auto auto;/,
  );
  assert.match(
    styles,
    /\.home-header\[data-floating="true"\] \.desktop-top-nav\s*\{[^}]*border-left: 1px solid var\(--border-soft\);/,
  );
  assert.doesNotMatch(styles, /offset-path|header-border-orbit/);
  assert.match(styles, /@keyframes header-star-drift/);
  assert.match(styles, /@keyframes header-star-breathe/);
  assert.match(styles, /\.header-star-field > span:nth-child\(-n \+ 2\)/);
  assert.equal((styles.match(/--star-drift: \d+s;/g) ?? []).length, 5);
  assert.match(styles, /prefers-reduced-motion: no-preference/);
  assert.match(
    styles,
    /\.home-header-inner::before\s*\{[^}]*border-radius: 999px;/,
  );
  assert.doesNotMatch(
    styles,
    /header-note-star|header-orbit-star|border-bottom-left-radius/,
  );
  assert.doesNotMatch(styles, /\.top-nav-links a::before/);
  assert.match(
    styles,
    /\.top-nav-links a::after\s*\{[^}]*top: 0\.3rem;[^}]*right: 0\.15rem;[^}]*opacity: 0;/,
  );
  assert.match(styles, /\.top-nav-links a:hover::after\s*\{\s*opacity: 1;/);
  assert.match(
    styles,
    /\.top-nav-links a\[data-active="true"\]::after\s*\{\s*opacity: 1;/,
  );
});

test("the mobile menu and keyboard navigation keep the header accessible", (t) => {
  const page = setup(t);
  page.scroll(200);
  page.menu.open = true;
  page.menu.dispatchEvent(new Event("toggle"));
  page.flush();
  assert.equal(page.opacity(), 1);
  page.scroll(400);
  assert.equal(page.opacity(), 1);
  page.menu.open = false;
  page.scroll(600);
  assert.equal(page.opacity(), 0);
  page.header.keyboardFocus = true;
  page.header.dispatchEvent(new Event("focusin"));
  page.flush();
  assert.equal(page.opacity(), 1);
  page.scroll(800);
  assert.equal(page.opacity(), 1);
});

test("reduced motion keeps the header visible, including live preference changes", (t) => {
  const page = setup(t);
  page.scroll(200);
  page.media.matches = true;
  page.media.dispatchEvent(new Event("change"));
  page.flush();
  assert.equal(page.opacity(), 1);
  page.scroll(400);
  assert.equal(page.opacity(), 1);
  page.media.matches = false;
  page.scroll(600);
  assert.equal(page.opacity(), 0);
});

test("elastic overscroll does not falsely reveal a hidden header at the bottom", (t) => {
  const page = setup(t);
  page.scroll(2000);
  page.scroll(2050);
  page.scroll(2000);
  assert.equal(page.opacity(), 0);
  page.scroll(-30);
  assert.equal(page.opacity(), 1);
});

test("scroll work is coalesced and route cleanup cancels pending work and listeners", (t) => {
  const page = setup(t);
  page.browser.scrollY = 100;
  page.browser.dispatchEvent(new Event("scroll"));
  page.browser.dispatchEvent(new Event("scroll"));
  assert.equal(page.frames.size, 1);
  page.browser.__homeShellHeaderScrollCleanup();
  assert.equal(page.frames.size, 0);
  assert.equal(page.styles.size, 0);
  assert.deepEqual(page.header.dataset, {});
  page.scroll(200);
  assert.equal(page.styles.size, 0);
  initHomeShellHeaderScroll();
  assert.equal(page.opacity(), 1);
  page.scroll(400);
  assert.equal(page.opacity(), 0);
});
