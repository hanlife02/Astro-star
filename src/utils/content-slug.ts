function normalizeSlug(value?: unknown) {
  if (typeof value !== "string" && typeof value !== "number") {
    return "";
  }

  const slug = String(value).trim().replace(/^\/+|\/+$/g, "") || "";
  return slug.includes("/") ? "" : slug;
}

export function getContentSlugFromPath(path: string) {
  return path.split("/").pop()?.replace(/\.(md|mdx)$/i, "")?.trim() || "untitled";
}

export function resolveContentSlug(path: string, slug?: unknown) {
  return normalizeSlug(slug) || getContentSlugFromPath(path);
}
