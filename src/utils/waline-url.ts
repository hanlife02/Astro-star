export function normalizeWalineServerURL(serverURL: string) {
  const url = serverURL.trim();
  return url && !/^(?:https?:)?\/\//i.test(url) ? `https://${url}` : url;
}
