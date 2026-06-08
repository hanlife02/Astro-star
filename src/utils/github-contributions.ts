import { GITHUB_TOKEN } from "astro:env/server";

export interface GitHubContributionCell {
  count: number;
  date: string;
  dayIndex: number;
  isBlank: boolean;
  label: string;
  level: number;
  weekIndex: number;
}

export interface GitHubContributionHeatmap {
  days: GitHubContributionCell[];
  months: GitHubContributionMonth[];
  rangeEnd: string;
  rangeStart: string;
  total: number;
  weekCount: number;
}

export interface GitHubContributionMonth {
  label: string;
  weekIndex: number;
}

interface CachedGitHubContributionHeatmap {
  expiresAt: number;
  heatmap: GitHubContributionHeatmap | null;
}

interface ParsedGitHubContributionDay {
  count: number;
  date: string;
  label: string;
  level: number;
}

const CACHE_TTL = 1000 * 60 * 60 * 6;
const DAY_MS = 1000 * 60 * 60 * 24;
const GITHUB_FETCH_TIMEOUT = 8000;
const GITHUB_USERNAME_PATTERN =
  /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;

const contributionCache = new Map<string, CachedGitHubContributionHeatmap>();

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
  year: "numeric",
});
const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  timeZone: "UTC",
});

function clampContributionLevel(level: number) {
  if (!Number.isFinite(level)) return 0;
  return Math.max(0, Math.min(4, Math.trunc(level)));
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&#(\d+);/g, (_, codePoint: string) =>
      String.fromCodePoint(Number(codePoint)),
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, codePoint: string) =>
      String.fromCodePoint(Number.parseInt(codePoint, 16)),
    )
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function normalizeText(value: string) {
  return decodeHtmlEntities(value.replace(/<[^>]*>/g, ""))
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getHtmlAttribute(attributes: string, name: string) {
  const pattern = new RegExp(`\\b${escapeRegExp(name)}="([^"]*)"`, "i");
  const match = attributes.match(pattern);
  return match?.[1] ? decodeHtmlEntities(match[1]) : "";
}

function startOfUtcDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function addUtcDays(date: Date, count: number) {
  return new Date(date.getTime() + count * DAY_MS);
}

function formatUtcDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getUtcWeekStart(date: Date) {
  return addUtcDays(date, -date.getUTCDay());
}

function getUtcDayDifference(startDate: Date, endDate: Date) {
  return Math.round((endDate.getTime() - startDate.getTime()) / DAY_MS);
}

function getContributionLabel(count: number, date: Date) {
  if (count <= 0) {
    return `No contributions on ${dateFormatter.format(date)}.`;
  }

  return `${count.toLocaleString("en-US")} ${
    count === 1 ? "contribution" : "contributions"
  } on ${dateFormatter.format(date)}.`;
}

function parseContributionCount(label: string) {
  if (/^No contributions\b/i.test(label)) return 0;

  const match = label.match(/^([\d,]+)\s+contributions?\b/i);
  if (!match?.[1]) return 0;

  const count = Number.parseInt(match[1].replace(/,/g, ""), 10);
  return Number.isFinite(count) ? count : 0;
}

function parseGitHubContributionHtml(html: string) {
  const days: ParsedGitHubContributionDay[] = [];
  const dayPattern =
    /<td\b([^>]*)><\/td>\s*(?:<tool-tip\b[^>]*>([\s\S]*?)<\/tool-tip>)?/gi;
  let match: RegExpExecArray | null;

  while ((match = dayPattern.exec(html))) {
    const attributes = match[1] ?? "";
    const className = getHtmlAttribute(attributes, "class");

    if (!/\bContributionCalendar-day\b/.test(className)) continue;

    const date = getHtmlAttribute(attributes, "data-date");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;

    const level = clampContributionLevel(
      Number.parseInt(getHtmlAttribute(attributes, "data-level"), 10),
    );
    const label =
      normalizeText(match[2] ?? "") ||
      getContributionLabel(0, new Date(`${date}T00:00:00.000Z`));

    days.push({
      count: parseContributionCount(label),
      date,
      label,
      level,
    });
  }

  return days;
}

async function fetchWithTimeout(url: string, init?: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, GITHUB_FETCH_TIMEOUT);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchContributionYear(username: string, year: number) {
  const headers: Record<string, string> = {
    accept: "text/html",
    "user-agent": "Astro-star",
  };

  if (GITHUB_TOKEN) {
    headers.authorization = `Bearer ${GITHUB_TOKEN}`;
  }

  const params = new URLSearchParams({
    from: `${year}-01-01`,
    to: `${year}-12-31`,
  });
  const response = await fetchWithTimeout(
    `https://github.com/users/${encodeURIComponent(
      username,
    )}/contributions?${params.toString()}`,
    { headers },
  );

  if (!response.ok) {
    throw new Error(`GitHub contributions request failed: ${response.status}`);
  }

  const days = parseGitHubContributionHtml(await response.text());
  if (days.length === 0) {
    throw new Error("GitHub contributions response contained no days.");
  }

  return days;
}

function getContributionYears(rangeStartDate: Date, rangeEndDate: Date) {
  const years: number[] = [];

  for (
    let year = rangeStartDate.getUTCFullYear();
    year <= rangeEndDate.getUTCFullYear();
    year += 1
  ) {
    years.push(year);
  }

  return years;
}

function createContributionHeatmap(
  contributionsByDate: Map<string, ParsedGitHubContributionDay>,
  now = new Date(),
): GitHubContributionHeatmap {
  const rangeEndDate = startOfUtcDay(now);
  const rangeStartDate = addUtcDays(rangeEndDate, -364);
  const calendarStartDate = getUtcWeekStart(rangeStartDate);
  const weekCount = Math.ceil(
    (getUtcDayDifference(calendarStartDate, rangeEndDate) + 1) / 7,
  );
  const rangeStartTime = rangeStartDate.getTime();
  const rangeEndTime = rangeEndDate.getTime();
  const days: GitHubContributionCell[] = [];
  const months: GitHubContributionMonth[] = [];
  const labeledMonths = new Set<string>();
  let total = 0;

  for (let index = 0; index < weekCount * 7; index += 1) {
    const date = addUtcDays(calendarStartDate, index);
    const dateTime = date.getTime();
    const dateKey = formatUtcDateKey(date);
    const isBlank = dateTime < rangeStartTime || dateTime > rangeEndTime;
    const contribution = contributionsByDate.get(dateKey);
    const count = isBlank ? 0 : (contribution?.count ?? 0);
    const weekIndex = Math.floor(index / 7);

    const monthKey = dateKey.slice(0, 7);

    if (
      !isBlank &&
      !labeledMonths.has(monthKey) &&
      (date.getUTCDate() <= 7 || dateTime === rangeStartTime)
    ) {
      labeledMonths.add(monthKey);
      months.push({
        label: monthFormatter.format(date),
        weekIndex,
      });
    }

    if (!isBlank) {
      total += count;
    }

    days.push({
      count,
      date: dateKey,
      dayIndex: date.getUTCDay(),
      isBlank,
      label: isBlank
        ? ""
        : contribution?.label || getContributionLabel(count, date),
      level: isBlank ? 0 : (contribution?.level ?? 0),
      weekIndex,
    });
  }

  return {
    days,
    months,
    rangeEnd: formatUtcDateKey(rangeEndDate),
    rangeStart: formatUtcDateKey(rangeStartDate),
    total,
    weekCount,
  };
}

export function createGitHubContributionHeatmapSkeleton(now = new Date()) {
  return createContributionHeatmap(new Map(), now);
}

export async function getGitHubContributionHeatmap(
  username: string,
  now = new Date(),
) {
  const normalizedUsername = username.trim();

  if (!GITHUB_USERNAME_PATTERN.test(normalizedUsername)) {
    return null;
  }

  const skeleton = createGitHubContributionHeatmapSkeleton(now);
  const cacheKey = `${normalizedUsername}:${skeleton.rangeStart}:${skeleton.rangeEnd}`;
  const cachedHeatmap = contributionCache.get(cacheKey);

  if (cachedHeatmap && cachedHeatmap.expiresAt > Date.now()) {
    return cachedHeatmap.heatmap;
  }

  try {
    const rangeStartDate = new Date(`${skeleton.rangeStart}T00:00:00.000Z`);
    const rangeEndDate = new Date(`${skeleton.rangeEnd}T00:00:00.000Z`);
    const yearResults = await Promise.allSettled(
      getContributionYears(rangeStartDate, rangeEndDate).map((year) =>
        fetchContributionYear(normalizedUsername, year),
      ),
    );
    const fetchedDays = yearResults.flatMap((result) =>
      result.status === "fulfilled" ? result.value : [],
    );
    const heatmap =
      fetchedDays.length > 0
        ? createContributionHeatmap(
            new Map(fetchedDays.map((day) => [day.date, day])),
            now,
          )
        : null;

    contributionCache.set(cacheKey, {
      expiresAt: Date.now() + CACHE_TTL,
      heatmap,
    });

    return heatmap;
  } catch {
    contributionCache.set(cacheKey, {
      expiresAt: Date.now() + CACHE_TTL,
      heatmap: null,
    });

    return null;
  }
}
