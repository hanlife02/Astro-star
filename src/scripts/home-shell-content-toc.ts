type HeadingEntry = {
  link: HTMLAnchorElement;
  heading: HTMLElement;
};

const CONTENT_TOC_REFRESH_EVENT = "content-toc:refresh";
const ACTIVE_HEADING_ROOT_MARGIN = "-18% 0px -55% 0px";
const PAGE_EDGE_THRESHOLD = 4;

type HomeShellContentTocWindow = Window & {
  __homeShellContentTocCleanup?: () => void;
};

export function initHomeShellContentToc() {
  const browserWindow = window as HomeShellContentTocWindow;
  browserWindow.__homeShellContentTocCleanup?.();

  const controller = new AbortController();
  let observer: IntersectionObserver | null = null;
  browserWindow.__homeShellContentTocCleanup = () => {
    observer?.disconnect();
    controller.abort();
  };

  const contentPage = document.querySelector("[data-home-shell-content-page]");
  const toc = document.querySelector("[data-home-shell-content-toc]");
  const tocList = toc?.querySelector(".content-toc-list");

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

      return { link, heading };
    })
    .filter((entry): entry is HeadingEntry => entry !== null);

  if (headingEntries.length === 0) return;

  const visibleHeadingIds = new Set<string>();
  let activeEntry: HeadingEntry | null = null;
  let lastScrollY = window.scrollY;

  const getTocScrollContainer = () => {
    const tocListStyle = window.getComputedStyle(tocList);
    const overflowY = tocListStyle.overflowY || tocListStyle.overflow;
    return overflowY === "auto" || overflowY === "scroll" ? tocList : toc;
  };

  const centerActiveLink = (
    entry: HeadingEntry,
    behavior: ScrollBehavior = "auto",
  ) => {
    const activeItem = entry.link.closest(".content-toc-item");
    if (!(activeItem instanceof HTMLElement)) return;

    const tocScrollContainer = getTocScrollContainer();
    const itemTopInToc = activeItem.offsetTop;
    const centeredTocTop =
      itemTopInToc -
      (tocScrollContainer.clientHeight - activeItem.offsetHeight) / 2;
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

  const setActiveEntry = (
    nextEntry: HeadingEntry,
    behavior: ScrollBehavior = "auto",
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

    centerActiveLink(nextEntry, behavior);
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
      return;
    }

    if (window.scrollY <= PAGE_EDGE_THRESHOLD) {
      setActiveEntry(headingEntries[0]);
      return;
    }

    const pageBottom = window.scrollY + window.innerHeight;
    const documentBottom = document.documentElement.scrollHeight;
    if (pageBottom >= documentBottom - PAGE_EDGE_THRESHOLD) {
      setActiveEntry(headingEntries[headingEntries.length - 1]);
    }
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
  setActiveEntry(initialEntry);

  headingEntries.forEach((entry) => {
    entry.link.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        entry.heading.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });

        if (history.replaceState) {
          history.replaceState(null, "", `#${entry.heading.id}`);
        }

        setActiveEntry(entry);
      },
      { signal: controller.signal },
    );
  });

  window.addEventListener(
    "resize",
    () => {
      if (!tocEntranceSettled || !activeEntry) return;
      centerActiveLink(activeEntry);
    },
    { signal: controller.signal },
  );

  window.addEventListener(
    "load",
    () => {
      if (!tocEntranceSettled) return;
      processObservedEntries(tocObserver.takeRecords());
      syncActiveEntryFromVisibility();
    },
    { once: true, signal: controller.signal },
  );

  document.addEventListener(
    CONTENT_TOC_REFRESH_EVENT,
    () => {
      tocEntranceSettled = true;
      processObservedEntries(tocObserver.takeRecords());
      syncActiveEntryFromVisibility();
    },
    { signal: controller.signal },
  );

  if (tocEntranceSettled) {
    processObservedEntries(tocObserver.takeRecords());
    syncActiveEntryFromVisibility();
  }
}
