import { parseFeed } from "@rowanmanning/feed-parser";
import type { FriendLinkItem } from "../config/links";

export interface FriendFeedEntry {
  authorName: string;
  title: string;
  href: string;
  sourceHref: string;
  feedHref: string;
  publishedAt: Date | null;
}

interface FriendFeedOptions {
  concurrency?: number;
  maxSources?: number;
  perFeedLimit?: number;
  requestTimeoutMs?: number;
  totalLimit?: number;
}

const DEFAULT_CONCURRENCY = 4;
const DEFAULT_MAX_SOURCES = 24;
const DEFAULT_PER_FEED_LIMIT = 12;
const DEFAULT_REQUEST_TIMEOUT_MS = 3500;
const DEFAULT_TOTAL_LIMIT = 24;
const PAGE_ACCEPT_HEADER =
  "text/html,application/xhtml+xml,application/xml;q=0.8,*/*;q=0.5";
const FEED_ACCEPT_HEADER =
  "application/rss+xml,application/atom+xml,application/xml,text/xml;q=0.9,*/*;q=0.5";
const FEED_LINK_TYPE_PATTERN =
  /\b(application\/(?:rss|atom)\+xml|application\/xml|text\/xml)\b/i;
const COMMON_FEED_PATHS = [
  "rss.xml",
  "feed.xml",
  "atom.xml",
  "index.xml",
  "feed",
] as const;

type Feed = ReturnType<typeof parseFeed>;
type FeedItem = Feed["items"][number];

const requestCache = new Map<string, Promise<string | null>>();
const feedCache = new Map<string, Promise<Feed | null>>();

function toPositiveInteger(value: number | undefined, fallback: number) {
  return Number.isFinite(value) && value && value > 0
    ? Math.floor(value)
    : fallback;
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function resolveUrl(input: string | null | undefined, base?: string) {
  const value = input?.trim();
  if (!value) return null;

  try {
    return new URL(value, base).toString();
  } catch {
    return null;
  }
}

function decodeAttributeValue(value: string) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function parseAttributes(tag: string) {
  const attributes = new Map<string, string>();
  const attributePattern =
    /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

  for (const match of tag.matchAll(attributePattern)) {
    const [, rawName, doubleQuoted, singleQuoted, unquoted] = match;
    if (!rawName || rawName.toLowerCase() === "link") continue;

    attributes.set(
      rawName.toLowerCase(),
      decodeAttributeValue(doubleQuoted ?? singleQuoted ?? unquoted ?? ""),
    );
  }

  return attributes;
}

function findAlternateFeedHrefs(html: string, pageHref: string) {
  const hrefs: string[] = [];
  const linkTagPattern = /<link\b[^>]*>/gi;

  for (const match of html.matchAll(linkTagPattern)) {
    const attributes = parseAttributes(match[0]);
    const rel = attributes.get("rel")?.toLowerCase() ?? "";
    const type = attributes.get("type") ?? "";
    const href = attributes.get("href") ?? "";

    if (!rel.split(/\s+/).includes("alternate")) continue;
    if (!FEED_LINK_TYPE_PATTERN.test(type)) continue;

    const resolvedHref = resolveUrl(href, pageHref);
    if (resolvedHref) hrefs.push(resolvedHref);
  }

  return hrefs;
}

function buildCommonFeedHrefs(siteHref: string) {
  const parsedHref = resolveUrl(siteHref);
  if (!parsedHref) return [];

  const url = new URL(parsedHref);
  const hrefs = COMMON_FEED_PATHS.map((path) =>
    new URL(path, new URL("/", url)).toString(),
  );

  if (url.pathname !== "/") {
    const pathBase = url.pathname.endsWith("/")
      ? url
      : new URL(`${url.pathname}/`, url.origin);
    hrefs.push(
      ...COMMON_FEED_PATHS.map((path) => new URL(path, pathBase).toString()),
    );
  }

  return hrefs;
}

function uniqueValues(values: readonly string[]) {
  return Array.from(new Set(values));
}

async function fetchText(
  href: string,
  accept: string,
  requestTimeoutMs: number,
) {
  const cacheKey = `${accept} ${href}`;
  const cached = requestCache.get(cacheKey);
  if (cached) return cached;

  const request = (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

    try {
      const response = await fetch(href, {
        headers: {
          accept,
          "user-agent": "Astro-star friend feed fetcher",
        },
        redirect: "follow",
        signal: controller.signal,
      });

      if (!response.ok) return null;

      return await response.text();
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  })();

  requestCache.set(cacheKey, request);
  return request;
}

async function discoverFeedHrefs(
  friendLink: FriendLinkItem,
  requestTimeoutMs: number,
) {
  const pageHref = resolveUrl(friendLink.href);
  if (!pageHref) return [];

  const html = await fetchText(pageHref, PAGE_ACCEPT_HEADER, requestTimeoutMs);
  const alternateHrefs = html ? findAlternateFeedHrefs(html, pageHref) : [];

  return uniqueValues([...alternateHrefs, ...buildCommonFeedHrefs(pageHref)]);
}

async function fetchFeed(href: string, requestTimeoutMs: number) {
  const cached = feedCache.get(href);
  if (cached) return cached;

  const request = (async () => {
    const feedText = await fetchText(
      href,
      FEED_ACCEPT_HEADER,
      requestTimeoutMs,
    );
    if (!feedText) return null;

    try {
      return parseFeed(feedText);
    } catch {
      return null;
    }
  })();

  feedCache.set(href, request);
  return request;
}

function resolveItemHref(item: FeedItem, feed: Feed, feedHref: string) {
  return (
    resolveUrl(item.url, feed.url ?? feedHref) ??
    resolveUrl(item.id, feed.url ?? feedHref)
  );
}

function toFriendFeedEntry(
  friendLink: FriendLinkItem,
  feed: Feed,
  feedHref: string,
  item: FeedItem,
): FriendFeedEntry | null {
  const title = normalizeText(item.title);
  const href = resolveItemHref(item, feed, feedHref);

  if (!title || !href) return null;

  const authorName =
    friendLink.name ||
    normalizeText(item.authors[0]?.name) ||
    normalizeText(feed.title);

  return {
    authorName,
    title,
    href,
    sourceHref: friendLink.href,
    feedHref,
    publishedAt: item.published ?? item.updated ?? null,
  };
}

async function loadFriendFeedEntries(
  friendLink: FriendLinkItem,
  perFeedLimit: number,
  requestTimeoutMs: number,
) {
  const feedHrefs = await discoverFeedHrefs(friendLink, requestTimeoutMs);

  for (const feedHref of feedHrefs) {
    const feed = await fetchFeed(feedHref, requestTimeoutMs);
    if (!feed) continue;

    const entries = feed.items
      .map((item) => toFriendFeedEntry(friendLink, feed, feedHref, item))
      .filter((entry): entry is FriendFeedEntry => Boolean(entry))
      .sort(compareFriendFeedEntries)
      .slice(0, perFeedLimit);

    if (entries.length > 0) return entries;
  }

  return [];
}

async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
) {
  const results: R[] = [];
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, worker),
  );

  return results;
}

function compareFriendFeedEntries(
  first: FriendFeedEntry,
  second: FriendFeedEntry,
) {
  const firstTime = first.publishedAt?.getTime() ?? 0;
  const secondTime = second.publishedAt?.getTime() ?? 0;

  if (firstTime !== secondTime) return secondTime - firstTime;

  return `${first.authorName} ${first.title}`.localeCompare(
    `${second.authorName} ${second.title}`,
  );
}

function dedupeEntries(entries: readonly FriendFeedEntry[]) {
  const seen = new Set<string>();
  const deduped: FriendFeedEntry[] = [];

  for (const entry of entries) {
    const key = entry.href || `${entry.authorName} ${entry.title}`;
    if (seen.has(key)) continue;

    seen.add(key);
    deduped.push(entry);
  }

  return deduped;
}

export async function getFriendFeedEntries(
  friendLinks: readonly FriendLinkItem[],
  options: FriendFeedOptions = {},
) {
  const concurrency = toPositiveInteger(
    options.concurrency,
    DEFAULT_CONCURRENCY,
  );
  const maxSources = toPositiveInteger(options.maxSources, DEFAULT_MAX_SOURCES);
  const perFeedLimit = toPositiveInteger(
    options.perFeedLimit,
    DEFAULT_PER_FEED_LIMIT,
  );
  const requestTimeoutMs = toPositiveInteger(
    options.requestTimeoutMs,
    DEFAULT_REQUEST_TIMEOUT_MS,
  );
  const totalLimit = toPositiveInteger(options.totalLimit, DEFAULT_TOTAL_LIMIT);
  const sources = friendLinks
    .filter((friendLink) => Boolean(resolveUrl(friendLink.href)))
    .slice(0, maxSources);

  const entriesBySource = await mapWithConcurrency(
    sources,
    concurrency,
    (friendLink) =>
      loadFriendFeedEntries(friendLink, perFeedLimit, requestTimeoutMs),
  );

  return dedupeEntries(entriesBySource.flat())
    .sort(compareFriendFeedEntries)
    .slice(0, totalLimit);
}
