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
      Number.isFinite(value.homeViews) &&
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

export async function initHomeShellSiteStats(
  pageview: Promise<number | undefined>,
) {
  cleanupHomeShellSiteStats();
  const root = document.querySelector<HTMLElement>("[data-home-site-stats]");
  if (!root) return;

  let snapshot = JSON.parse(
    root.dataset.statsSnapshot ?? "null",
  ) as WalineSiteStatsSnapshot | null;
  const cached = readCachedSiteStats();
  if (cached && cached.savedAt > (snapshot?.savedAt ?? 0)) {
    snapshot = cached;
    renderSiteStats(root, snapshot);
  }

  const controller = new AbortController();
  activeController = controller;
  const { signal } = controller;
  let confirmedHomeViews = 0;

  const publish = (stats: WalineSiteStatsSnapshot) => {
    if (signal.aborted) return;
    // A parallel read may already include this visit.
    const homeViews = Math.max(stats.homeViews, confirmedHomeViews);
    snapshot = {
      ...stats,
      homeViews,
      views: stats.views + (homeViews - stats.homeViews),
    };
    renderSiteStats(root, snapshot);
    try {
      window.sessionStorage.setItem(CACHE_KEY, JSON.stringify(snapshot));
    } catch {
      // The current page still has the fresh values if storage is unavailable.
    }
  };
  void pageview.then(
    (views) => {
      if (typeof views !== "number" || !Number.isFinite(views)) return;
      confirmedHomeViews = views;
      if (snapshot && views > snapshot.homeViews) publish(snapshot);
    },
    () => {
      // The pageview initializer reports write failures.
    },
  );

  const serverURL = await getConfiguredWalineServerURL();
  if (!serverURL || signal.aborted) return;

  try {
    const stats = await fetchSiteStats(root, serverURL, signal);
    publish({ ...stats, savedAt: Date.now() });
  } catch (error) {
    if (signal.aborted) return;
    controller.abort();
    throw error;
  }
}
