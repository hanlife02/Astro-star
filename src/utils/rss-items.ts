import { resolveContentDescription } from "./content-description";
import { resolveContentDates } from "./content-dates";
import { normalizeContentTags } from "./content-tags";
import { resolveContentSlug } from "./content-slug";
import { resolveContentTitle } from "./content-title";
import { site as siteConfig } from "../config/site";

interface TimestampEntry {
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface RssItem {
  categories?: string[];
  description?: string;
  link: string;
  pubDate: Date;
  title: string;
}

export function buildRssItems(
  entries: {
    id: string;
    body?: string;
    data: Record<string, any>;
    filePath?: string;
  }[],
  section: string,
  getTimestamps: (contentPath: string) => TimestampEntry = () => ({
    createdAt: null,
    updatedAt: null,
  }),
): RssItem[] {
  const items: RssItem[] = [];

  for (const entry of entries) {
    const title = resolveContentTitle(entry.id, entry.data.title);
    const slug = resolveContentSlug(entry.id, entry.data.routeSlug);
    const contentPath =
      entry.filePath ?? `src/content/${section}/${entry.id}.mdx`;
    const { createdAt: gitCreatedAt, updatedAt: gitUpdatedAt } =
      getTimestamps(contentPath);
    const { createdAt, updatedAt } = resolveContentDates(entry.data, {
      createdAt: gitCreatedAt,
      updatedAt: gitUpdatedAt,
    });
    const pubDate = createdAt ?? updatedAt;

    if (!slug || !pubDate || Number.isNaN(pubDate.getTime())) continue;

    const categories = normalizeContentTags(entry.data.tags).map(
      (tag) => tag.label,
    );
    items.push({
      title,
      description: resolveContentDescription(
        entry.body ?? "",
        entry.data.description,
        siteConfig.site.description,
      ),
      pubDate,
      link: `/${section}/${slug}/`,
      ...(categories.length > 0 ? { categories } : {}),
    });
  }

  return items;
}
