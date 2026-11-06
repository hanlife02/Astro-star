import assert from "node:assert/strict";
import test from "node:test";
import {
  createGitHubContributionHeatmapSkeleton,
  getGitHubContributionHeatmap,
} from "../src/utils/github-contributions.ts";

const now = new Date("2026-11-06T12:00:00Z");
const days = createGitHubContributionHeatmapSkeleton(now).days.filter(
  (day) => !day.isBlank,
);

function contributionHtml(year, { zero = false, truncated = false } = {}) {
  return days
    .filter((day) => day.date.startsWith(String(year)))
    .filter((_, index) => !truncated || index > 0)
    .map((day, index) => {
      const level = zero ? 0 : index % 5;
      const label = level ? `${level} contributions` : "No contributions";
      return `<td data-date="${day.date}" data-level="${level}" class="ContributionCalendar-day"></td>
        <tool-tip>${label} on ${day.date}.</tool-tip>`;
    })
    .join("\n");
}

function mockGitHub(t, respond = (year) => contributionHtml(year)) {
  return t.mock.method(globalThis, "fetch", async (url) => {
    const year = Number(new URL(url).searchParams.get("from").slice(0, 4));
    return new Response(respond(year));
  });
}

test("reads real contribution levels, counts and dates across two years", async (t) => {
  const fetchMock = mockGitHub(t);
  const result = await getGitHubContributionHeatmap("data-levels", now);
  assert.ok(result);
  assert.deepEqual(
    [...new Set(result.days.map((day) => day.level))].sort(),
    [0, 1, 2, 3, 4],
  );
  assert.equal(
    result.total,
    result.days.reduce((sum, day) => sum + day.count, 0),
  );
  assert.ok(result.total > 0);
  assert.equal(result.days.filter((day) => !day.isBlank).length, 365);
  assert.equal(await getGitHubContributionHeatmap("data-levels", now), result);
  assert.equal(fetchMock.mock.callCount(), 2);
});

test("retries a failed fetch after one minute instead of caching it for six hours", async (t) => {
  let clock = 0;
  let unavailable = true;
  t.mock.method(Date, "now", () => clock);
  const fetchMock = mockGitHub(t, (year) => {
    if (unavailable) throw new Error("network unavailable");
    return contributionHtml(year);
  });
  assert.equal(await getGitHubContributionHeatmap("retry-failure", now), null);
  clock = 59_999;
  assert.equal(await getGitHubContributionHeatmap("retry-failure", now), null);
  assert.equal(fetchMock.mock.callCount(), 2);
  unavailable = false;
  clock = 60_001;
  const result = await getGitHubContributionHeatmap("retry-failure", now);
  assert.ok(result?.total > 0);
  assert.equal(fetchMock.mock.callCount(), 4);
});

test("does not turn a failed year into zero contributions", async (t) => {
  mockGitHub(t, (year) => {
    if (year === 2025) throw new Error("year unavailable");
    return contributionHtml(year);
  });
  assert.equal(await getGitHubContributionHeatmap("partial-year", now), null);
});

test("rejects truncated calendars instead of filling missing days with zeros", async (t) => {
  mockGitHub(t, (year) => contributionHtml(year, { truncated: true }));
  assert.equal(await getGitHubContributionHeatmap("truncated-days", now), null);
});

test("a complete zero-contribution calendar is valid data", async (t) => {
  mockGitHub(t, (year) => contributionHtml(year, { zero: true }));
  const result = await getGitHubContributionHeatmap("no-contributions", now);
  assert.ok(result);
  assert.equal(result.total, 0);
  assert.ok(result.days.every((day) => day.level === 0));
});

test("keeps the last successful calendar during a temporary outage", async (t) => {
  let clock = 0;
  let unavailable = false;
  t.mock.method(Date, "now", () => clock);
  mockGitHub(t, (year) => {
    if (unavailable) throw new Error("temporary outage");
    return contributionHtml(year);
  });
  const result = await getGitHubContributionHeatmap("stale-calendar", now);
  assert.ok(result?.total > 0);
  unavailable = true;
  clock = 6 * 60 * 60 * 1000 + 1;
  assert.equal(
    await getGitHubContributionHeatmap("stale-calendar", now),
    result,
  );
});
