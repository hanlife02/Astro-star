import type { CollectionEntry } from "astro:content";
import { resolveContentDates } from "./content-dates";
import { getGitTimestamps } from "./git-timestamps";
import { resolveContentSlug } from "./content-slug";
import { resolveContentTitle } from "./content-title";
import { isPublishedContentEntry } from "./content-visibility";

type SectionKey = "blog" | "note" | "project";
type SectionEntry = CollectionEntry<SectionKey>;

export interface AdjacentArticle {
  href: string;
  title: string;
}

interface DatedArticleEntry extends AdjacentArticle {
  id: string;
  slug: string;
  timestamp: number;
}

const adjacentArticlesCache = new Map<SectionKey, DatedArticleEntry[]>();

function buildDatedEntries(section: SectionKey, entries: SectionEntry[]) {
  return entries
    .filter(isPublishedContentEntry)
    .map((entry) => {
      const entrySlug = resolveContentSlug(entry.id, entry.data.routeSlug);
      const entryContentPath =
        entry.filePath ?? `src/content/${section}/${entry.id}.mdx`;
      const { createdAt: entryGitCreatedAt, updatedAt: entryGitUpdatedAt } =
        getGitTimestamps(entryContentPath);
      const entryDates = resolveContentDates(entry.data, {
        createdAt: entryGitCreatedAt,
        updatedAt: entryGitUpdatedAt,
      });
      const entryDate = entryDates.createdAt ?? entryDates.updatedAt;

      return {
        href: `/${section}/${entrySlug}/`,
        id: entry.id,
        slug: entrySlug,
        timestamp: entryDate?.getTime() ?? 0,
        title: resolveContentTitle(entry.id, entry.data.title),
      };
    })
    .filter((entry) => entry.slug && entry.timestamp > 0)
    .sort((a, b) => b.timestamp - a.timestamp);
}

export function getAdjacentArticles(
  section: SectionKey,
  entries: SectionEntry[],
  currentEntryId: string,
) {
  let datedEntries = adjacentArticlesCache.get(section);

  if (!datedEntries) {
    datedEntries = buildDatedEntries(section, entries);
    adjacentArticlesCache.set(section, datedEntries);
  }

  const currentArticleIndex = datedEntries.findIndex(
    (entry) => entry.id === currentEntryId,
  );

  return {
    previousArticle:
      currentArticleIndex > 0 ? datedEntries[currentArticleIndex - 1] : null,
    nextArticle:
      currentArticleIndex >= 0 && currentArticleIndex < datedEntries.length - 1
        ? datedEntries[currentArticleIndex + 1]
        : null,
  };
}
