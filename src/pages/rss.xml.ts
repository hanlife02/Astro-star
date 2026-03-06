import type { APIRoute } from "astro";
import rss from "@astrojs/rss";
import { site as siteConfig } from "../config/site";

interface ContentModule {
  frontmatter?: {
    title?: string;
    description?: string;
    pubDate?: string | Date;
    date?: string | Date;
  };
}

interface RssItem {
  title: string;
  description?: string;
  pubDate: Date;
  link: string;
}

const contentModules = {
  ...import.meta.glob("../content/blog/*.{md,mdx}", { eager: true }),
  ...import.meta.glob("../content/note/*.{md,mdx}", { eager: true }),
  ...import.meta.glob("../content/project/*.{md,mdx}", { eager: true }),
};

const rssItems = Object.entries(contentModules)
  .map(([path, mod]) => {
    const frontmatter = (mod as ContentModule).frontmatter;
    const title = frontmatter?.title?.trim();
    const description = frontmatter?.description?.trim();
    const rawDate = frontmatter?.pubDate ?? frontmatter?.date;
    const pubDate = rawDate ? new Date(rawDate) : null;
    const slug = path.split("/").pop()?.replace(/\.(md|mdx)$/i, "");
    const section = path.includes("/note/")
      ? "note"
      : path.includes("/project/")
        ? "project"
        : "blog";

    if (!title || !slug || !pubDate || Number.isNaN(pubDate.getTime())) {
      return null;
    }

    return {
      title,
      description,
      pubDate,
      link: `/${section}/${slug}/`,
    } satisfies RssItem;
  })
  .filter((item): item is RssItem => item !== null)
  .sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());

export const GET: APIRoute = async ({ site }) => {
  return rss({
    title: `${siteConfig.name} Feed`,
    description: siteConfig.profile.bio,
    site: site ?? siteConfig.url,
    items: rssItems,
    customData: "<language>zh-cn</language>",
  });
};
