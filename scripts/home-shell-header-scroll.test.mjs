import assert from "node:assert/strict";
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
  assert.ok(page.opacity() > 0 && page.opacity() < 1);
  assert.ok(Number.parseFloat(page.styles.get("--header-shift")) < 0);
  page.scroll(200);
  assert.equal(page.opacity(), 0);
  assert.equal(page.header.dataset.scrollHidden, "true");
  page.scroll(170);
  assert.ok(page.opacity() > 0 && page.opacity() < 1);
  page.scroll(0);
  assert.equal(page.opacity(), 1);
  assert.equal(page.header.dataset.floating, "false");
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
