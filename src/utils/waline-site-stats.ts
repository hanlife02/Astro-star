import type { GetArticleCounterResponse } from "@waline/api";
import { getWalinePageviewPaths } from "./waline-page-path";

export type WalineSiteStats = { views: number; likes: number };
export type WalineSiteStatsSnapshot = WalineSiteStats & { savedAt: number };
export type WalineSiteStatsPaths = {
  viewPaths: string[];
  articlePaths: string[];
};

const BATCH_SIZE = 40;

export async function collectWalineSiteStats(
  paths: WalineSiteStatsPaths,
  getCounters: (batch: string[]) => Promise<GetArticleCounterResponse>,
): Promise<WalineSiteStats> {
  const articlePaths = new Set(paths.articlePaths);
  const viewPaths = new Set(paths.viewPaths.flatMap(getWalinePageviewPaths));
  const allPaths = [...new Set([...viewPaths, ...articlePaths])];
  const totals: WalineSiteStats = { views: 0, likes: 0 };
  const batches: string[][] = [];

  for (let index = 0; index < allPaths.length; index += BATCH_SIZE) {
    batches.push(allPaths.slice(index, index + BATCH_SIZE));
  }
  await Promise.all(
    batches.map(async (batch) => {
      const counters = await getCounters(batch);
      if (
        counters.length !== batch.length ||
        counters.some((counter) => !counter || typeof counter !== "object")
      ) {
        throw new Error("Waline returned an invalid batch of counters.");
      }
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
