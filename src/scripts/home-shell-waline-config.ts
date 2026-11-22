let configuredServerURL: Promise<string> | undefined;

export function normalizeWalineServerURL(serverURL: string) {
  const url = serverURL.trim();
  return url && !/^(?:https?:)?\/\//i.test(url) ? `https://${url}` : url;
}

export function getConfiguredWalineServerURL() {
  configuredServerURL ??= fetch("/api/waline-config.json", {
    credentials: "same-origin",
  })
    .then((response) => (response.ok ? response.json() : null))
    .then((payload: { serverURL?: unknown } | null) =>
      typeof payload?.serverURL === "string"
        ? normalizeWalineServerURL(payload.serverURL)
        : "",
    )
    .catch(() => "");

  return configuredServerURL;
}
