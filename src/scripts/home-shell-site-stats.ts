import { getArticleCounter } from "@waline/api";
import {
  collectWalineSiteStats,
  type WalineSiteStats,
  type WalineSiteStatsSnapshot,
} from "../utils/waline-site-stats";
import { getConfiguredWalineServerURL } from "./home-shell-waline-config";

const CACHE_KEY = "astro-star:home-site-stats";
const CACHE_MAX_AGE_MS = 5 * 60 * 1000;
let activeController: AbortController | undefined;

function readCachedSiteStats(): WalineSiteStatsSnapshot | undefined {
  try {
    const value = JSON.parse(
      window.sessionStorage.getItem(CACHE_KEY) ?? "null",
    ) as WalineSiteStatsSnapshot | null;
    if (
      value &&
      Number.isFinite(value.views) &&
      Number.isFinite(value.likes) &&
      value.savedAt > Date.now() - CACHE_MAX_AGE_MS
    ) {
      return value;
    }
  } catch {
    // Storage can be disabled or contain an outdated value.
  }
}

function renderSiteStats(root: HTMLElement, { views, likes }: WalineSiteStats) {
  const viewsElement = root.querySelector("[data-home-total-views]");
  const likesElement = root.querySelector("[data-home-total-likes]");
  if (viewsElement) viewsElement.textContent = views.toLocaleString("en-US");
  if (likesElement) likesElement.textContent = likes.toLocaleString("en-US");
}

async function fetchSiteStats(
  root: HTMLElement,
  serverURL: string,
  signal: AbortSignal,
) {
  const lang = document.documentElement.lang === "zh-CN" ? "zh-CN" : "en";
  return collectWalineSiteStats(
    {
      viewPaths: JSON.parse(root.dataset.viewPaths ?? "[]"),
      articlePaths: JSON.parse(root.dataset.articlePaths ?? "[]"),
    },
    (paths) =>
      getArticleCounter({
        serverURL,
        lang,
        paths,
        type: ["time", "reaction0"],
        signal,
      }),
  );
}

export function cleanupHomeShellSiteStats() {
  activeController?.abort();
  activeController = undefined;
}

export async function initHomeShellSiteStats() {
  cleanupHomeShellSiteStats();
  const root = document.querySelector<HTMLElement>("[data-home-site-stats]");
  if (!root) return;

  const cached = readCachedSiteStats();
  if (cached && cached.savedAt > Number(root.dataset.statsSavedAt ?? 0)) {
    renderSiteStats(root, cached);
  }

  const controller = new AbortController();
  activeController = controller;
  const { signal } = controller;
  const serverURL = await getConfiguredWalineServerURL();
  if (!serverURL || signal.aborted) return;

  try {
    const stats = await fetchSiteStats(root, serverURL, signal);
    if (signal.aborted) return;
    renderSiteStats(root, stats);
    try {
      window.sessionStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ ...stats, savedAt: Date.now() }),
      );
    } catch {
      // The current page still has the fresh values if storage is unavailable.
    }
  } catch (error) {
    if (signal.aborted) return;
    controller.abort();
    throw error;
  }
}
