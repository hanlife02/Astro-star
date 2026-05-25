import { getConfiguredWalineServerURL } from "./home-shell-waline";

type WalineCounterModule = Pick<
  typeof import("@waline/client"),
  "getArticleCounter" | "updateArticleCounter"
>;

type HomeShellArticleActionsWindow = Window & {
  __homeShellArticleActionsCleanup?: () => void;
  __homeShellArticleActionsRunId?: number;
};

const LIKE_COUNTER_TYPE = "reaction0";
let walineCounterModule: Promise<WalineCounterModule> | undefined;

function loadWalineCounterModule() {
  walineCounterModule ??= import("@waline/client");
  return walineCounterModule;
}

function getWalineLang() {
  return document.documentElement.lang === "zh-CN" ? "zh-CN" : "en";
}

function getLikeStorageKey(path: string) {
  return `astro-star:article-like:${LIKE_COUNTER_TYPE}:${path}`;
}

function getStoredLike(storageKey: string) {
  try {
    return window.localStorage.getItem(storageKey) === "1";
  } catch {
    return false;
  }
}

function setStoredLike(storageKey: string, liked: boolean) {
  try {
    if (liked) {
      window.localStorage.setItem(storageKey, "1");
    } else {
      window.localStorage.removeItem(storageKey);
    }
  } catch {
    // Storage can be unavailable in private or restricted browsing contexts.
  }
}

function formatLikeCount(count: number | null) {
  return count === null ? "—" : count.toLocaleString("en-US");
}

function cleanupCallbacks(callbacks: Array<() => void>) {
  callbacks.forEach((callback) => {
    try {
      callback();
    } catch (error) {
      console.warn("[ArticleActions] Failed to cleanup callback.", error);
    }
  });
}

function setLikeUnavailable(
  button: HTMLButtonElement,
  countElement: HTMLElement,
) {
  button.disabled = true;
  button.setAttribute("aria-label", "点赞暂不可用");
  button.setAttribute("aria-pressed", "false");
  button.title = "点赞暂不可用";
  delete button.dataset.articleLikeReady;
  countElement.textContent = "—";
}

function initArticleLike(root: HTMLElement, runId: number) {
  const browserWindow = window as HomeShellArticleActionsWindow;
  const button = root.querySelector("[data-article-like]");
  const countElement = root.querySelector("[data-article-like-count]");
  const path = root.getAttribute("data-waline-path")?.trim() ?? "";

  if (!(button instanceof HTMLButtonElement)) return () => {};
  if (!(countElement instanceof HTMLElement)) return () => {};
  if (!path) {
    setLikeUnavailable(button, countElement);
    return () => {};
  }

  const storageKey = getLikeStorageKey(path);
  const abortController = new AbortController();
  let disposed = false;
  let available = false;
  let pending = false;
  let liked = getStoredLike(storageKey);
  let count: number | null = null;
  let removeClickListener = () => {};

  const render = () => {
    button.disabled = !available || pending;
    button.setAttribute("aria-pressed", liked ? "true" : "false");
    button.dataset.articleLikeReady = available ? "true" : "false";
    countElement.textContent = formatLikeCount(count);

    if (!available) {
      button.setAttribute("aria-label", "点赞暂不可用");
      button.title = "点赞暂不可用";
      return;
    }

    const actionLabel = liked ? "取消点赞" : "点赞";
    button.setAttribute(
      "aria-label",
      `${actionLabel}，当前 ${formatLikeCount(count)} 个赞`,
    );
    button.title = actionLabel;
  };

  render();

  void (async () => {
    let serverURL =
      root.getAttribute("data-waline-server-url")?.trim() ||
      (await getConfiguredWalineServerURL());

    if (
      disposed ||
      browserWindow.__homeShellArticleActionsRunId !== runId ||
      !serverURL
    ) {
      setLikeUnavailable(button, countElement);
      return;
    }

    try {
      const { getArticleCounter, updateArticleCounter } =
        await loadWalineCounterModule();

      if (disposed || browserWindow.__homeShellArticleActionsRunId !== runId) {
        return;
      }

      const counters = await getArticleCounter({
        serverURL,
        lang: getWalineLang(),
        paths: [path],
        type: [LIKE_COUNTER_TYPE],
        signal: abortController.signal,
      });

      if (disposed || browserWindow.__homeShellArticleActionsRunId !== runId) {
        return;
      }

      count = Math.max(0, counters[0]?.[LIKE_COUNTER_TYPE] ?? 0);
      available = true;
      render();

      const clickListener = async () => {
        if (!available || pending) return;

        const previousLiked = liked;
        const previousCount = count ?? 0;
        liked = !liked;
        count = Math.max(0, previousCount + (liked ? 1 : -1));
        pending = true;
        render();

        try {
          const updatedCounters = await updateArticleCounter({
            serverURL,
            lang: getWalineLang(),
            path,
            type: LIKE_COUNTER_TYPE,
            action: liked ? "inc" : "desc",
          });

          if (
            disposed ||
            browserWindow.__homeShellArticleActionsRunId !== runId
          ) {
            return;
          }

          const updatedCount = updatedCounters[0]?.[LIKE_COUNTER_TYPE];
          if (typeof updatedCount === "number") {
            count = Math.max(0, updatedCount);
          }
          setStoredLike(storageKey, liked);
          pending = false;
          render();
        } catch (error) {
          liked = previousLiked;
          count = previousCount;
          pending = false;
          available = false;
          render();
          console.warn("[ArticleActions] Failed to update like count.", error);
        }
      };

      button.addEventListener("click", clickListener);
      removeClickListener = () =>
        button.removeEventListener("click", clickListener);
    } catch (error) {
      if (abortController.signal.aborted) return;

      available = false;
      render();
      console.warn("[ArticleActions] Failed to load like count.", error);
    }
  })();

  return () => {
    disposed = true;
    abortController.abort();
    removeClickListener();
  };
}

export function cleanupHomeShellArticleActions() {
  const browserWindow = window as HomeShellArticleActionsWindow;
  browserWindow.__homeShellArticleActionsRunId =
    (browserWindow.__homeShellArticleActionsRunId ?? 0) + 1;
  const cleanup = browserWindow.__homeShellArticleActionsCleanup;
  browserWindow.__homeShellArticleActionsCleanup = undefined;

  cleanup?.();
}

export function initHomeShellArticleActions() {
  const browserWindow = window as HomeShellArticleActionsWindow;
  cleanupHomeShellArticleActions();
  const runId = (browserWindow.__homeShellArticleActionsRunId ?? 0) + 1;
  browserWindow.__homeShellArticleActionsRunId = runId;

  const roots = Array.from(
    document.querySelectorAll<HTMLElement>("[data-article-actions]"),
  );

  if (roots.length === 0) {
    browserWindow.__homeShellArticleActionsCleanup = undefined;
    return;
  }

  const cleanups = roots.map((root) => initArticleLike(root, runId));

  browserWindow.__homeShellArticleActionsCleanup = () => {
    cleanupCallbacks(cleanups);
  };
}
