import type { WalineAbort, WalineInstance } from "@waline/client";

type HomeShellWalineWindow = Window & {
  __homeShellWalineCommentsCleanup?: () => void;
  __homeShellWalineCommentsRunId?: number;
  __homeShellWalinePageviewCleanup?: () => void;
  __homeShellWalinePageviewRunId?: number;
};

const walineClientModule = import("@waline/client");
const walinePageviewModule = import("@waline/client/pageview");

export async function initHomeShellWalineComments() {
  const browserWindow = window as HomeShellWalineWindow;
  browserWindow.__homeShellWalineCommentsCleanup?.();
  const runId = (browserWindow.__homeShellWalineCommentsRunId ?? 0) + 1;
  browserWindow.__homeShellWalineCommentsRunId = runId;

  const walineRoots = Array.from(
    document.querySelectorAll("[data-article-waline]"),
  );
  if (walineRoots.length === 0) {
    browserWindow.__homeShellWalineCommentsCleanup = undefined;
    return;
  }

  const { init } = await walineClientModule;
  if (browserWindow.__homeShellWalineCommentsRunId !== runId) return;

  const instances: WalineInstance[] = [];

  walineRoots.forEach((walineRoot) => {
    const walineThread = walineRoot.querySelector("[data-waline-thread]");
    const serverURL = walineRoot.getAttribute("data-waline-server-url")?.trim();
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
      instance.destroy();
    });
  };
}

export async function initHomeShellWalinePageviews() {
  const browserWindow = window as HomeShellWalineWindow;
  browserWindow.__homeShellWalinePageviewCleanup?.();
  const runId = (browserWindow.__homeShellWalinePageviewRunId ?? 0) + 1;
  browserWindow.__homeShellWalinePageviewRunId = runId;

  const pageviewElement = document.querySelector(".waline-pageview-count");
  const serverURL = pageviewElement?.getAttribute("data-server-url")?.trim();

  if (!(pageviewElement instanceof HTMLElement) || !serverURL) {
    browserWindow.__homeShellWalinePageviewCleanup = undefined;
    return;
  }

  const { pageviewCount } = await walinePageviewModule;
  if (browserWindow.__homeShellWalinePageviewRunId !== runId) return;

  const abort: WalineAbort = pageviewCount({ serverURL, update: true });

  browserWindow.__homeShellWalinePageviewCleanup = () => {
    abort();
  };
}
