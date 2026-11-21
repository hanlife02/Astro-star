import { getPageview, updatePageview } from "@waline/api";
import { getWalinePageviewPaths } from "../utils/waline-page-path";
import { getConfiguredWalineServerURL } from "./home-shell-waline-config";

let activeController: AbortController | undefined;

export function cleanupHomeShellWalinePageviews() {
  activeController?.abort();
  activeController = undefined;
}

export async function initHomeShellWalinePageviews() {
  cleanupHomeShellWalinePageviews();
  const path = document.documentElement.dataset.walinePagePath;
  if (!path) return;

  const { signal } = (activeController = new AbortController());
  const pageviewElement = document.querySelector<HTMLElement>(
    ".waline-pageview-count",
  );
  const siteStats = document.querySelector<HTMLElement>(
    "[data-home-site-stats]",
  );
  const lang = document.documentElement.lang === "zh-CN" ? "zh-CN" : "en";
  const configuredURL =
    pageviewElement?.dataset.serverUrl?.trim() ||
    (await getConfiguredWalineServerURL());
  if (!configuredURL) return;

  const serverURL = /^(?:https?:)?\/\//i.test(configuredURL)
    ? configuredURL
    : `https://${configuredURL}`;

  // The visit occurred even if Astro swaps out the page before the write finishes.
  await updatePageview({ serverURL, lang, path }).catch((error) => {
    console.warn("[Waline] Failed to record a pageview.", error);
  });

  if (signal.aborted) return;
  try {
    if (siteStats) {
      const { initHomeShellSiteStats } =
        await import("./home-shell-site-stats");
      await initHomeShellSiteStats(siteStats, serverURL, lang, signal);
    }
    if (pageviewElement) {
      const counters = await getPageview({
        serverURL,
        lang,
        paths: getWalinePageviewPaths(path),
        signal,
      });
      if (!signal.aborted) {
        const views = counters.reduce(
          (total, counter) => total + Math.max(0, counter.time ?? 0),
          0,
        );
        pageviewElement.textContent = String(views);
      }
    }
  } catch (error) {
    if (!signal.aborted) throw error;
  }
}
