import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import {
  inlineHomepageStyles,
  inlineHomepageStylesIntegration,
} from "./inline-homepage-styles.mjs";

async function createFixture({ html, styles = {} }) {
  const root = await mkdtemp(join(tmpdir(), "astro-home-inline-"));
  await mkdir(join(root, "_astro"), { recursive: true });
  await writeFile(join(root, "index.html"), html, "utf8");
  await Promise.all(
    Object.entries(styles).map(([name, contents]) =>
      writeFile(join(root, "_astro", name), contents, "utf8"),
    ),
  );
  return root;
}

test("local homepage stylesheets are inlined without rewriting other markup", async () => {
  const html = `<!doctype html><html><head><link rel="preload" href="/font.woff2" as="font"><link rel="stylesheet" href="/_astro/layout.css"><link rel="stylesheet" href="https://example.com/external.css"><link rel="stylesheet" href="/_astro/home.css"><link rel="icon" href="/icon.svg"></head><body>Home</body></html>`;
  const root = await createFixture({
    html,
    styles: {
      "layout.css": ".layout{background-image:url(/snowflake.svg)}",
      "home.css": '.home{color:red;content:"</style>"}',
    },
  });

  try {
    const result = await inlineHomepageStyles(root);
    const output = await readFile(join(root, "index.html"), "utf8");

    assert.deepEqual(result, {
      inlinedCount: 2,
      stylesheetHrefs: ["/_astro/layout.css", "/_astro/home.css"],
    });
    assert.ok(
      output.includes(
        '<style data-home-inline-stylesheet="/_astro/layout.css">.layout{background-image:url(/snowflake.svg)}</style>',
      ),
    );
    assert.ok(
      output.includes(
        '<style data-home-inline-stylesheet="/_astro/home.css">.home{color:red;content:"<\\/style>"}</style>',
      ),
    );
    assert.ok(
      output.indexOf("/_astro/layout.css") < output.indexOf("/_astro/home.css"),
    );
    assert.ok(
      output.includes(
        '<link rel="stylesheet" href="https://example.com/external.css">',
      ),
    );
    assert.ok(
      output.includes('<link rel="preload" href="/font.woff2" as="font">'),
    );
    assert.ok(output.includes('<link rel="icon" href="/icon.svg">'));
    assert.equal(
      await readFile(join(root, "_astro", "layout.css"), "utf8"),
      ".layout{background-image:url(/snowflake.svg)}",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("homepage style inlining is byte-idempotent", async () => {
  const root = await createFixture({
    html: '<html><head><link rel="stylesheet" href="/_astro/home.css"></head></html>',
    styles: { "home.css": ".home{display:block}" },
  });

  try {
    await inlineHomepageStyles(root);
    const once = await readFile(join(root, "index.html"), "utf8");
    const result = await inlineHomepageStyles(root);
    const twice = await readFile(join(root, "index.html"), "utf8");

    assert.deepEqual(result, { inlinedCount: 0, stylesheetHrefs: [] });
    assert.equal(twice, once);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("unsafe or incomplete homepage styles fail the build", async (t) => {
  const cases = [
    {
      name: "missing CSS file",
      html: '<link rel="stylesheet" href="/_astro/missing.css">',
      styles: {},
      pattern: /Unable to read homepage stylesheet.*missing\.css/,
    },
    {
      name: "empty CSS file",
      html: '<link rel="stylesheet" href="/_astro/empty.css">',
      styles: { "empty.css": "" },
      pattern: /Homepage stylesheet is empty.*empty\.css/,
    },
    {
      name: "relative CSS URL",
      html: '<link rel="stylesheet" href="/_astro/relative.css">',
      styles: { "relative.css": ".x{background:url(./image.png)}" },
      pattern: /relative url\(\).*relative\.css/i,
    },
    {
      name: "remaining import",
      html: '<link rel="stylesheet" href="/_astro/import.css">',
      styles: { "import.css": '@import "/base.css";.x{color:red}' },
      pattern: /@import.*import\.css/i,
    },
    {
      name: "path traversal",
      html: '<link rel="stylesheet" href="/_astro/../secret.css">',
      styles: {},
      pattern: /Invalid homepage stylesheet path/,
    },
    {
      name: "no local stylesheet",
      html: '<link rel="stylesheet" href="https://example.com/external.css">',
      styles: {},
      pattern: /No local homepage stylesheets found/,
    },
  ];

  for (const item of cases) {
    await t.test(item.name, async () => {
      const root = await createFixture(item);
      try {
        await assert.rejects(() => inlineHomepageStyles(root), item.pattern);
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    });
  }
});

test("the Astro integration transforms the generated client directory", async () => {
  const root = await createFixture({
    html: '<link rel="stylesheet" href="/_astro/home.css">',
    styles: { "home.css": ".home{display:block}" },
  });
  const messages = [];

  try {
    const integration = inlineHomepageStylesIntegration();
    assert.equal(integration.name, "astro-star:inline-homepage-styles");
    await integration.hooks["astro:build:done"]({
      dir: pathToFileURL(root),
      logger: { info: (message) => messages.push(message) },
    });

    assert.deepEqual(messages, ["Inlined 1 homepage stylesheet(s)"]);
    assert.match(
      await readFile(join(root, "index.html"), "utf8"),
      /data-home-inline-stylesheet/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
