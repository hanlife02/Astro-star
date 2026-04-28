import { HOME_SHELL_DESKTOP_MEDIA_QUERY } from "./home-shell-breakpoints";

type HomeShellMobileTocWindow = Window & {
  __homeShellMobileTocCleanup?: () => void;
};

export function initHomeShellMobileToc() {
  const browserWindow = window as HomeShellMobileTocWindow;
  browserWindow.__homeShellMobileTocCleanup?.();

  const controller = new AbortController();
  browserWindow.__homeShellMobileTocCleanup = () => {
    controller.abort();
  };

  const shell = document.querySelector("[data-home-shell-root]");
  const latestArea = shell?.querySelector("[data-home-shell-latest]");
  const toc = latestArea?.querySelector(":scope > .content-toc");
  const fabStack = shell?.querySelector("[data-home-shell-fab]");
  const tocButton = document.getElementById("toc-fab");
  const tocMedia = window.matchMedia(HOME_SHELL_DESKTOP_MEDIA_QUERY);

  if (
    !(shell instanceof HTMLElement) ||
    !(latestArea instanceof HTMLElement) ||
    !(toc instanceof HTMLElement) ||
    !(tocButton instanceof HTMLButtonElement)
  ) {
    if (tocButton instanceof HTMLElement) {
      tocButton.hidden = true;
    }
    if (fabStack instanceof HTMLElement) {
      fabStack.hidden = true;
    }
    return;
  }

  shell.classList.add("home-shell--has-mobile-toc");

  const syncContentTocLayout = () => {
    requestAnimationFrame(() => {
      window.dispatchEvent(new Event("resize"));
    });
  };

  const syncMobileTocState = () => {
    const isDesktop = tocMedia.matches;
    if (isDesktop) {
      shell.classList.remove("is-mobile-toc-open");
    }

    tocButton.hidden = isDesktop;
    if (fabStack instanceof HTMLElement) {
      fabStack.hidden = isDesktop;
    }
    tocButton.setAttribute(
      "aria-expanded",
      String(shell.classList.contains("is-mobile-toc-open")),
    );
    syncContentTocLayout();
  };

  const closeMobileToc = () => {
    shell.classList.remove("is-mobile-toc-open");
    syncMobileTocState();
  };

  tocButton.addEventListener(
    "click",
    () => {
      if (tocMedia.matches) return;
      shell.classList.toggle("is-mobile-toc-open");
      syncMobileTocState();
    },
    { signal: controller.signal },
  );

  toc.addEventListener(
    "click",
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!target.closest("a")) return;
      if (tocMedia.matches) return;
      closeMobileToc();
    },
    { signal: controller.signal },
  );

  document.addEventListener(
    "click",
    (event) => {
      if (tocMedia.matches || !shell.classList.contains("is-mobile-toc-open"))
        return;
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (latestArea.contains(target)) return;
      if (fabStack instanceof HTMLElement && fabStack.contains(target)) return;
      closeMobileToc();
    },
    { signal: controller.signal },
  );

  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key !== "Escape") return;
      closeMobileToc();
    },
    { signal: controller.signal },
  );

  tocMedia.addEventListener("change", syncMobileTocState, {
    signal: controller.signal,
  });
  syncMobileTocState();
}
