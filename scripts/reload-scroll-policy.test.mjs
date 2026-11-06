import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import test from "node:test";

const layout = await readFile(
  new URL("../src/layouts/BaseLayout.astro", import.meta.url),
  "utf8",
);
const script = layout.match(
  /<script is:inline data-reload-scroll-reset>([\s\S]*?)<\/script>/,
)?.[1];
assert.ok(script);

function run({
  type = "reload",
  hash = "",
  state = { index: 3, scrollX: 0, scrollY: 650 },
} = {}) {
  const scrolls = [];
  const history = {
    state,
    scrollRestoration: "auto",
    replaceState(value) {
      this.state = value;
    },
  };
  runInNewContext(script, {
    performance: { getEntriesByType: () => (type ? [{ type }] : []) },
    location: { hash },
    history,
    window: { scrollTo: (value) => scrolls.push(value) },
  });
  return { history, scrolls };
}

test("reload starts at the top and clears Astro's saved scroll without losing history state", () => {
  const { history, scrolls } = run();
  assert.equal(history.scrollRestoration, "manual");
  assert.equal(history.state.index, 3);
  assert.equal(history.state.scrollY, 0);
  assert.equal(scrolls.length, 1);
  assert.equal(scrolls[0].top, 0);
  assert.equal(scrolls[0].behavior, "instant");
  assert.ok(
    layout.indexOf("data-reload-scroll-reset") <
      layout.indexOf("<ClientRouter"),
  );
});

test("reload without saved router state also starts at the top", () => {
  const { history, scrolls } = run({ state: null });
  assert.equal(history.state, null);
  assert.equal(scrolls.length, 1);
});

test("anchor links and back/forward navigation retain their scroll behavior", () => {
  for (const options of [
    { hash: "#heading" },
    { type: "back_forward" },
    { type: "navigate" },
    { type: null },
  ]) {
    const { history, scrolls } = run(options);
    assert.equal(history.scrollRestoration, "auto");
    assert.equal(history.state.scrollY, 650);
    assert.equal(scrolls.length, 0);
  }
});
