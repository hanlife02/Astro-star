import { getArticleCounter } from "@waline/api";
import { getWalinePageviewPaths } from "../utils/waline-page-path";
import { getConfiguredWalineServerURL } from "./home-shell-waline-config";

type SiteStats = { views: number; likes: number };
type CachedSiteStats = SiteStats & { savedAt: number };

const CACHE_KEY = "astro-star:home-site-stats";
const CACHE_MAX_AGE_MS = 5 * 60 * 1000;
const BATCH_SIZE = 40;
let activeController: AbortController | undefined;

function readCachedSiteStats(): CachedSiteStats | undefined {
  try {
    const value = JSON.parse(
      window.sessionStorage.getItem(CACHE_KEY) ?? "null",
    ) as CachedSiteStats | null;
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

function renderSiteStats(root: HTMLElement, { views, likes }: SiteStats) {
  const viewsElement = root.querySelector("[data-home-total-views]");
  const likesElement = root.querySelector("[data-home-total-likes]");
  if (viewsElement) viewsElement.textContent = views.toLocaleString("en-US");
  if (likesElement) likesElement.textContent = likes.toLocaleString("en-US");
}

async function fetchSiteStats(
  root: HTMLElement,
  serverURL: string,
  signal: AbortSignal,
): Promise<SiteStats> {
  const articlePaths = new Set<string>(
    JSON.parse(root.dataset.articlePaths ?? "[]"),
  );
  const pagePaths: string[] = JSON.parse(root.dataset.viewPaths ?? "[]");
  const viewPaths = new Set(pagePaths.flatMap(getWalinePageviewPaths));
  const paths = [...new Set([...viewPaths, ...articlePaths])];
  const lang = document.documentElement.lang === "zh-CN" ? "zh-CN" : "en";
  const totals: SiteStats = { views: 0, likes: 0 };
  const batches: string[][] = [];

  for (let index = 0; index < paths.length; index += BATCH_SIZE) {
    batches.push(paths.slice(index, index + BATCH_SIZE));
  }
  await Promise.all(
    batches.map(async (batch) => {
      const counters = await getArticleCounter({
        serverURL,
        lang,
        paths: batch,
        type: ["time", "reaction0"],
        signal,
      });
      counters.forEach((counter, offset) => {
        const path = batch[offset];
        if (viewPaths.has(path)) totals.views += Math.max(0, counter.time ?? 0);
        if (articlePaths.has(path)) {
          totals.likes += Math.max(0, counter.reaction0 ?? 0);
        }
      });
    }),
  );
  return totals;
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
  if (cached) renderSiteStats(root, cached);

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
