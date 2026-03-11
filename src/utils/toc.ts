export interface TocHeading {
  depth: 1 | 2 | 3;
  slug: string;
  text: string;
}

export function slugifyHeading(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[`*_~()[\]{}]/g, "")
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function extractTocHeadings(source: string) {
  const body = source
    .replace(/^---[\s\S]*?---\s*/u, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/^[`~]{3,}.*\n[\s\S]*?^[`~]{3,}\s*$/gmu, "")
    .replace(/^( {4}|\t).*$/gmu, "");
  const slugCounts = new Map<string, number>();

  return Array.from(body.matchAll(/^(#{1,3})\s+(.+)$/gmu)).map((match) => {
    const depth = match[1].length as 1 | 2 | 3;
    const text = match[2]
      .trim()
      .replace(/\*{1,2}(.+?)\*{1,2}/g, "$1")
      .replace(/_{1,2}(.+?)_{1,2}/g, "$1")
      .replace(/~~(.+?)~~/g, "$1")
      .replace(/`(.+?)`/g, "$1");
    const baseSlug = slugifyHeading(text) || "section";
    const currentCount = slugCounts.get(baseSlug) ?? 0;
    slugCounts.set(baseSlug, currentCount + 1);

    return {
      depth,
      slug: currentCount === 0 ? baseSlug : `${baseSlug}-${currentCount}`,
      text,
    } satisfies TocHeading;
  });
}
