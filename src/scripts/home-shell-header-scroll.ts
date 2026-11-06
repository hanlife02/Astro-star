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
  const fadeDistance = 48;
  const shiftDistance = 6;
  let previousY = Math.max(0, window.scrollY);
  let hiddenDistance = 0;
  let floating = false;
  let frame = 0;

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

    const keepVisible =
      reducedMotion.matches ||
      mobileMenu?.open ||
      Boolean(header.querySelector(":focus-visible"));

    if (y <= revealAtTop) {
      floating = false;
    } else if (delta < 0 || keepVisible) {
      floating = true;
    }

    if (y <= revealAtTop || keepVisible || delta < 0) {
      hiddenDistance = 0;
    } else {
      hiddenDistance = Math.max(
        0,
        Math.min(fadeDistance, hiddenDistance + delta),
      );
    }

    const progress = hiddenDistance / fadeDistance;
    header.style.setProperty(
      "--header-shift",
      `${-progress * shiftDistance}px`,
    );
    header.style.setProperty("--header-opacity", `${1 - progress}`);
    header.dataset.scrollHidden = String(progress === 1);
    header.dataset.floating = String(floating);
  };

  const schedule = () => {
    if (!frame) frame = window.requestAnimationFrame(sync);
  };
  sync();
  window.addEventListener("scroll", schedule, { passive: true, signal });
  window.addEventListener("resize", schedule, { passive: true, signal });
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
