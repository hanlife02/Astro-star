import type { APIRoute } from "astro";
import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { site as siteConfig } from "../config/site";
import { resolveContentDates } from "../utils/content-dates";
import { resolveContentSlug } from "../utils/content-slug";
import { resolveContentTitle } from "../utils/content-title";
import { getGitTimestamps } from "../utils/git-timestamps";

interface RssItem {
  title: string;
  description?: string;
  pubDate: Date;
  link: string;
}

function buildRssItems(
  entries: { id: string; data: Record<string, any>; filePath?: string }[],
  section: string,
): RssItem[] {
  const items: RssItem[] = [];

  for (const entry of entries) {
    const title = resolveContentTitle(entry.id, entry.data.title);
    const slug = resolveContentSlug(entry.id, entry.data.routeSlug);
    const entryFilePath = entry.filePath
      ? new URL(`../../${entry.filePath}`, import.meta.url)
      : new URL(`../content/${section}/${entry.id}.mdx`, import.meta.url);
    const { createdAt: gitCreatedAt, updatedAt: gitUpdatedAt } =
      getGitTimestamps(entryFilePath);
    const { createdAt, updatedAt } = resolveContentDates(entry.data, {
      createdAt: gitCreatedAt,
      updatedAt: gitUpdatedAt,
    });
    const pubDate = createdAt ?? updatedAt;

    if (!slug || !pubDate || Number.isNaN(pubDate.getTime())) continue;

    items.push({
      title,
      description: entry.data.description?.trim(),
      pubDate,
      link: `/${section}/${slug}/`,
    });
  }

  return items;
}

const blogEntries = await getCollection("blog");
const noteEntries = await getCollection("note");
const projectEntries = await getCollection("project");

const rssItems = [
  ...buildRssItems(blogEntries, "blog"),
  ...buildRssItems(noteEntries, "note"),
  ...buildRssItems(projectEntries, "project"),
].sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());

export const GET: APIRoute = async ({ site }) => {
  return rss({
    title: `${siteConfig.name} Feed`,
    description: siteConfig.profile.bio,
    site: site ?? siteConfig.url,
    items: rssItems,
    customData: "<language>zh-cn</language>",
  });
};
