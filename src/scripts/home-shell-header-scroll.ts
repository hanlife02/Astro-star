type HeaderScrollWindow = Window & {
  __homeShellHeaderScrollCleanup?: () => void;
};

export function initHomeShellHeaderScroll() {
  const browserWindow = window as HeaderScrollWindow;
  browserWindow.__homeShellHeaderScrollCleanup?.();

  const header = document.querySelector(".home-header");
  if (!(header instanceof HTMLElement)) return;

  const controller = new AbortController();
  const { signal } = controller;
  const mobileMenu = header.querySelector<HTMLDetailsElement>(
    "[data-home-shell-mobile-nav]",
  );
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const revealAtTop = 24;
  let previousY = Math.max(0, window.scrollY);
  let hiddenDistance = 0;
  let frame = 0;
  let travel = 1;

  const measure = () => {
    const top = Number.parseFloat(window.getComputedStyle(header).top) || 0;
    travel = Math.max(1, header.offsetHeight + top + 12);
  };

  const sync = () => {
    frame = 0;
    const maxY = Math.max(
      0,
      document.documentElement.scrollHeight - window.innerHeight,
    );
    const y = Math.max(0, Math.min(window.scrollY, maxY));
    const delta =
      Math.max(0, y - revealAtTop) - Math.max(0, previousY - revealAtTop);
    previousY = y;

    if (
      y <= revealAtTop ||
      reducedMotion.matches ||
      mobileMenu?.open ||
      header.querySelector(":focus-visible")
    ) {
      hiddenDistance = 0;
    } else {
      hiddenDistance = Math.max(0, Math.min(travel, hiddenDistance + delta));
    }

    const progress = hiddenDistance / travel;
    header.style.setProperty("--header-shift", `${-hiddenDistance}px`);
    header.style.setProperty("--header-opacity", `${1 - progress}`);
    header.dataset.scrollHidden = String(progress === 1);
    header.dataset.floating = String(y > revealAtTop);
  };

  const schedule = () => {
    if (!frame) frame = window.requestAnimationFrame(sync);
  };
  const resize = () => {
    measure();
    schedule();
  };

  measure();
  sync();
  window.addEventListener("scroll", schedule, { passive: true, signal });
  window.addEventListener("resize", resize, { passive: true, signal });
  header.addEventListener("focusin", schedule, { signal });
  mobileMenu?.addEventListener("toggle", schedule, { signal });
  reducedMotion.addEventListener("change", schedule, { signal });

  browserWindow.__homeShellHeaderScrollCleanup = () => {
    controller.abort();
    window.cancelAnimationFrame(frame);
    header.style.removeProperty("--header-shift");
    header.style.removeProperty("--header-opacity");
    delete header.dataset.scrollHidden;
    delete header.dataset.floating;
  };
}
