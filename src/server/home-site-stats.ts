import type { GetArticleCounterResponse } from "@waline/api";
import { getWalineServerURL } from "../utils/waline-server-url";
import {
  collectWalineSiteStats,
  type WalineSiteStatsPaths,
  type WalineSiteStatsSnapshot,
} from "../utils/waline-site-stats";
import { normalizeWalineServerURL } from "../utils/waline-url";

const REQUEST_TIMEOUT_MS = 4_000;

export async function loadHomeSiteStatsSnapshot(
  siteURL: string,
  paths: WalineSiteStatsPaths,
): Promise<WalineSiteStatsSnapshot | undefined> {
  const serverURL = normalizeWalineServerURL(getWalineServerURL());
  if (!serverURL) return;

  try {
    const origin = new URL(siteURL).origin;
    const endpoint = new URL(serverURL, origin);
    endpoint.pathname = `${endpoint.pathname.replace(/\/+$/, "")}/api/article`;
    const signal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
    const stats = await collectWalineSiteStats(paths, async (batch) => {
      const url = new URL(endpoint);
      url.search = new URLSearchParams({
        path: batch.join(","),
        type: "time,reaction0",
        lang: "en",
      }).toString();
      const response = await fetch(url, {
        headers: { Origin: origin },
        signal,
      });
      if (!response.ok) {
        throw new Error(`Waline returned HTTP ${response.status}.`);
      }
      const payload = (await response.json()) as {
        errno?: number;
        data?: GetArticleCounterResponse;
      };
      if (payload.errno || !Array.isArray(payload.data)) {
        throw new Error("Waline returned an invalid counter response.");
      }
      return payload.data;
    });
    return { ...stats, savedAt: Date.now() };
  } catch {
    console.warn(
      "[SiteStats] Could not load the homepage counters during build.",
    );
  }
}
