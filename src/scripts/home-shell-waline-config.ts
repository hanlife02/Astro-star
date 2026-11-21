let configuredServerURL: Promise<string> | undefined;

export function getConfiguredWalineServerURL() {
  configuredServerURL ??= fetch("/api/waline-config.json", {
    credentials: "same-origin",
  })
    .then((response) => (response.ok ? response.json() : null))
    .then((payload: { serverURL?: unknown } | null) =>
      typeof payload?.serverURL === "string" ? payload.serverURL.trim() : "",
    )
    .catch(() => "");

  return configuredServerURL;
}
