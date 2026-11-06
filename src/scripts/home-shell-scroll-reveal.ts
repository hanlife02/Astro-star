type ScrollRevealWindow = Window & {
  __homeShellScrollRevealCleanup?: () => void;
};

// Reveal prose blocks as units; never split text, list items or interactive widgets.
const REVEAL_SELECTOR = [
  ".home-latest-sequence > .latest-articles-panel",
  ".home-activity-title",
  ".archive-activity-heatmap",
  ".home-profile-metric",
  ".collection-page-header",
  ".content-page-header",
  ".collection-archive-year",
  ".collection-archive-item",
  ".app-panel-item:not([data-friend-link-card])",
  ".friend-feed-item",
  ".link-owner-info",
  ".article-action-card",
  ".article-neighbors",
  ".article-comments",
  ".home-footer",
  ":is(.content-page-body, .article-reading-paper) > :is(h1, h2, h3, h4, h5, h6, p, ul, ol, blockquote, pre, figure, table, details, .content-code-block, .content-repo-card)",
].join(", ");

export function initHomeShellScrollReveal() {
  const browserWindow = window as ScrollRevealWindow;
  browserWindow.__homeShellScrollRevealCleanup?.();

  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (motion.matches || !("IntersectionObserver" in window)) return;

  const controller = new AbortController();
  const { signal } = controller;
  const pending = new Set<HTMLElement>();
  const initialViewport: HTMLElement[] = [];
  let nextRevealAt = 0;
  let frame = 0;
  const elements = Array.from(
    document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR),
  );

  const observer = new IntersectionObserver(
    (entries) => {
      revealBatch(
        entries.flatMap((entry) =>
          entry.isIntersecting && entry.target instanceof HTMLElement
            ? [entry.target]
            : [],
        ),
      );
    },
    { rootMargin: "-12% 0px", threshold: 0 },
  );

  function reveal(element: HTMLElement, animate = false) {
    if (!pending.delete(element)) return;
    observer.unobserve(element);
    element.dataset.scrollReveal = animate ? "entered" : "visible";
  }

  function revealBatch(targets: HTMLElement[]) {
    const lastTarget = elements.reduce(
      (last, element, index) =>
        targets.includes(element) && pending.has(element) ? index : last,
      -1,
    );
    const now = window.performance.now();
    // Append to the same page-wide clock, including any rows skipped by a fast
    // scroll. A new observer callback must never overtake an earlier reveal.
    elements
      .slice(0, lastTarget + 1)
      .filter((element) => pending.has(element))
      .forEach((element) => {
        // A feed row may have been collapsed since initialization. It must not
        // reserve a time slot or animate through the feed's hidden state.
        if (element.dataset.friendFeedHidden === "true") {
          reveal(element);
          return;
        }
        const startAt = Math.max(now, nextRevealAt);
        element.style.setProperty(
          "--scroll-reveal-delay",
          `${(startAt - now) / 1000}s`,
        );
        nextRevealAt = startAt + 60;
        reveal(element, true);
      });
  }

  elements.forEach((element) => {
    // Do not animate a block twice through both its parent and itself.
    if (element.parentElement?.closest("[data-scroll-reveal]")) return;
    if (element.closest("[data-waline], .content-toc, .home-header")) return;
    // More posts owns the expansion animation; initially folded rows never
    // participate in the page entrance or delay the application section.
    if (element.dataset.friendFeedHidden === "true") return;

    if (element.matches(".archive-activity-heatmap")) {
      element.dataset.scrollRevealKind = "timeline";
      element
        .querySelectorAll<HTMLElement>(
          ".archive-activity-timeline-bucket, .archive-activity-timeline-month, .archive-activity-timeline-year",
        )
        .forEach((node) => {
          const x =
            Number.parseFloat(
              node.style.getPropertyValue("--archive-activity-x"),
            ) || 0;
          node.style.setProperty(
            "--scroll-reveal-node-delay",
            `${0.7 + x * 0.005}s`,
          );
        });
    }

    const bounds = element.getBoundingClientRect();
    // Keep content above a restored scroll position readable, but animate the
    // entire initial viewport, including its edges outside the observer inset.
    if (bounds.bottom <= 0) {
      element.dataset.scrollReveal = "visible";
      return;
    }
    element.dataset.scrollReveal = "pending";
    pending.add(element);
    if (bounds.top < window.innerHeight) initialViewport.push(element);
    else observer.observe(element);
  });

  const revealTarget = (target: Element) => {
    for (const element of elements) {
      if (element === target || element.contains(target)) {
        reveal(element);
        if (element.dataset.scrollReveal === "entered") {
          element.dataset.scrollReveal = "visible";
        }
      }
    }
  };
  const revealHash = () => {
    if (!window.location.hash) return;
    let id: string;
    try {
      id = decodeURIComponent(window.location.hash.slice(1));
    } catch {
      return;
    }
    const target = document.getElementById(id);
    if (target) revealTarget(target);
  };

  document.addEventListener(
    "focusin",
    (event) => {
      if (event.target instanceof Element) revealTarget(event.target);
    },
    { signal },
  );
  window.addEventListener("hashchange", revealHash, { signal });
  // The footer cannot reach the observer's inset viewport at the document end.
  window.addEventListener(
    "scroll",
    () => {
      if (frame || !pending.size) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        if (
          window.scrollY + window.innerHeight <
          document.documentElement.scrollHeight - 2
        )
          return;
        revealBatch(
          [...pending].filter(
            (element) =>
              element.getBoundingClientRect().top < window.innerHeight,
          ),
        );
      });
    },
    { passive: true, signal },
  );
  window.addEventListener(
    "beforeprint",
    () => pending.forEach((element) => reveal(element)),
    { signal },
  );
  motion.addEventListener(
    "change",
    () => {
      if (motion.matches) pending.forEach((element) => reveal(element));
    },
    { signal },
  );
  revealHash();
  revealBatch(initialViewport);

  browserWindow.__homeShellScrollRevealCleanup = () => {
    observer.disconnect();
    window.cancelAnimationFrame(frame);
    controller.abort();
    elements.forEach((element) => {
      delete element.dataset.scrollReveal;
      delete element.dataset.scrollRevealKind;
      element.style.removeProperty("--scroll-reveal-delay");
      element
        .querySelectorAll<HTMLElement>("[style*='--scroll-reveal-node-delay']")
        .forEach((node) => {
          node.style.removeProperty("--scroll-reveal-node-delay");
        });
    });
    pending.clear();
    browserWindow.__homeShellScrollRevealCleanup = undefined;
  };
}
