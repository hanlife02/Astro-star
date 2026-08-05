import assert from "node:assert/strict";
import test from "node:test";

import { decodeGitHeatmapPayload } from "../src/utils/githeatmap-payload.mjs";

test("compact heatmap payload restores levels, counts, and full dates", () => {
  const cells = decodeGitHeatmapPayload({
    calendarStart: "2026-12-30",
    counts: "0.1.a.z",
    levels: "x124",
  });

  assert.deepEqual(cells, [
    { blank: true, count: 0, label: "", level: 0 },
    {
      blank: false,
      count: 1,
      label: "1 contribution on December 31, 2026.",
      level: 1,
    },
    {
      blank: false,
      count: 10,
      label: "10 contributions on January 1, 2027.",
      level: 2,
    },
    {
      blank: false,
      count: 35,
      label: "35 contributions on January 2, 2027.",
      level: 4,
    },
  ]);
});

test("a 53-week payload restores all 371 cells", () => {
  const cells = decodeGitHeatmapPayload({
    calendarStart: "2026-08-02",
    counts: Array.from({ length: 371 }, () => "0").join("."),
    levels: "0".repeat(371),
  });

  assert.equal(cells.length, 371);
  assert.equal(cells[0]?.label, "No contributions on August 2, 2026.");
  assert.equal(cells.at(-1)?.label, "No contributions on August 7, 2027.");
});

test("malformed compact heatmap payloads fail closed", () => {
  const malformedPayloads = [
    { calendarStart: "", counts: "0", levels: "0" },
    { calendarStart: "2026-08-02", counts: "0", levels: "00" },
    { calendarStart: "2026-08-02", counts: "!", levels: "0" },
    { calendarStart: "2026-08-02", counts: "0", levels: "9" },
  ];

  malformedPayloads.forEach((payload) => {
    assert.deepEqual(decodeGitHeatmapPayload(payload), []);
  });
});
