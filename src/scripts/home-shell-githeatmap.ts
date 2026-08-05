import { decodeGitHeatmapPayload } from "../utils/githeatmap-payload.mjs";

const GRID_SELECTOR = "[data-githeatmap-grid]";
const GRID_ROOT_MARGIN = "160px 0px";
const IDLE_TIMEOUT = 600;
const VISIBILITY_TIMEOUT = 1200;

type IdleWindow = Window &
  typeof globalThis & {
    cancelIdleCallback?: (handle: number) => void;
    requestIdleCallback?: (
      callback: IdleRequestCallback,
      options?: IdleRequestOptions,
    ) => number;
  };

let activeController: AbortController | undefined;

function materializeHeatmap(grid: HTMLElement) {
  if (grid.dataset.githeatmapMaterialized === "true") return;

  const cells = decodeGitHeatmapPayload({
    calendarStart: grid.dataset.githeatmapCalendarStart ?? "",
    counts: grid.dataset.githeatmapCounts ?? "",
    levels: grid.dataset.githeatmapLevels ?? "",
  });

  if (cells.length === 0) {
    grid.dataset.githeatmapMaterialized = "error";
    grid.setAttribute("aria-busy", "false");
    return;
  }

  const fragment = document.createDocumentFragment();
  const weekCount = Math.ceil(cells.length / 7);

  for (let weekIndex = 0; weekIndex < weekCount; weekIndex += 1) {
    const week = document.createElement("span");
    week.className = "githeatmap-week";
    week.style.setProperty("--githeatmap-hover-delay", `${weekIndex * 10}ms`);

    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const index = weekIndex * 7 + dayIndex;
      if (index >= cells.length) break;

      const data = cells[index];
      const cell = document.createElement("span");

      cell.className = "githeatmap-cell";
      cell.dataset.level = String(data.level);

      if (data.blank) {
        cell.dataset.blank = "true";
      } else {
        cell.title = data.label;
      }

      week.append(cell);
    }

    fragment.append(week);
  }

  grid.replaceChildren(fragment);
  grid.dataset.githeatmapMaterialized = "true";
  grid.setAttribute("aria-busy", "false");
}

function scheduleMaterialization(grid: HTMLElement, signal: AbortSignal) {
  const browserWindow = window as IdleWindow;
  let idleHandle: number | undefined;

  const cancel = () => {
    if (idleHandle !== undefined) {
      browserWindow.cancelIdleCallback?.(idleHandle);
    }
    window.clearTimeout(idleFallback);
  };
  const run = () => {
    cancel();
    if (!signal.aborted) materializeHeatmap(grid);
  };
  const idleFallback = window.setTimeout(run, IDLE_TIMEOUT);

  if (browserWindow.requestIdleCallback) {
    idleHandle = browserWindow.requestIdleCallback(run, {
      timeout: IDLE_TIMEOUT,
    });
  }

  signal.addEventListener("abort", cancel, { once: true });
}

function observeHeatmap(grid: HTMLElement, signal: AbortSignal) {
  if (!("IntersectionObserver" in window)) {
    scheduleMaterialization(grid, signal);
    return;
  }

  const schedule = () => {
    observer.disconnect();
    window.clearTimeout(visibilityFallback);
    scheduleMaterialization(grid, signal);
  };
  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      schedule();
    },
    { rootMargin: GRID_ROOT_MARGIN },
  );
  const visibilityFallback = window.setTimeout(schedule, VISIBILITY_TIMEOUT);

  observer.observe(grid);
  signal.addEventListener(
    "abort",
    () => {
      observer.disconnect();
      window.clearTimeout(visibilityFallback);
    },
    { once: true },
  );
}

export function cleanupHomeShellGitHeatmap() {
  activeController?.abort();
  activeController = undefined;
}

export function initHomeShellGitHeatmap() {
  cleanupHomeShellGitHeatmap();

  const grids = Array.from(
    document.querySelectorAll<HTMLElement>(GRID_SELECTOR),
  );
  if (grids.length === 0) return;

  const controller = new AbortController();
  activeController = controller;
  grids.forEach((grid) => observeHeatmap(grid, controller.signal));
}
