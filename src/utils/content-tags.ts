export type ContentSection = "blog" | "note" | "project";

export interface ContentTag {
  label: string;
  slug: string;
}

export interface ContentTagSource {
  id: string;
  tags?: readonly string[];
}

export interface SectionTag extends ContentTag {
  count: number;
  href: string;
}

interface SectionTagAggregate extends SectionTag {
  sources: string[];
}

function getTagKey(label: string) {
  return label.toLocaleLowerCase("en-US");
}

export function slugifyContentTag(label: string) {
  return label
    .toLocaleLowerCase("en-US")
    .trim()
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function normalizeContentTags(tags?: readonly string[]): ContentTag[] {
  const normalizedTags: ContentTag[] = [];
  const seen = new Set<string>();

  if (!Array.isArray(tags)) return normalizedTags;

  for (const value of tags) {
    if (typeof value !== "string") continue;

    const label = value.trim();
    const key = getTagKey(label);

    if (!label || seen.has(key)) continue;

    seen.add(key);
    normalizedTags.push({ label, slug: slugifyContentTag(label) });
  }

  return normalizedTags;
}

export function getContentTagHref(section: ContentSection, tagSlug: string) {
  return `/${section}/tag/${tagSlug}/`;
}

export function buildSectionTags(
  section: ContentSection,
  entries: readonly ContentTagSource[],
): SectionTag[] {
  const tagsByKey = new Map<string, SectionTagAggregate>();
  const keysBySlug = new Map<string, string>();

  for (const entry of entries) {
    for (const tag of normalizeContentTags(entry.tags)) {
      if (!tag.slug) {
        throw new Error(
          `Invalid content tag in section "${section}": "${tag.label}" from "${entry.id}" cannot produce a route slug.`,
        );
      }

      const key = getTagKey(tag.label);
      const slugOwnerKey = keysBySlug.get(tag.slug);

      if (slugOwnerKey && slugOwnerKey !== key) {
        const slugOwner = tagsByKey.get(slugOwnerKey);
        throw new Error(
          `Tag slug collision in section "${section}" for slug "${tag.slug}": "${slugOwner?.label}" (${slugOwner?.sources.join(", ")}) and "${tag.label}" (${entry.id}).`,
        );
      }

      const existingTag = tagsByKey.get(key);

      if (existingTag) {
        existingTag.count += 1;
        existingTag.sources.push(entry.id);
        continue;
      }

      keysBySlug.set(tag.slug, key);
      tagsByKey.set(key, {
        ...tag,
        count: 1,
        href: getContentTagHref(section, tag.slug),
        sources: [entry.id],
      });
    }
  }

  return Array.from(
    tagsByKey.values(),
    ({ sources: _sources, ...tag }) => tag,
  ).sort(
    (a, b) =>
      b.count - a.count ||
      a.label.localeCompare(b.label, "en-US", { sensitivity: "base" }),
  );
}
