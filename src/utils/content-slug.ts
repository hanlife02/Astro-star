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
