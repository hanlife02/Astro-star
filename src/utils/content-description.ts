export const DEFAULT_CONTENT_DESCRIPTION = "A personal site article.";

const DESCRIPTION_MAX_LENGTH = 160;

function normalizeDescription(value?: string) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function truncateDescription(description: string) {
  if (description.length <= DESCRIPTION_MAX_LENGTH) return description;

  return `${description.slice(0, DESCRIPTION_MAX_LENGTH - 3).trimEnd()}...`;
}

function extractDescriptionFromSource(source: string) {
  return normalizeDescription(
    source
      .replace(/^---[\s\S]*?---\s*/u, "\n")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/~~~[\s\S]*?~~~/g, " ")
      .replace(/^\s*(?:import|export)\s.+$/gm, " ")
      .replace(/`[^`]*`/g, " ")
      .replace(/!\[[^\]]*]\([^)]+\)/g, " ")
      .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
      .replace(/<[^>]+>/g, " ")
      .replace(/^\s*#{1,6}\s+.*$/gm, " ")
      .replace(/^>\s?/gm, "")
      .replace(/^\s*[-*+]\s+/gm, "")
      .replace(/^\s*\d+[.)]\s+/gm, "")
      .replace(/[*_~]/g, " "),
  );
}

export function resolveContentDescription(
  source: string,
  description?: string,
  fallback = DEFAULT_CONTENT_DESCRIPTION,
) {
  const normalizedDescription = normalizeDescription(description);
  if (normalizedDescription) return truncateDescription(normalizedDescription);

  const sourceDescription = extractDescriptionFromSource(source);
  if (sourceDescription) return truncateDescription(sourceDescription);

  const fallbackDescription = normalizeDescription(fallback);
  if (fallbackDescription) return truncateDescription(fallbackDescription);

  return DEFAULT_CONTENT_DESCRIPTION;
}
