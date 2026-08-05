import { readFile, rename, rm, writeFile } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "parse5";

const INLINE_STYLESHEET_ATTRIBUTE = "data-home-inline-stylesheet";
const LOCAL_STYLESHEET_PREFIX = "/_astro/";
const LOCAL_STYLESHEET_PATTERN = /^\/_astro\/[A-Za-z0-9._/-]+\.css$/;
const CSS_URL_PATTERN = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/gi;

function getAttribute(node, name) {
  return node.attrs?.find((attribute) => attribute.name === name)?.value;
}

function visitNodes(node, visitor) {
  visitor(node);
  for (const child of node.childNodes ?? []) {
    visitNodes(child, visitor);
  }
}

function getLocalStylesheetLinks(html) {
  const document = parse(html, { sourceCodeLocationInfo: true });
  const links = [];

  visitNodes(document, (node) => {
    if (node.tagName !== "link") return;
    const relValue = getAttribute(node, "rel") ?? "";
    const relTokens = relValue.toLowerCase().split(/\s+/).filter(Boolean);
    if (!relTokens.includes("stylesheet")) return;

    const href = getAttribute(node, "href") ?? "";
    if (!href.startsWith(LOCAL_STYLESHEET_PREFIX)) return;

    const location = node.sourceCodeLocation;
    if (
      !location ||
      !Number.isInteger(location.startOffset) ||
      !Number.isInteger(location.endOffset)
    ) {
      throw new Error(
        `Missing source location for homepage stylesheet: ${href}`,
      );
    }
    links.push({
      href,
      startOffset: location.startOffset,
      endOffset: location.endOffset,
    });
  });

  return links;
}

function resolveStylesheetPath(clientDirectory, href) {
  if (!LOCAL_STYLESHEET_PATTERN.test(href)) {
    throw new Error(`Invalid homepage stylesheet path: ${href}`);
  }

  const astroDirectory = resolve(clientDirectory, "_astro");
  const stylesheetPath = resolve(
    astroDirectory,
    href.slice(LOCAL_STYLESHEET_PREFIX.length),
  );
  const relativePath = relative(astroDirectory, stylesheetPath);
  if (
    !relativePath ||
    relativePath.startsWith("..") ||
    isAbsolute(relativePath)
  ) {
    throw new Error(`Invalid homepage stylesheet path: ${href}`);
  }
  return stylesheetPath;
}

function assertStylesheetCanBeInlined(css, href) {
  if (!css.trim()) {
    throw new Error(`Homepage stylesheet is empty: ${href}`);
  }
  if (/@import(?:\s|url\(|\()/i.test(css)) {
    throw new Error(`Homepage stylesheet still contains @import: ${href}`);
  }

  for (const match of css.matchAll(CSS_URL_PATTERN)) {
    const value = (match[1] ?? match[2] ?? match[3] ?? "").trim();
    const isSafe =
      value.startsWith("/") ||
      value.startsWith("#") ||
      /^[a-z][a-z0-9+.-]*:/i.test(value);
    if (!isSafe) {
      throw new Error(
        `Homepage stylesheet contains relative url(): ${href} (${value || "empty"})`,
      );
    }
  }
}

function escapeInlineStyle(css) {
  return css.replace(/<\/style/gi, "<\\/style");
}

function toClientDirectory(directory) {
  return directory instanceof URL
    ? fileURLToPath(directory)
    : resolve(directory);
}

export async function inlineHomepageStyles(directory) {
  const clientDirectory = toClientDirectory(directory);
  const homepagePath = resolve(clientDirectory, "index.html");
  const html = await readFile(homepagePath, "utf8");
  const links = getLocalStylesheetLinks(html);

  if (links.length === 0) {
    if (html.includes(`${INLINE_STYLESHEET_ATTRIBUTE}=`)) {
      return { inlinedCount: 0, stylesheetHrefs: [] };
    }
    throw new Error(`No local homepage stylesheets found in ${homepagePath}`);
  }

  const replacements = await Promise.all(
    links.map(async (link) => {
      const stylesheetPath = resolveStylesheetPath(clientDirectory, link.href);
      let css;
      try {
        css = await readFile(stylesheetPath, "utf8");
      } catch (error) {
        throw new Error(
          `Unable to read homepage stylesheet ${link.href}: ${error.message}`,
          { cause: error },
        );
      }
      assertStylesheetCanBeInlined(css, link.href);
      return {
        ...link,
        markup: `<style ${INLINE_STYLESHEET_ATTRIBUTE}="${link.href}">${escapeInlineStyle(css)}</style>`,
      };
    }),
  );

  let output = html;
  for (const replacement of replacements.toSorted(
    (left, right) => right.startOffset - left.startOffset,
  )) {
    output =
      output.slice(0, replacement.startOffset) +
      replacement.markup +
      output.slice(replacement.endOffset);
  }

  if (getLocalStylesheetLinks(output).length > 0) {
    throw new Error(
      "Homepage still contains local stylesheet links after inlining",
    );
  }

  const temporaryPath = `${homepagePath}.${process.pid}.inline.tmp`;
  try {
    await writeFile(temporaryPath, output, "utf8");
    await rename(temporaryPath, homepagePath);
  } finally {
    await rm(temporaryPath, { force: true });
  }

  return {
    inlinedCount: replacements.length,
    stylesheetHrefs: replacements.map((replacement) => replacement.href),
  };
}

export function inlineHomepageStylesIntegration() {
  return {
    name: "astro-star:inline-homepage-styles",
    hooks: {
      "astro:build:done": async ({ dir, logger }) => {
        const result = await inlineHomepageStyles(dir);
        logger.info(`Inlined ${result.inlinedCount} homepage stylesheet(s)`);
      },
    },
  };
}

export { INLINE_STYLESHEET_ATTRIBUTE };
