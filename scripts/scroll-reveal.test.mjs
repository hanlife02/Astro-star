import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { initHomeShellScrollReveal } from "../src/scripts/home-shell-scroll-reveal.ts";

function setup(t, { reduced = false, supported = true, hash = "" } = {}) {
  class Block {
    dataset = {};
    parentElement = null;
    properties = new Map();
    children = [];
    style = {
      setProperty: (key, value) => this.properties.set(key, value),
      getPropertyValue: (key) => this.properties.get(key) ?? "",
      removeProperty: (key) => this.properties.delete(key),
    };
    constructor(top, kind = "block") {
      this.top = top;
      this.kind = kind;
    }
    closest() {
      return null;
    }
    matches(selector) {
      return (
        selector === ".archive-activity-heatmap" && this.kind === "timeline"
      );
    }
    getBoundingClientRect() {
      return { top: this.top };
    }
    querySelectorAll() {
      return this.children;
    }
    contains(target) {
      return this.children.includes(target);
    }
  }
  const first = new Block(100);
  const later = new Block(1000);
  const timeline = new Block(1500, "timeline");
  const node = new Block(1500);
  node.style.setProperty("--archive-activity-x", "50%");
  timeline.children.push(node);
  const nested = new Block(1000);
  nested.parentElement = {
    closest: () => (later.dataset.scrollReveal ? later : null),
  };
  const blocks = [first, later, nested, timeline];
  const media = Object.assign(new EventTarget(), { matches: reduced });
  const frames = new Map();
  let nextFrame = 0;
  let observer;
  class Observer {
    observed = new Set();
    constructor(callback, options) {
      this.callback = callback;
      this.options = options;
      observer = this;
    }
    observe(element) {
      this.observed.add(element);
    }
    unobserve(element) {
      this.observed.delete(element);
    }
    disconnect() {
      this.observed.clear();
      this.disconnected = true;
    }
  }
  const browser = Object.assign(new EventTarget(), {
    innerHeight: 800,
    scrollY: 0,
    location: { hash },
    matchMedia: () => media,
    requestAnimationFrame(callback) {
      frames.set(++nextFrame, callback);
      return nextFrame;
    },
    cancelAnimationFrame(id) {
      frames.delete(id);
    },
    ...(supported ? { IntersectionObserver: Observer } : {}),
  });
  const doc = Object.assign(new EventTarget(), {
    querySelectorAll: () => blocks,
    getElementById: () => later,
    documentElement: { scrollHeight: 2000 },
  });
  const replacements = {
    window: browser,
    document: doc,
    Element: Block,
    HTMLElement: Block,
    IntersectionObserver: Observer,
  };
  const originals = new Map();
  for (const [key, value] of Object.entries(replacements)) {
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, value });
  }
  t.after(() => {
    browser.__homeShellScrollRevealCleanup?.();
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  initHomeShellScrollReveal();
  return {
    first,
    later,
    timeline,
    nested,
    node,
    blocks,
    media,
    browser,
    doc,
    frames,
    observer,
    enter: (...targets) =>
      observer.callback(
        targets.map((target) => ({ target, isIntersecting: true })),
      ),
  };
}

test("first-screen content stays visible; below-fold blocks reveal once with bounded stagger", (t) => {
  const page = setup(t);
  assert.equal(page.first.dataset.scrollReveal, "visible");
  assert.equal(page.later.dataset.scrollReveal, "pending");
  assert.equal(page.nested.dataset.scrollReveal, undefined);
  assert.equal(page.observer.options.rootMargin, "-12% 0px");
  page.enter(page.later, page.timeline);
  assert.equal(page.later.dataset.scrollReveal, "entered");
  assert.equal(page.timeline.properties.get("--scroll-reveal-delay"), "0.12s");
  assert.equal(page.observer.observed.size, 0);
  assert.equal(page.timeline.dataset.scrollRevealKind, "timeline");
  assert.equal(page.node.properties.get("--scroll-reveal-delay"), "0.95s");
});

test("reduced motion and unsupported browsers never hide content", (t) => {
  const page = setup(t, { reduced: true });
  assert.equal(page.observer, undefined);
  page.blocks.forEach((block) =>
    assert.equal(block.dataset.scrollReveal, undefined),
  );
});

test("missing IntersectionObserver leaves content readable", (t) => {
  const page = setup(t, { supported: false });
  assert.equal(page.observer, undefined);
  assert.equal(page.later.dataset.scrollReveal, undefined);
});

test("hash targets and keyboard focus reveal without waiting for an animation", (t) => {
  const page = setup(t, { hash: "#heading" });
  assert.equal(page.later.dataset.scrollReveal, "visible");
  const focus = new Event("focusin");
  Object.defineProperty(focus, "target", { value: page.node });
  page.doc.dispatchEvent(focus);
  assert.equal(page.timeline.dataset.scrollReveal, "visible");
});

test("live motion preferences and printing expose all pending content", (t) => {
  const page = setup(t);
  page.media.matches = true;
  page.media.dispatchEvent(new Event("change"));
  assert.equal(page.later.dataset.scrollReveal, "visible");
  assert.equal(page.timeline.dataset.scrollReveal, "visible");
  page.browser.__homeShellScrollRevealCleanup();
  page.media.matches = false;
  initHomeShellScrollReveal();
  page.browser.dispatchEvent(new Event("beforeprint"));
  assert.equal(page.later.dataset.scrollReveal, "visible");
});

test("bottom-of-page blocks reveal and navigation cleanup restores all attributes", (t) => {
  const page = setup(t);
  page.timeline.top = 750;
  page.browser.scrollY = 1200;
  page.browser.dispatchEvent(new Event("scroll"));
  page.frames.forEach((callback) => callback());
  assert.equal(page.timeline.dataset.scrollReveal, "entered");
  page.browser.__homeShellScrollRevealCleanup();
  assert.ok(page.observer.disconnected);
  assert.equal(page.later.dataset.scrollReveal, undefined);
  assert.equal(page.node.properties.has("--scroll-reveal-delay"), false);
});

test("global reveal integrates with Astro lifecycle, CSS-only fallback and print support", async () => {
  const shell = await readFile(
    new URL("../src/components/layout/HomeShellScripts.astro", import.meta.url),
    "utf8",
  );
  const css = await readFile(
    new URL("../src/style/base/scroll-reveal.css", import.meta.url),
    "utf8",
  );
  assert.match(
    shell,
    /runHomeShellInitializer\("scroll-reveal", initHomeShellScrollReveal\)/,
  );
  assert.match(shell, /"__homeShellScrollRevealCleanup"/);
  assert.match(css, /prefers-reduced-motion: no-preference/);
  assert.match(css, /@media print, \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /clip-path: inset\(0 100% 0 0\)/);
});
