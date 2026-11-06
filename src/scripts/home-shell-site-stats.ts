import { getConfiguredWalineServerURL } from "./home-shell-waline";

let activeController: AbortController | undefined;

export function cleanupHomeShellSiteStats() {
  activeController?.abort();
  activeController = undefined;
}

export async function initHomeShellSiteStats() {
  cleanupHomeShellSiteStats();
  const root = document.querySelector<HTMLElement>("[data-home-site-stats]");
  if (!root) return;

  const controller = new AbortController();
  activeController = controller;
  const { signal } = controller;

  try {
    const paths: string[] = JSON.parse(root.dataset.articlePaths ?? "[]");
    const serverURL = await getConfiguredWalineServerURL();
    if (!serverURL || signal.aborted || paths.length === 0) return;

    const { getArticleCounter } = await import("@waline/client");
    let views = 0;
    let likes = 0;
    for (let index = 0; index < paths.length; index += 40) {
      if (signal.aborted) return;
      const counters = await getArticleCounter({
        serverURL,
        lang: document.documentElement.lang === "zh-CN" ? "zh-CN" : "en",
        paths: paths.slice(index, index + 40),
        type: ["time", "reaction0"],
        signal,
      });
      for (const counter of counters) {
        views += Math.max(0, counter.time ?? 0);
        likes += Math.max(0, counter.reaction0 ?? 0);
      }
    }

    if (signal.aborted) return;
    const viewsElement = root.querySelector("[data-home-total-views]");
    const likesElement = root.querySelector("[data-home-total-likes]");
    if (viewsElement) viewsElement.textContent = views.toLocaleString("en-US");
    if (likesElement) likesElement.textContent = likes.toLocaleString("en-US");
  } catch (error) {
    if (!signal.aborted) {
      console.warn("[SiteStats] Failed to load article counters.", error);
    }
  }
}
