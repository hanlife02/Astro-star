const DAY_MS = 24 * 60 * 60 * 1000;
const CALENDAR_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const COUNT_PATTERN = /^[0-9a-z]+$/i;
const LEVEL_PATTERN = /^[0-4]$/;
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
  year: "numeric",
});

function getContributionLabel(count, date) {
  const dateLabel = dateFormatter.format(date);

  if (count <= 0) return `No contributions on ${dateLabel}.`;
  return `${count.toLocaleString("en-US")} ${
    count === 1 ? "contribution" : "contributions"
  } on ${dateLabel}.`;
}

export function decodeGitHeatmapPayload({ calendarStart, counts, levels }) {
  if (!CALENDAR_DATE_PATTERN.test(calendarStart) || levels.length === 0) {
    return [];
  }

  const encodedCounts = counts.split(".");
  const calendarStartTimestamp = Date.parse(`${calendarStart}T00:00:00.000Z`);

  if (
    encodedCounts.length !== levels.length ||
    !Number.isFinite(calendarStartTimestamp)
  ) {
    return [];
  }

  const cells = [];

  for (let index = 0; index < levels.length; index += 1) {
    const encodedLevel = levels[index];
    const encodedCount = encodedCounts[index];
    const blank = encodedLevel === "x";

    if (
      (!blank && !LEVEL_PATTERN.test(encodedLevel)) ||
      !COUNT_PATTERN.test(encodedCount)
    ) {
      return [];
    }

    const decodedCount = Number.parseInt(encodedCount, 36);
    if (!Number.isFinite(decodedCount)) return [];

    const count = blank ? 0 : decodedCount;
    cells.push({
      blank,
      count,
      label: blank
        ? ""
        : getContributionLabel(
            count,
            new Date(calendarStartTimestamp + index * DAY_MS),
          ),
      level: blank ? 0 : Number(encodedLevel),
    });
  }

  return cells;
}
