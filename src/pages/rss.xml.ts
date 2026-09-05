import type { APIRoute } from "astro";
import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { site as siteConfig } from "../config/site";
import { isPublishedContentEntry } from "../utils/content-visibility";
import { buildRssItems } from "../utils/rss-items";
import { getGitTimestamps } from "../utils/git-timestamps";

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
  ...buildRssItems(blogEntries, "blog", getGitTimestamps),
  ...buildRssItems(noteEntries, "note", getGitTimestamps),
  ...buildRssItems(projectEntries, "project", getGitTimestamps),
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
