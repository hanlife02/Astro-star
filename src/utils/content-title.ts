export function getContentTitleFromPath(path: string) {
  return (
    path
      .split("/")
      .pop()
      ?.replace(/\.(md|mdx)$/i, "")
      ?.replace(/__\d+$/i, "")
      .trim() || "Untitled"
  );
}

export function resolveContentTitle(path: string, title?: string) {
  const normalizedTitle = title?.trim();
  return normalizedTitle || getContentTitleFromPath(path);
}
