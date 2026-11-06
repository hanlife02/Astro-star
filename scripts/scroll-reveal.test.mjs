import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { initHomeShellScrollReveal } from "../src/scripts/home-shell-scroll-reveal.ts";

function setup(
  t,
  {
    reduced = false,
    supported = true,
    hash = "",
    tops = [100, 1000, 1500],
  } = {},
) {
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
      return { top: this.top, bottom: this.top + 50 };
    }
    querySelectorAll() {
      return this.children;
    }
    contains(target) {
      return this.children.includes(target);
    }
  }
  const first = new Block(tops[0]);
  const later = new Block(tops[1]);
  const timeline = new Block(tops[2], "timeline");
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
  let now = 0;
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
    performance: { now: () => now },
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
    advance: (milliseconds) => {
      now += milliseconds;
    },
    enter: (...targets) =>
      observer.callback(
        targets.map((target) => ({ target, isIntersecting: true })),
      ),
  };
}

test("first-screen content animates immediately; below-fold blocks reveal once in document order", (t) => {
  const page = setup(t);
  assert.equal(page.first.dataset.scrollReveal, "entered");
  assert.equal(page.first.properties.get("--scroll-reveal-delay"), "0s");
  assert.equal(page.observer.observed.has(page.first), false);
  assert.equal(page.later.dataset.scrollReveal, "pending");
  assert.equal(page.nested.dataset.scrollReveal, undefined);
  assert.equal(page.observer.options.rootMargin, "-12% 0px");
  page.enter(page.later, page.timeline);
  assert.equal(page.later.dataset.scrollReveal, "entered");
  assert.equal(page.timeline.properties.get("--scroll-reveal-delay"), "0.12s");
  assert.equal(page.observer.observed.size, 0);
  assert.equal(page.timeline.dataset.scrollRevealKind, "timeline");
  assert.equal(page.node.properties.get("--scroll-reveal-node-delay"), "0.95s");
});

test("initial list rows stagger across the full viewport, including the observer inset edges", (t) => {
  const page = setup(t, { tops: [0, 400, 790] });
  assert.deepEqual(
    [page.first, page.later, page.timeline].map((block) => [
      block.dataset.scrollReveal,
      block.properties.get("--scroll-reveal-delay"),
    ]),
    [
      ["entered", "0s"],
      ["entered", "0.06s"],
      ["entered", "0.12s"],
    ],
  );
  assert.equal(page.observer.observed.size, 0);
  page.enter(page.first, page.later);
  assert.equal(page.later.properties.get("--scroll-reveal-delay"), "0.06s");
});

test("year headings and article rows share one initial sequence across different parents", (t) => {
  const page = setup(t, { tops: [0, 200, 400] });
  page.browser.__homeShellScrollRevealCleanup();
  const group = { closest: () => null };
  const list = { closest: () => null };
  page.first.parentElement = group;
  page.later.parentElement = list;
  page.timeline.parentElement = { closest: () => null };
  const rows = Array.from({ length: 4 }, (_, index) => {
    const row = new page.first.constructor(500 + index * 50);
    row.parentElement = { closest: () => null };
    return row;
  });
  page.blocks.push(...rows);
  initHomeShellScrollReveal();
  assert.deepEqual(
    [page.first, page.later, page.timeline, ...rows].map((block) =>
      block.properties.get("--scroll-reveal-delay"),
    ),
    ["0s", "0.06s", "0.12s", "0.18s", "0.24s", "0.3s", "0.36s"],
  );
});

test("observer callback order cannot restart or reverse the page sequence", (t) => {
  const page = setup(t);
  page.later.parentElement = { closest: () => null };
  page.timeline.parentElement = { closest: () => null };
  page.enter(page.timeline, page.later);
  assert.equal(page.later.properties.get("--scroll-reveal-delay"), "0.06s");
  assert.equal(page.timeline.properties.get("--scroll-reveal-delay"), "0.12s");
});

test("scrolling during the initial entrance appends to its clock instead of starting a new batch", (t) => {
  const page = setup(t, { tops: [0, 200, 1000] });
  page.advance(30);
  page.enter(page.timeline);
  const initialLastStart = 60;
  const newStart =
    30 +
    Number.parseFloat(page.timeline.properties.get("--scroll-reveal-delay")) *
      1000;
  assert.equal(newStart, initialLastStart + 60);
});

test("fast scrolling cannot skip earlier pending content or let later callbacks overtake it", (t) => {
  const page = setup(t);
  page.advance(10);
  page.enter(page.timeline);
  assert.equal(page.later.dataset.scrollReveal, "entered");
  assert.equal(page.later.properties.get("--scroll-reveal-delay"), "0.05s");
  assert.equal(page.timeline.properties.get("--scroll-reveal-delay"), "0.11s");
  page.advance(10);
  page.enter(page.later);
  assert.equal(page.later.properties.get("--scroll-reveal-delay"), "0.05s");
});

test("an idle queue resumes immediately without accumulating delays for offscreen content", (t) => {
  const page = setup(t);
  page.advance(1000);
  page.enter(page.later);
  assert.equal(page.later.properties.get("--scroll-reveal-delay"), "0s");
  page.advance(1000);
  page.enter(page.timeline);
  assert.equal(page.timeline.properties.get("--scroll-reveal-delay"), "0s");
});

test("43 initially folded friend posts do not delay the following application section", (t) => {
  const page = setup(t);
  page.browser.__homeShellScrollRevealCleanup();
  const hiddenPosts = Array.from({ length: 43 }, () => {
    const post = new page.first.constructor(1100);
    post.dataset.friendFeedHidden = "true";
    return post;
  });
  page.blocks.splice(page.blocks.indexOf(page.timeline), 0, ...hiddenPosts);
  initHomeShellScrollReveal();
  page.enter(page.timeline);
  assert.equal(page.timeline.properties.get("--scroll-reveal-delay"), "0.12s");
  hiddenPosts.forEach((post) => {
    assert.equal(post.dataset.scrollReveal, undefined);
    assert.equal(post.properties.has("--scroll-reveal-delay"), false);
  });
  // More posts can expose these rows directly, without a pending reveal state.
  delete hiddenPosts[0].dataset.friendFeedHidden;
  assert.equal(hiddenPosts[0].dataset.scrollReveal, undefined);
});

test("collapsing an observed friend post before it enters does not consume a queue slot", (t) => {
  const page = setup(t);
  page.later.dataset.friendFeedHidden = "true";
  page.enter(page.timeline);
  assert.equal(page.later.dataset.scrollReveal, "visible");
  assert.equal(page.later.properties.has("--scroll-reveal-delay"), false);
  assert.equal(page.timeline.properties.get("--scroll-reveal-delay"), "0.06s");
});

test("restored positions keep earlier content visible while animating the current viewport", (t) => {
  const page = setup(t, { tops: [-100, -20, 1000] });
  assert.equal(page.first.dataset.scrollReveal, "visible");
  assert.equal(page.later.dataset.scrollReveal, "entered");
  assert.equal(page.timeline.dataset.scrollReveal, "pending");
});

test("hash navigation bypasses initial-viewport animation for its target", (t) => {
  const page = setup(t, { hash: "#heading", tops: [100, 400, 1000] });
  assert.equal(page.first.dataset.scrollReveal, "entered");
  assert.equal(page.later.dataset.scrollReveal, "visible");
});

test("new page entries replay the initial reveal after navigation cleanup", (t) => {
  const page = setup(t);
  page.browser.__homeShellScrollRevealCleanup();
  assert.equal(page.first.dataset.scrollReveal, undefined);
  initHomeShellScrollReveal();
  assert.equal(page.first.dataset.scrollReveal, "entered");
  assert.equal(page.later.dataset.scrollReveal, "pending");
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

test("friend-link cards are excluded from individual scroll reveals to keep the grid complete", async () => {
  const script = await readFile(
    new URL("../src/scripts/home-shell-scroll-reveal.ts", import.meta.url),
    "utf8",
  );
  assert.match(script, /"\.app-panel-item:not\(\[data-friend-link-card\]\)"/);
  assert.doesNotMatch(script, /"\.app-panel-item"/);
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

test("focusing an entering block skips its stagger so controls respond immediately", (t) => {
  const page = setup(t);
  page.enter(page.later);
  const focus = new Event("focusin");
  Object.defineProperty(focus, "target", { value: page.later });
  page.doc.dispatchEvent(focus);
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
  assert.equal(page.node.properties.has("--scroll-reveal-node-delay"), false);
});

test("the document-end fallback preserves heading and row order instead of revealing simultaneously", (t) => {
  const page = setup(t);
  page.later.top = 650;
  page.timeline.top = 750;
  page.browser.scrollY = 1200;
  page.browser.dispatchEvent(new Event("scroll"));
  page.frames.forEach((callback) => callback());
  assert.equal(page.later.properties.get("--scroll-reveal-delay"), "0.06s");
  assert.equal(page.timeline.properties.get("--scroll-reveal-delay"), "0.12s");
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
