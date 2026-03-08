const CONTENT_TOC_REFRESH_EVENT = "content-toc:refresh";

type HomeShellEntranceWindow = Window & {
  __contentPageEntrancePageLoadBound?: boolean;
  __runContentPageEntrance?: () => void;
};

export function initHomeShellContentPageEntrance() {
  const browserWindow = window as HomeShellEntranceWindow;

  const runContentPageEntrance = () => {
    const contentPage = document.querySelector(".content-page");
    const toc = document.querySelector(".content-toc");

    if (!(contentPage instanceof HTMLElement)) return;

    contentPage.dataset.contentEntranceEnabled = "true";
    contentPage.dataset.pageEntrance = "ready";

    if (toc instanceof HTMLElement) {
      toc.dataset.contentEntranceEnabled = "true";
      toc.dataset.tocEntrance = "ready";

      const tocItems = Array.from(toc.querySelectorAll(".content-toc-item"));
      const lastTocItem = tocItems.at(-1);
      let tocRefreshTriggered = false;

      tocItems.forEach((item, index) => {
        if (!(item instanceof HTMLElement)) return;
        item.style.setProperty("--content-toc-enter-order", `${index}`);
      });

      const triggerTocRefresh = () => {
        if (tocRefreshTriggered) return;
        tocRefreshTriggered = true;
        document.dispatchEvent(new CustomEvent(CONTENT_TOC_REFRESH_EVENT));
      };

      if (lastTocItem instanceof HTMLElement) {
        lastTocItem.addEventListener(
          "transitionend",
          (event) => {
            if (!(event.target instanceof HTMLElement) || event.target !== lastTocItem) return;
            if (event.propertyName !== "transform" && event.propertyName !== "opacity") return;
            triggerTocRefresh();
          },
          { once: true },
        );
      }

      window.setTimeout(() => {
        triggerTocRefresh();
      }, 1400);
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        contentPage.dataset.pageEntrance = "entered";

        if (toc instanceof HTMLElement) {
          toc.dataset.tocEntrance = "entered";
        }
      });
    });
  };

  runContentPageEntrance();

  if (!browserWindow.__contentPageEntrancePageLoadBound) {
    document.addEventListener("astro:page-load", () => {
      browserWindow.__runContentPageEntrance?.();
    });

    browserWindow.__contentPageEntrancePageLoadBound = true;
  }

  browserWindow.__runContentPageEntrance = runContentPageEntrance;
}
