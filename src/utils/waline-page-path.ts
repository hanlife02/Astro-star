export function normalizeWalinePagePath(pathname: string) {
  const path = new URL(pathname, "https://example.invalid").pathname;
  return `${path.replace(/\/+$/, "").replaceAll(",", "%2C")}/`;
}

export function getWalinePageviewPaths(path: string) {
  // Older versions used location.pathname and could store both forms.
  return path === "/" ? [path] : [path, path.slice(0, -1)];
}
