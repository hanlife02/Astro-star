import type { WalineAbort, WalineInstance } from "@waline/client";

type HomeShellWalineWindow = Window & {
  __homeShellWalineConfigPromise?: Promise<string>;
  __homeShellWalineCommentsCleanup?: () => void;
  __homeShellWalineCommentsRunId?: number;
  __homeShellWalinePageviewCleanup?: () => void;
  __homeShellWalinePageviewRunId?: number;
};

let walineClientModule: Promise<typeof import("@waline/client")> | undefined;
let walinePageviewModule:
  | Promise<typeof import("@waline/client/pageview")>
  | undefined;
let walineCommentModule:
  | Promise<typeof import("@waline/client/comment")>
  | undefined;

function loadWalineClientModule() {
  walineClientModule ??= import("@waline/client");
  return walineClientModule;
}

function loadWalinePageviewModule() {
  walinePageviewModule ??= import("@waline/client/pageview");
  return walinePageviewModule;
}

function loadWalineCommentModule() {
  walineCommentModule ??= import("@waline/client/comment");
  return walineCommentModule;
}

export function cleanupHomeShellWalineComments() {
  const browserWindow = window as HomeShellWalineWindow;
  browserWindow.__homeShellWalineCommentsRunId =
    (browserWindow.__homeShellWalineCommentsRunId ?? 0) + 1;
  const cleanup = browserWindow.__homeShellWalineCommentsCleanup;
  browserWindow.__homeShellWalineCommentsCleanup = undefined;

  if (!cleanup) return;

  try {
    cleanup();
  } catch (error) {
    console.warn(
      "[Waline] Failed to cleanup previous comments instance.",
      error,
    );
  }
}

export function cleanupHomeShellWalinePageviews() {
  const browserWindow = window as HomeShellWalineWindow;
  browserWindow.__homeShellWalinePageviewRunId =
    (browserWindow.__homeShellWalinePageviewRunId ?? 0) + 1;
  const cleanup = browserWindow.__homeShellWalinePageviewCleanup;
  browserWindow.__homeShellWalinePageviewCleanup = undefined;

  if (!cleanup) return;

  try {
    cleanup();
  } catch (error) {
    console.warn("[Waline] Failed to cleanup previous pageviews.", error);
  }
}

function getConfiguredWalineServerURL() {
  const browserWindow = window as HomeShellWalineWindow;

  if (!browserWindow.__homeShellWalineConfigPromise) {
    browserWindow.__homeShellWalineConfigPromise = fetch(
      "/api/waline-config.json",
      {
        credentials: "same-origin",
      },
    )
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { serverURL?: unknown } | null) =>
        typeof payload?.serverURL === "string" ? payload.serverURL.trim() : "",
      )
      .catch(() => "");
  }

  return browserWindow.__homeShellWalineConfigPromise;
}

export async function initHomeShellWalineComments() {
  const browserWindow = window as HomeShellWalineWindow;
  cleanupHomeShellWalineComments();
  const runId = (browserWindow.__homeShellWalineCommentsRunId ?? 0) + 1;
  browserWindow.__homeShellWalineCommentsRunId = runId;

  const walineRoots = Array.from(
    document.querySelectorAll("[data-article-waline]"),
  );
  if (walineRoots.length === 0) {
    browserWindow.__homeShellWalineCommentsCleanup = undefined;
    return;
  }

  const { init } = await loadWalineClientModule();
  if (browserWindow.__homeShellWalineCommentsRunId !== runId) return;

  const needsConfiguredServerURL = walineRoots.some(
    (walineRoot) => !walineRoot.getAttribute("data-waline-server-url")?.trim(),
  );
  const configuredServerURL = needsConfiguredServerURL
    ? await getConfiguredWalineServerURL()
    : "";
  if (browserWindow.__homeShellWalineCommentsRunId !== runId) return;

  const instances: WalineInstance[] = [];

  walineRoots.forEach((walineRoot) => {
    const walineThread = walineRoot.querySelector("[data-waline-thread]");
    const serverURL =
      walineRoot.getAttribute("data-waline-server-url")?.trim() ||
      configuredServerURL;
    const path = walineRoot.getAttribute("data-waline-path")?.trim();
    const lang = document.documentElement.lang === "zh-CN" ? "zh-CN" : "en";

    if (!serverURL) {
      console.warn("[Waline] WALINE_SERVER_URL is not configured.");
      return;
    }

    if (!(walineThread instanceof HTMLElement) || !path) {
      return;
    }

    const instance = init({
      el: walineThread,
      serverURL,
      path,
      lang,
      pageview: false,
    });

    if (instance) {
      instances.push(instance);
    }
  });

  browserWindow.__homeShellWalineCommentsCleanup = () => {
    instances.forEach((instance) => {
      try {
        instance.destroy();
      } catch (error) {
        console.warn("[Waline] Failed to destroy comments instance.", error);
      }
    });
  };
}

export async function initHomeShellWalinePageviews() {
  const browserWindow = window as HomeShellWalineWindow;
  cleanupHomeShellWalinePageviews();
  const runId = (browserWindow.__homeShellWalinePageviewRunId ?? 0) + 1;
  browserWindow.__homeShellWalinePageviewRunId = runId;

  const pageviewElement = document.querySelector(".waline-pageview-count");
  const commentElement = document.querySelector(".waline-comment-count");
  let serverURL =
    pageviewElement?.getAttribute("data-server-url")?.trim() ||
    commentElement?.getAttribute("data-server-url")?.trim();

  if (
    !(pageviewElement instanceof HTMLElement) &&
    !(commentElement instanceof HTMLElement)
  ) {
    browserWindow.__homeShellWalinePageviewCleanup = undefined;
    return;
  }

  if (!serverURL) {
    serverURL = await getConfiguredWalineServerURL();
  }

  if (!serverURL) {
    browserWindow.__homeShellWalinePageviewCleanup = undefined;
    return;
  }

  const [{ pageviewCount }, { commentCount }] = await Promise.all([
    loadWalinePageviewModule(),
    loadWalineCommentModule(),
  ]);
  if (browserWindow.__homeShellWalinePageviewRunId !== runId) return;

  const aborts: WalineAbort[] = [];

  if (pageviewElement instanceof HTMLElement) {
    aborts.push(pageviewCount({ serverURL, update: true }));
  }

  if (commentElement instanceof HTMLElement) {
    aborts.push(commentCount({ serverURL }));
  }

  browserWindow.__homeShellWalinePageviewCleanup = () => {
    aborts.forEach((abort) => {
      abort();
    });
  };
}
