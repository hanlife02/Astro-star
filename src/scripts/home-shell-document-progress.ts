const DOCUMENT_PROGRESS_MIN_SCROLL_PX = 24;
const SCROLL_DIRECTION_DELTA_PX = 4;
const REDUCED_MOTION_MEDIA_QUERY = "(prefers-reduced-motion: reduce)";

type HomeShellDocumentProgressWindow = Window & {
  __homeShellDocumentProgressCleanup?: () => void;
};

function clampProgress(value: number) {
  return Math.min(100, Math.max(0, value));
}

export function initHomeShellDocumentProgress() {
  const browserWindow = window as HomeShellDocumentProgressWindow;
  browserWindow.__homeShellDocumentProgressCleanup?.();

  const controller = new AbortController();
  let animationFrame = 0;

  const cleanup = () => {
    controller.abort();
    if (animationFrame) {
      window.cancelAnimationFrame(animationFrame);
    }
  };
  browserWindow.__homeShellDocumentProgressCleanup = cleanup;

  const contentPage = document.querySelector(
    "[data-home-shell-content-page][data-document-navigation='true']",
  );
  const button = document.getElementById("document-progress-fab");
  const percent = button?.querySelector("[data-document-progress-percent]");
  const icon = button?.querySelector("[data-document-progress-icon]");
  const motionMedia = window.matchMedia(REDUCED_MOTION_MEDIA_QUERY);

  if (
    !(contentPage instanceof HTMLElement) ||
    !(button instanceof HTMLButtonElement) ||
    !(percent instanceof HTMLElement) ||
    !(icon instanceof HTMLElement)
  ) {
    if (button instanceof HTMLElement) {
      button.hidden = true;
    }
    return;
  }

  let lastScrollY = window.scrollY;
  let scrollDirection: "down" | "up" = "down";

  const getDocumentProgress = () => {
    const scrollY = window.scrollY;
    const viewportHeight = window.innerHeight;
    const pageHeight = document.documentElement.scrollHeight;
    const maxPageScroll = Math.max(0, pageHeight - viewportHeight);

    if (maxPageScroll <= 0) return 100;
    if (scrollY + viewportHeight >= pageHeight - 2) return 100;

    const contentRect = contentPage.getBoundingClientRect();
    const contentTop = scrollY + contentRect.top;
    const contentEndScrollY =
      contentTop + contentPage.offsetHeight - viewportHeight;
    const contentScrollRange = contentEndScrollY - contentTop;

    if (contentScrollRange <= 0) {
      return clampProgress(Math.round((scrollY / maxPageScroll) * 100));
    }

    return clampProgress(
      Math.round(((scrollY - contentTop) / contentScrollRange) * 100),
    );
  };

  const setMode = (mode: "progress" | "top") => {
    const showTopIcon = mode === "top";
    percent.hidden = showTopIcon;
    icon.hidden = !showTopIcon;
    button.dataset.documentProgressMode = mode;
  };

  const syncProgressButton = () => {
    animationFrame = 0;

    const scrollY = window.scrollY;
    const scrollDelta = scrollY - lastScrollY;
    if (Math.abs(scrollDelta) >= SCROLL_DIRECTION_DELTA_PX) {
      scrollDirection = scrollDelta > 0 ? "down" : "up";
      lastScrollY = scrollY;
    }

    const progress = getDocumentProgress();
    percent.textContent = `${progress}%`;

    const shouldShowButton = scrollY > DOCUMENT_PROGRESS_MIN_SCROLL_PX;
    button.hidden = !shouldShowButton;

    if (!shouldShowButton) {
      setMode("progress");
      return;
    }

    setMode(scrollDirection === "up" ? "top" : "progress");
    button.setAttribute(
      "aria-label",
      scrollDirection === "up"
        ? "Back to top"
        : `Reading progress ${progress}%, back to top`,
    );
  };

  const scheduleSync = () => {
    if (animationFrame) return;
    animationFrame = window.requestAnimationFrame(syncProgressButton);
  };

  button.addEventListener(
    "click",
    () => {
      window.scrollTo({
        top: 0,
        behavior: motionMedia.matches ? "auto" : "smooth",
      });
    },
    { signal: controller.signal },
  );
  window.addEventListener("scroll", scheduleSync, {
    passive: true,
    signal: controller.signal,
  });
  window.addEventListener("resize", scheduleSync, {
    signal: controller.signal,
  });

  syncProgressButton();
}
