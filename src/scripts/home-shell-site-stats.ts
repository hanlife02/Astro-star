import { getArticleCounter } from "@waline/api";
import { getWalinePageviewPaths } from "../utils/waline-page-path";

export async function initHomeShellSiteStats(
  root: HTMLElement,
  serverURL: string,
  lang: string,
  signal: AbortSignal,
) {
  const articlePaths = new Set<string>(
    JSON.parse(root.dataset.articlePaths ?? "[]"),
  );
  const pagePaths: string[] = JSON.parse(root.dataset.viewPaths ?? "[]");
  const viewPaths = new Set(pagePaths.flatMap(getWalinePageviewPaths));
  const paths = [...new Set([...viewPaths, ...articlePaths])];
  let views = 0;
  let likes = 0;

  for (let index = 0; index < paths.length; index += 40) {
    if (signal.aborted) return;
    const batch = paths.slice(index, index + 40);
    const counters = await getArticleCounter({
      serverURL,
      lang,
      paths: batch,
      type: ["time", "reaction0"],
      signal,
    });
    counters.forEach((counter, offset) => {
      const path = batch[offset];
      if (viewPaths.has(path)) views += Math.max(0, counter.time ?? 0);
      if (articlePaths.has(path)) likes += Math.max(0, counter.reaction0 ?? 0);
    });
  }

  if (signal.aborted) return;
  const viewsElement = root.querySelector("[data-home-total-views]");
  const likesElement = root.querySelector("[data-home-total-likes]");
  if (viewsElement) viewsElement.textContent = views.toLocaleString("en-US");
  if (likesElement) likesElement.textContent = likes.toLocaleString("en-US");
}
