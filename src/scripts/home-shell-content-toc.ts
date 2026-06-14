type HeadingEntry = {
  item: HTMLElement;
  link: HTMLAnchorElement;
  heading: HTMLElement;
};

const CONTENT_TOC_REFRESH_EVENT = "content-toc:refresh";
const ACTIVE_HEADING_ROOT_MARGIN = "-18% 0px -55% 0px";
const PAGE_EDGE_THRESHOLD = 4;
const REDUCED_MOTION_MEDIA_QUERY = "(prefers-reduced-motion: reduce)";
const MANUAL_TOC_SCROLL_SETTLE_MS = 900;

type HomeShellContentTocWindow = Window & {
  __homeShellContentTocCleanup?: () => void;
};

export function initHomeShellContentToc() {
  const browserWindow = window as HomeShellContentTocWindow;
  browserWindow.__homeShellContentTocCleanup?.();

  const controller = new AbortController();
  let observer: IntersectionObserver | null = null;
  let progressFrame = 0;
  browserWindow.__homeShellContentTocCleanup = () => {
    if (progressFrame > 0) {
      window.cancelAnimationFrame(progressFrame);
    }

    observer?.disconnect();
    controller.abort();
  };

  const contentPage = document.querySelector("[data-home-shell-content-page]");
  const toc = document.querySelector("[data-home-shell-content-toc]");
  const tocList = toc?.querySelector(".content-toc-list");
  const tocProgress = toc?.querySelector("[data-content-toc-progress]");
  const motionMedia = window.matchMedia(REDUCED_MOTION_MEDIA_QUERY);

  if (
    !(contentPage instanceof HTMLElement) ||
    !(toc instanceof HTMLElement) ||
    !(tocList instanceof HTMLElement)
  )
    return;

  let tocEntranceSettled = toc.dataset.tocEntrance !== "ready";
  const links = Array.from(tocList.querySelectorAll(".content-toc-link"));
  if (links.length === 0) return;

  const headingEntries: HeadingEntry[] = links
    .map((link) => {
      if (!(link instanceof HTMLAnchorElement)) return null;

      const targetId = link.getAttribute("href")?.replace(/^#/, "") ?? "";
      if (!targetId) return null;

      const heading = contentPage.querySelector(`#${CSS.escape(targetId)}`);
      if (!(heading instanceof HTMLElement)) return null;

      const item = link.closest(".content-toc-item");
      if (!(item instanceof HTMLElement)) return null;

      return { item, link, heading };
    })
    .filter((entry): entry is HeadingEntry => entry !== null);

  if (headingEntries.length === 0) return;

  const visibleHeadingIds = new Set<string>();
  let activeEntry: HeadingEntry | null = null;
  let lastScrollY = window.scrollY;
  let manualTocScrollUntil = 0;
  const hasTocProgress = tocProgress instanceof HTMLElement;

  const requestSyncTocProgress = () => {
    if (!hasTocProgress || progressFrame > 0) return;

    progressFrame = window.requestAnimationFrame(() => {
      progressFrame = 0;
      syncTocProgress();
    });
  };

  const getTocScrollContainer = () => {
    const tocListStyle = window.getComputedStyle(tocList);
    const overflowY = tocListStyle.overflowY || tocListStyle.overflow;
    return overflowY === "auto" || overflowY === "scroll" ? tocList : toc;
  };

  const markManualTocScroll = () => {
    manualTocScrollUntil =
      window.performance.now() + MANUAL_TOC_SCROLL_SETTLE_MS;
  };

  const isManualTocScrollSettling = () =>
    window.performance.now() < manualTocScrollUntil;

  const centerActiveLink = (
    entry: HeadingEntry,
    behavior: ScrollBehavior = "auto",
    force = false,
  ) => {
    if (!force && isManualTocScrollSettling()) return;

    const tocScrollContainer = getTocScrollContainer();
    const itemTopInToc = entry.item.offsetTop;
    const centeredTocTop =
      itemTopInToc -
      (tocScrollContainer.clientHeight - entry.item.offsetHeight) / 2;
    const maxTocScrollTop = Math.max(
      0,
      tocScrollContainer.scrollHeight - tocScrollContainer.clientHeight,
    );
    const nextTocScrollTop = Math.min(
      Math.max(0, centeredTocTop),
      maxTocScrollTop,
    );

    if (Math.abs(tocScrollContainer.scrollTop - nextTocScrollTop) < 1) return;

    tocScrollContainer.scrollTo({
      top: nextTocScrollTop,
      behavior,
    });
  };

  const clampProgressPosition = (value: number, max: number) =>
    Math.min(Math.max(0, value), max);

  const getViewportHeadingIndices = () => {
    return headingEntries.reduce<number[]>((indices, entry, index) => {
      const rect = entry.heading.getBoundingClientRect();
      const isInViewport = rect.bottom >= 0 && rect.top <= window.innerHeight;

      if (isInViewport) {
        indices.push(index);
      }

      return indices;
    }, []);
  };

  const getProgressIndices = () => {
    const viewportIndices = getViewportHeadingIndices();
    if (viewportIndices.length > 0) return viewportIndices;

    const activeIndex = activeEntry ? headingEntries.indexOf(activeEntry) : -1;
    return [activeIndex >= 0 ? activeIndex : 0];
  };

  const syncTocProgress = () => {
    if (!hasTocProgress) return;

    const indices = getProgressIndices();
    const firstEntry = headingEntries[indices[0]];
    const lastEntry = headingEntries[indices[indices.length - 1]];

    if (!firstEntry || !lastEntry) {
      tocProgress.style.setProperty("--content-toc-progress-opacity", "0");
      return;
    }

    const listRect = tocList.getBoundingClientRect();
    const firstRect = firstEntry.item.getBoundingClientRect();
    const lastRect = lastEntry.item.getBoundingClientRect();
    const listHeight = tocList.clientHeight;
    const rawTop = firstRect.top - listRect.top;
    const rawBottom = lastRect.bottom - listRect.top;
    const maxTop = Math.max(0, listHeight - 8);
    const top = clampProgressPosition(rawTop, maxTop);
    const bottom = clampProgressPosition(rawBottom, listHeight);
    const fallbackHeight = Math.max(8, firstEntry.item.offsetHeight);
    const height =
      bottom > top
        ? Math.max(8, bottom - top)
        : Math.min(fallbackHeight, Math.max(0, listHeight - top));

    tocProgress.style.setProperty("--content-toc-progress-top", `${top}px`);
    tocProgress.style.setProperty(
      "--content-toc-progress-height",
      `${Math.max(0, height)}px`,
    );
    tocProgress.style.setProperty("--content-toc-progress-opacity", "1");
  };

  const setActiveEntry = (
    nextEntry: HeadingEntry,
    behavior: ScrollBehavior = "auto",
    forceCenter = false,
  ) => {
    if (activeEntry === nextEntry) return;

    activeEntry = nextEntry;

    headingEntries.forEach((entry) => {
      const isActive = entry === nextEntry;
      entry.link.classList.toggle("is-active", isActive);

      if (isActive) {
        entry.link.setAttribute("aria-current", "location");
      } else {
        entry.link.removeAttribute("aria-current");
      }
    });

    centerActiveLink(nextEntry, behavior, forceCenter);
    requestSyncTocProgress();
  };

  const getVisibleIndices = () => {
    return headingEntries.reduce<number[]>((indices, entry, index) => {
      if (visibleHeadingIds.has(entry.heading.id)) {
        indices.push(index);
      }

      return indices;
    }, []);
  };

  const syncActiveEntryFromVisibility = () => {
    const scrollingDown = window.scrollY >= lastScrollY;
    lastScrollY = window.scrollY;

    const visibleIndices = getVisibleIndices();
    if (visibleIndices.length > 0) {
      const nextIndex = scrollingDown
        ? visibleIndices[visibleIndices.length - 1]
        : visibleIndices[0];
      setActiveEntry(headingEntries[nextIndex]);
      requestSyncTocProgress();
      return;
    }

    if (window.scrollY <= PAGE_EDGE_THRESHOLD) {
      setActiveEntry(headingEntries[0]);
      requestSyncTocProgress();
      return;
    }

    const pageBottom = window.scrollY + window.innerHeight;
    const documentBottom = document.documentElement.scrollHeight;
    if (pageBottom >= documentBottom - PAGE_EDGE_THRESHOLD) {
      setActiveEntry(headingEntries[headingEntries.length - 1]);
      requestSyncTocProgress();
      return;
    }

    requestSyncTocProgress();
  };

  const processObservedEntries = (entries: IntersectionObserverEntry[]) => {
    entries.forEach((entry) => {
      const target = entry.target;
      if (!(target instanceof HTMLElement) || !target.id) return;

      if (entry.isIntersecting) {
        visibleHeadingIds.add(target.id);
      } else {
        visibleHeadingIds.delete(target.id);
      }
    });
  };

  const tocObserver = new IntersectionObserver(
    (entries) => {
      processObservedEntries(entries);

      if (!tocEntranceSettled) return;
      syncActiveEntryFromVisibility();
    },
    {
      rootMargin: ACTIVE_HEADING_ROOT_MARGIN,
      threshold: 0,
    },
  );
  observer = tocObserver;

  headingEntries.forEach((entry) => {
    tocObserver.observe(entry.heading);
  });

  const initialHash = decodeURIComponent(
    window.location.hash.replace(/^#/, ""),
  );
  const initialEntry =
    headingEntries.find((entry) => entry.heading.id === initialHash) ??
    headingEntries[0];
  setActiveEntry(initialEntry, "auto", true);

  headingEntries.forEach((entry) => {
    entry.link.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        entry.heading.scrollIntoView({
          behavior: motionMedia.matches ? "auto" : "smooth",
          block: "start",
        });

        if (history.replaceState) {
          history.replaceState(null, "", `#${entry.heading.id}`);
        }

        setActiveEntry(entry, "auto", true);
      },
      { signal: controller.signal },
    );
  });

  window.addEventListener(
    "resize",
    () => {
      if (!tocEntranceSettled || !activeEntry) return;
      centerActiveLink(activeEntry);
      requestSyncTocProgress();
    },
    { signal: controller.signal },
  );

  window.addEventListener("scroll", requestSyncTocProgress, {
    passive: true,
    signal: controller.signal,
  });

  tocList.addEventListener("scroll", requestSyncTocProgress, {
    passive: true,
    signal: controller.signal,
  });

  tocList.addEventListener("wheel", markManualTocScroll, {
    passive: true,
    signal: controller.signal,
  });

  tocList.addEventListener("touchstart", markManualTocScroll, {
    passive: true,
    signal: controller.signal,
  });

  tocList.addEventListener("touchmove", markManualTocScroll, {
    passive: true,
    signal: controller.signal,
  });

  tocList.addEventListener("pointerdown", markManualTocScroll, {
    passive: true,
    signal: controller.signal,
  });

  window.addEventListener(
    "load",
    () => {
      if (!tocEntranceSettled) return;
      processObservedEntries(tocObserver.takeRecords());
      syncActiveEntryFromVisibility();
      requestSyncTocProgress();
    },
    { once: true, signal: controller.signal },
  );

  document.addEventListener(
    CONTENT_TOC_REFRESH_EVENT,
    () => {
      tocEntranceSettled = true;
      processObservedEntries(tocObserver.takeRecords());
      syncActiveEntryFromVisibility();
      requestSyncTocProgress();
    },
    { signal: controller.signal },
  );

  if (tocEntranceSettled) {
    processObservedEntries(tocObserver.takeRecords());
    syncActiveEntryFromVisibility();
    requestSyncTocProgress();
  }
}
