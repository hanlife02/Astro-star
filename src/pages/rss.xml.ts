import type { APIRoute } from "astro";
import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { site as siteConfig } from "../config/site";
import { resolveContentDescription } from "../utils/content-description";
import { resolveContentDates } from "../utils/content-dates";
import { resolveContentSlug } from "../utils/content-slug";
import { resolveContentTitle } from "../utils/content-title";
import { isPublishedContentEntry } from "../utils/content-visibility";
import { getGitTimestamps } from "../utils/git-timestamps";

interface RssItem {
  title: string;
  description?: string;
  pubDate: Date;
  link: string;
}

function buildRssItems(
  entries: {
    id: string;
    body?: string;
    data: Record<string, any>;
    filePath?: string;
  }[],
  section: string,
): RssItem[] {
  const items: RssItem[] = [];

  for (const entry of entries) {
    const title = resolveContentTitle(entry.id, entry.data.title);
    const slug = resolveContentSlug(entry.id, entry.data.routeSlug);
    const contentPath =
      entry.filePath ?? `src/content/${section}/${entry.id}.mdx`;
    const { createdAt: gitCreatedAt, updatedAt: gitUpdatedAt } =
      getGitTimestamps(contentPath);
    const { createdAt, updatedAt } = resolveContentDates(entry.data, {
      createdAt: gitCreatedAt,
      updatedAt: gitUpdatedAt,
    });
    const pubDate = createdAt ?? updatedAt;

    if (!slug || !pubDate || Number.isNaN(pubDate.getTime())) continue;

    items.push({
      title,
      description: resolveContentDescription(
        entry.body ?? "",
        entry.data.description,
        siteConfig.site.description,
      ),
      pubDate,
      link: `/${section}/${slug}/`,
    });
  }

  return items;
}

const blogEntries = (await getCollection("blog")).filter(
  isPublishedContentEntry,
);
const noteEntries = (await getCollection("note")).filter(
  isPublishedContentEntry,
);
const projectEntries = (await getCollection("project")).filter(
  isPublishedContentEntry,
);

const rssItems = [
  ...buildRssItems(blogEntries, "blog"),
  ...buildRssItems(noteEntries, "note"),
  ...buildRssItems(projectEntries, "project"),
].sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());

export const GET: APIRoute = async ({ site }) => {
  const response = await rss({
    title: `${siteConfig.site.name} Feed`,
    description: siteConfig.profile.bio,
    site: site ?? siteConfig.site.url,
    items: rssItems,
    customData: "<language>zh-cn</language>",
  });
  response.headers.set("cache-control", "public, max-age=300, s-maxage=3600");
  return response;
};
