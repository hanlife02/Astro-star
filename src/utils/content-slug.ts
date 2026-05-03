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
