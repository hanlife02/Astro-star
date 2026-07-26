function normalizeSlug(value?: unknown) {
  if (typeof value !== "string" && typeof value !== "number") {
    return "";
  }

  const slug =
    String(value)
      .trim()
      .replace(/^\/+|\/+$/g, "") || "";
  return slug.includes("/") ? "" : slug;
}

export function getContentSlugFromPath(path: string) {
  return (
    path
      .split("/")
      .pop()
      ?.replace(/\.(md|mdx)$/i, "")
      ?.trim() || "untitled"
  );
}

export function normalizeArchiveSlug(value?: unknown) {
  return normalizeSlug(value);
}

export function slugifyCategoryLabel(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[`*_~()[\]{}]/g, "")
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function getArchiveSlugFromPath(path: string, section?: string) {
  const sectionPattern = section
    ? section.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    : "(?:blog|note|project)";
  const match = path.match(
    new RegExp(`content/${sectionPattern}/([^/]+)/[^/]+\\.(md|mdx)$`, "i"),
  );

  return normalizeSlug(match?.[1]);
}

export function resolveContentSlug(path: string, slug?: unknown) {
  return normalizeSlug(slug) || getContentSlugFromPath(path);
}

export function assertUniqueContentSlugs(
  section: string,
  entries: { id: string; data: { routeSlug?: unknown } }[],
) {
  const entryIdsBySlug = new Map<string, string[]>();

  for (const entry of entries) {
    const slug = resolveContentSlug(entry.id, entry.data.routeSlug);
    entryIdsBySlug.set(slug, [...(entryIdsBySlug.get(slug) ?? []), entry.id]);
  }

  const conflicts = [...entryIdsBySlug.entries()].filter(
    ([, entryIds]) => entryIds.length > 1,
  );

  if (conflicts.length > 0) {
    const details = conflicts
      .map(
        ([slug, entryIds]) => `/${section}/${slug}/ <- ${entryIds.join(", ")}`,
      )
      .join("; ");
    throw new Error(
      `Duplicate content slugs in "${section}" collection would silently override each other: ${details}. Rename the files or set a unique routeSlug in frontmatter.`,
    );
  }
}
