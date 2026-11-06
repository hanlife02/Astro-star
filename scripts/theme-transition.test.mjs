import assert from "node:assert/strict";
import test from "node:test";
import { initHomeShellTheme } from "../src/scripts/home-shell-theme.ts";

const settle = async () => {
  for (let index = 0; index < 8; index++) await Promise.resolve();
};

function setup(
  t,
  { reduced = false, supported = true, dark = false, fail = false } = {},
) {
  class Element extends EventTarget {
    dataset = {};
    style = {};
    attributes = new Map();
    setAttribute(key, value) {
      this.attributes.set(key, value);
    }
    querySelector() {
      return null;
    }
    getBoundingClientRect() {
      return { left: 880, top: 18, width: 40, height: 40 };
    }
  }
  const root = new Element();
  root.dataset = { theme: "light", themeMode: "light" };
  const button = new Element();
  const scheme = Object.assign(new EventTarget(), { matches: dark });
  const motion = Object.assign(new EventTarget(), { matches: reduced });
  const stored = new Map();
  const browser = Object.assign(new EventTarget(), {
    innerWidth: 1200,
    innerHeight: 800,
    matchMedia: (query) => (query.includes("reduced-motion") ? motion : scheme),
    localStorage: {
      getItem: (key) => stored.get(key),
      setItem: (key, value) => stored.set(key, value),
    },
  });
  const doc = Object.assign(new EventTarget(), {
    documentElement: root,
    cookie: "",
    getElementById: () => button,
    querySelector: () => null,
  });
  const captures = [];
  const animations = [];
  root.animate = (keyframes, options) => {
    let resolve, reject;
    const animation = {
      keyframes,
      options,
      finished: new Promise((yes, no) => {
        resolve = yes;
        reject = no;
      }),
      finish: () => resolve(),
      cancel() {
        this.cancelled = true;
        reject(new Error("cancelled"));
      },
    };
    animations.push(animation);
    return animation;
  };
  if (supported)
    doc.startViewTransition = (update) => {
      const transition = {
        ready: Promise.resolve().then(() => {
          update();
          if (fail) throw new Error("snapshot unavailable");
        }),
        finished: Promise.resolve(),
        skipTransition() {
          this.skipped = true;
        },
      };
      captures.push(transition);
      return transition;
    };
  const replacements = {
    window: browser,
    document: doc,
    HTMLElement: Element,
    HTMLButtonElement: Element,
    HTMLMetaElement: Element,
  };
  const originals = new Map();
  for (const [key, value] of Object.entries(replacements)) {
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, value });
  }
  t.after(() => {
    browser.__homeShellThemeCleanup?.();
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  initHomeShellTheme();
  return {
    root,
    button,
    doc,
    browser,
    scheme,
    motion,
    stored,
    captures,
    animations,
    click: () => button.dispatchEvent(new Event("click")),
  };
}

test("new theme expands from the button center far enough to cover every viewport corner", async (t) => {
  const page = setup(t);
  page.click();
  assert.equal(page.root.dataset.theme, "light");
  await settle();
  assert.equal(page.root.dataset.theme, "dark");
  assert.equal(page.stored.get("theme-preference"), "dark");
  const animation = page.animations[0];
  assert.deepEqual(animation.keyframes.clipPath, [
    "circle(0px at 900px 38px)",
    `circle(${Math.ceil(Math.hypot(900, 762))}px at 900px 38px)`,
  ]);
  assert.equal(animation.options.pseudoElement, "::view-transition-new(root)");
  assert.equal(animation.options.duration, 650);
  animation.finish();
  await settle();
  assert.equal(page.root.dataset.themeTransitioning, undefined);
  assert.equal(page.button.dataset.themeChanging, undefined);
});

test("rapid clicks cannot start overlapping snapshots; same resolved system mode skips the reveal", async (t) => {
  const page = setup(t, { dark: true });
  page.click();
  page.click();
  await settle();
  assert.equal(page.captures.length, 1);
  page.animations[0].finish();
  await settle();
  page.click();
  await settle();
  assert.equal(page.root.dataset.themeMode, "system");
  assert.equal(page.root.dataset.theme, "dark");
  assert.equal(page.captures.length, 1);
});

for (const options of [
  { reduced: true },
  { supported: false },
  { fail: true },
]) {
  test(`theme still changes when animation is unavailable: ${JSON.stringify(options)}`, async (t) => {
    const page = setup(t, options);
    page.click();
    await settle();
    assert.equal(page.root.dataset.theme, "dark");
    assert.equal(page.animations.length, 0);
    assert.equal(page.root.dataset.themeTransitioning, undefined);
  });
}

for (const event of [
  "resize",
  "astro:before-preparation",
  "cleanup",
  "reduced-motion",
]) {
  test(`${event} cancels an active reveal and releases the snapshot`, async (t) => {
    const page = setup(t);
    page.click();
    await settle();
    if (event === "cleanup") page.browser.__homeShellThemeCleanup();
    else if (event === "reduced-motion") {
      page.motion.matches = true;
      page.motion.dispatchEvent(new Event("change"));
    } else
      (event === "resize" ? page.browser : page.doc).dispatchEvent(
        new Event(event),
      );
    await settle();
    assert.ok(page.captures[0].skipped);
    assert.ok(page.animations[0].cancelled);
    assert.equal(page.root.dataset.themeTransitioning, undefined);
    assert.equal(page.root.dataset.theme, "dark");
  });
}
