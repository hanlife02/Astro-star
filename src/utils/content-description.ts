export const DEFAULT_CONTENT_DESCRIPTION =
  "The author was forgotten to write the descriptio!";

export function resolveContentDescription(
  _source: string,
  description?: string,
  _fallback = DEFAULT_CONTENT_DESCRIPTION,
) {
  const normalizedDescription = description?.trim();
  if (normalizedDescription) return normalizedDescription;

  return DEFAULT_CONTENT_DESCRIPTION;
}
