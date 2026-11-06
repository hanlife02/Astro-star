type ScrollRevealWindow = Window & {
  __homeShellScrollRevealCleanup?: () => void;
};

// Reveal prose blocks as units; never split text, list items or interactive widgets.
const REVEAL_SELECTOR = [
  ".home-latest-sequence > .latest-articles-panel",
  ".home-activity-title",
  ".archive-activity-heatmap",
  ".home-profile-metric",
  ".collection-archive-year",
  ".collection-archive-item",
  ".app-panel-item",
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
  let frame = 0;
  const elements = Array.from(
    document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR),
  );

  const observer = new IntersectionObserver(
    (entries) => {
      const groups = new Map<Element | null, number>();
      entries.forEach((entry) => {
        if (!entry.isIntersecting || !(entry.target instanceof HTMLElement))
          return;
        const element = entry.target;
        const order = groups.get(element.parentElement) ?? 0;
        groups.set(element.parentElement, order + 1);
        element.style.setProperty(
          "--scroll-reveal-delay",
          `${Math.min(order * 0.12, 0.24)}s`,
        );
        reveal(element, true);
      });
    },
    { rootMargin: "-12% 0px", threshold: 0 },
  );

  function reveal(element: HTMLElement, animate = false) {
    if (!pending.delete(element)) return;
    observer.unobserve(element);
    element.dataset.scrollReveal = animate ? "entered" : "visible";
  }

  elements.forEach((element) => {
    // Do not animate a block twice through both its parent and itself.
    if (element.parentElement?.closest("[data-scroll-reveal]")) return;
    if (element.closest("[data-waline], .content-toc, .home-header")) return;

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
            "--scroll-reveal-delay",
            `${0.7 + x * 0.005}s`,
          );
        });
    }

    // Never hide the first screen, restored scroll positions or earlier content.
    if (element.getBoundingClientRect().top < window.innerHeight) {
      element.dataset.scrollReveal = "visible";
      return;
    }
    element.dataset.scrollReveal = "pending";
    pending.add(element);
    observer.observe(element);
  });

  const revealTarget = (target: Element) => {
    for (const element of pending) {
      if (element === target || element.contains(target)) reveal(element);
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
        pending.forEach((element) => {
          if (element.getBoundingClientRect().top < window.innerHeight)
            reveal(element, true);
        });
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

  browserWindow.__homeShellScrollRevealCleanup = () => {
    observer.disconnect();
    window.cancelAnimationFrame(frame);
    controller.abort();
    elements.forEach((element) => {
      delete element.dataset.scrollReveal;
      delete element.dataset.scrollRevealKind;
      element.style.removeProperty("--scroll-reveal-delay");
      element
        .querySelectorAll<HTMLElement>("[style*='--scroll-reveal-delay']")
        .forEach((node) => {
          node.style.removeProperty("--scroll-reveal-delay");
        });
    });
    pending.clear();
    browserWindow.__homeShellScrollRevealCleanup = undefined;
  };
}
