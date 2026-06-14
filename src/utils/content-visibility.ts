export interface ContentVisibilityFrontmatter {
  published?: boolean;
}

export function isPublishedFrontmatter(
  frontmatter: ContentVisibilityFrontmatter | undefined,
) {
  return frontmatter?.published !== false;
}

export function isPublishedContentEntry<
  T extends { data: ContentVisibilityFrontmatter },
>(entry: T) {
  return isPublishedFrontmatter(entry.data);
}
