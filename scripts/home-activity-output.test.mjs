import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { parse } from "parse5";
import {
  getContentDateKey,
  parseContentLocalDateString,
} from "../src/utils/content-time-zone.ts";

const buildRoot = join(process.cwd(), "dist", "client");

function attribute(node, name) {
  return node.attrs?.find((item) => item.name === name)?.value;
}

function hasClass(node, name) {
  return attribute(node, "class")?.split(/\s+/).includes(name) ?? false;
}

function findAll(node, predicate) {
  return [
    ...(predicate(node) ? [node] : []),
    ...(node.childNodes ?? []).flatMap((child) => findAll(child, predicate)),
  ];
}

function readPage(section = "") {
  return parse(readFileSync(join(buildRoot, section, "index.html"), "utf8"));
}

test("homepage activity includes Blog, Note and Project posts within its 18-month range", () => {
  const homepage = readPage();
  const activity = findAll(homepage, (node) =>
    hasClass(node, "home-activity"),
  )[0];
  assert.ok(activity, "homepage Activity section is missing");
  const timeline = findAll(activity, (node) =>
    hasClass(node, "archive-activity-heatmap"),
  )[0];
  assert.ok(timeline, "article activity timeline is missing");
  assert.equal(
    findAll(timeline, (node) =>
      hasClass(node, "archive-activity-timeline-month"),
    ).length,
    18,
  );
  const start = attribute(timeline, "data-range-start");
  const end = attribute(timeline, "data-range-end");
  assert.ok(start && end);
  const actualLinks = new Set(
    findAll(timeline, (node) =>
      hasClass(node, "archive-activity-tooltip-link"),
    ).map((node) => attribute(node, "href")),
  );
  const expectedLinks = new Set();
  for (const section of ["blog", "note", "project"]) {
    const archiveItems = findAll(readPage(section), (node) =>
      hasClass(node, "collection-archive-item"),
    );
    for (const item of archiveItems) {
      const dateNode = findAll(item, (node) => node.tagName === "time")[0];
      const text = dateNode.childNodes
        .map((node) => node.value ?? "")
        .join("")
        .trim();
      const date = parseContentLocalDateString(text) ?? new Date(text);
      const key = getContentDateKey(date);
      if (key >= start && key <= end) {
        const link = findAll(item, (node) =>
          hasClass(node, "collection-archive-link"),
        )[0];
        expectedLinks.add(attribute(link, "href"));
      }
    }
  }
  assert.deepEqual(actualLinks, expectedLinks);
});

test("Blog and Note archives start with year lists instead of activity timelines", () => {
  for (const section of ["blog", "note"]) {
    const page = readPage(section);
    assert.equal(
      findAll(page, (node) => hasClass(node, "archive-activity-heatmap"))
        .length,
      0,
    );
    assert.ok(
      findAll(page, (node) => hasClass(node, "collection-archive-group"))
        .length > 0,
    );
  }
});

test("homepage keeps both latest lists limited to four articles", () => {
  const homepage = readPage();
  for (const section of ["blogs", "notes"]) {
    const panel = findAll(
      homepage,
      (node) => attribute(node, "data-latest-key") === section,
    )[0];
    assert.ok(panel);
    assert.ok(
      findAll(panel, (node) => hasClass(node, "latest-articles-item")).length <=
        4,
    );
  }
});

test("homepage separates the identity, motto, statistics and four social links", () => {
  const homepage = readPage();
  const identity = findAll(homepage, (node) =>
    hasClass(node, "profile-identity"),
  )[0];
  assert.ok(identity);
  assert.equal(findAll(identity, (node) => node.tagName === "h1").length, 1);
  assert.equal(
    findAll(identity, (node) => hasClass(node, "profile-avatar")).length,
    1,
  );
  assert.equal(
    findAll(identity, (node) => hasClass(node, "profile-bio")).length,
    1,
  );
  const lead = findAll(identity, (node) =>
    hasClass(node, "profile-intro-lead"),
  )[0];
  const detail = findAll(identity, (node) =>
    hasClass(node, "profile-intro-detail"),
  )[0];
  assert.ok(lead && detail, "introduction should have two separate lines");
  assert.equal(lead.tagName, "h1", "introduction should be the main heading");
  assert.equal(
    findAll(identity, (node) => hasClass(node, "profile-name")).length,
    0,
    "standalone profile name should be removed",
  );
  const highlightedNames = findAll(lead, (node) =>
    hasClass(node, "profile-intro-name"),
  );
  assert.equal(highlightedNames.length, 1);
  const textContent = (node) =>
    findAll(node, (child) => child.nodeName === "#text")
      .map((child) => child.value)
      .join("");
  const ownerName = attribute(
    findAll(identity, (node) => hasClass(node, "profile-avatar"))[0],
    "aria-label",
  );
  assert.equal(textContent(highlightedNames[0]), ownerName);
  assert.ok(
    textContent(lead).includes(`I'm ${ownerName}.`),
    "name decoration should preserve the introduction text and spacing",
  );
  assert.equal(
    findAll(identity, (node) => hasClass(node, "profile-motto")).length,
    0,
  );
  const profile = findAll(homepage, (node) =>
    hasClass(node, "profile-card"),
  )[0];
  const blocks = (profile.childNodes ?? []).filter((node) => node.tagName);
  assert.equal(
    findAll(blocks[1], (node) => node.tagName === "em").length,
    1,
    "motto should be italicized",
  );
  assert.deepEqual(
    blocks.map((node) => attribute(node, "class")?.split(" ")[0]),
    [
      "profile-identity",
      "profile-one-word",
      "profile-site-stats",
      "profile-connections",
    ],
  );
  const stats = findAll(profile, (node) =>
    hasClass(node, "profile-site-stats"),
  )[0];
  assert.equal(findAll(stats, (node) => node.tagName === "dd").length, 4);
  const paths = JSON.parse(attribute(stats, "data-article-paths"));
  const archiveCount = ["blog", "note", "project"].reduce(
    (total, section) =>
      total +
      findAll(readPage(section), (node) =>
        hasClass(node, "collection-archive-link"),
      ).length,
    0,
  );
  assert.equal(paths.length, archiveCount);
  const social = findAll(profile, (node) => hasClass(node, "profile-links"))[0];
  assert.equal(findAll(social, (node) => node.tagName === "a").length, 4);
  for (const link of findAll(social, (node) => node.tagName === "a")) {
    const labels = findAll(link, (node) =>
      hasClass(node, "profile-link-label"),
    );
    assert.equal(labels.length, 1);
    assert.equal(attribute(labels[0], "aria-hidden"), "true");
    assert.equal(textContent(labels[0]).trim(), attribute(link, "aria-label"));
  }
});
