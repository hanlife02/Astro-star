function stripContentText(source: string) {
  return source
    .replace(/^---[\s\S]*?---\s*/u, " ")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^\s*(import|export)\s.+$/gmu, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/[`*_~>#|-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateText(value: string, maxLength: number) {
  const characters = Array.from(value);
  if (characters.length <= maxLength) return value;

  return `${characters.slice(0, maxLength).join("").trimEnd()}...`;
}

export function resolveContentDescription(
  source: string,
  description?: string,
  fallback = "",
) {
  const normalizedDescription = description?.trim();
  if (normalizedDescription) return normalizedDescription;

  const body = stripContentText(source);
  if (body) return truncateText(body, 160);

  return fallback.trim();
}
