import { getPageview, updatePageview } from "@waline/api";
import { getWalinePageviewPaths } from "../utils/waline-page-path";
import {
  getConfiguredWalineServerURL,
  normalizeWalineServerURL,
} from "./home-shell-waline-config";

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
  const lang = document.documentElement.lang === "zh-CN" ? "zh-CN" : "en";
  const serverURL =
    normalizeWalineServerURL(pageviewElement?.dataset.serverUrl ?? "") ||
    (await getConfiguredWalineServerURL());
  if (!serverURL) return;

  // The visit occurred even if Astro swaps out the page before the write finishes.
  await updatePageview({ serverURL, lang, path }).catch((error) => {
    console.warn("[Waline] Failed to record a pageview.", error);
  });

  if (signal.aborted || !pageviewElement) return;
  try {
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
  } catch (error) {
    if (!signal.aborted) throw error;
  }
}
