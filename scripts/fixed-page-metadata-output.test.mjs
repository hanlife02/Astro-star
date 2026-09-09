import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { join } from "node:path";
import { parse } from "parse5";

const BUILD_ROOT = join(process.cwd(), "dist", "client");

function getAttribute(node, name) {
  return node.attrs?.find((attribute) => attribute.name === name)?.value;
}

function hasClass(node, className) {
  return getAttribute(node, "class")?.split(/\s+/).includes(className) ?? false;
}

function findAll(node, predicate, matches = []) {
  if (predicate(node)) matches.push(node);
  for (const child of node.childNodes ?? []) findAll(child, predicate, matches);
  return matches;
}

function findOne(node, predicate) {
  return findAll(node, predicate)[0];
}

function getText(node) {
  if (node.nodeName === "#text") return node.value ?? "";
  return (node.childNodes ?? []).map(getText).join("");
}

function readPage(routePath) {
  const filePath = join(BUILD_ROOT, routePath, "index.html");
  assert.equal(existsSync(filePath), true, `missing built page: ${routePath}`);
  return parse(readFileSync(filePath, "utf8"));
}

test("about and links render dates, counters, and word counts in their headers", () => {
  for (const routePath of ["about", "links"]) {
    const document = readPage(routePath);
    const header = findOne(document, (node) =>
      hasClass(node, "content-page-header"),
    );
    const metadataLines = findAll(header, (node) =>
      hasClass(node, "article-content-meta-line"),
    );

    assert.equal(metadataLines.length, 2, `${routePath} metadata line count`);
    assert.match(
      getText(metadataLines[0]).replace(/\s+/g, " ").trim(),
      /^Created [A-Z][a-z]{2} \d{2}, \d{4}, \d{2}:\d{2}:\d{2} \/ Updated [A-Z][a-z]{2} \d{2}, \d{4}, \d{2}:\d{2}:\d{2}$/,
    );
    assert.match(
      getText(metadataLines[1]).replace(/\s+/g, " ").trim(),
      /^Views — \/ Comments — \/ Words [\d,]+$/,
    );

    for (const className of ["waline-pageview-count", "waline-comment-count"]) {
      const counter = findOne(metadataLines[1], (node) =>
        hasClass(node, className),
      );
      assert.equal(getAttribute(counter, "data-path"), `/${routePath}/`);
    }
  }
});
