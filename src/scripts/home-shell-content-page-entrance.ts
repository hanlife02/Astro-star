const CONTENT_TOC_REFRESH_EVENT = "content-toc:refresh";

type HomeShellEntranceWindow = Window & {
  __contentPageEntranceLastPath?: string;
};

export function initHomeShellContentPageEntrance() {
  const browserWindow = window as HomeShellEntranceWindow;

  const runContentPageEntrance = () => {
    const contentPage = document.querySelector(
      "[data-home-shell-content-page]",
    );
    const toc = document.querySelector("[data-home-shell-content-toc]");

    if (!(contentPage instanceof HTMLElement)) return;

    const currentPath = `${window.location.pathname}${window.location.search}`;
    const isSamePathReplay =
      browserWindow.__contentPageEntranceLastPath === currentPath &&
      contentPage.dataset.pageEntrance === "entered" &&
      (!(toc instanceof HTMLElement) || toc.dataset.tocEntrance === "entered");

    if (isSamePathReplay) return;

    browserWindow.__contentPageEntranceLastPath = currentPath;

    contentPage.dataset.contentEntranceEnabled = "true";
    contentPage.dataset.pageEntrance = "entered";

    if (toc instanceof HTMLElement) {
      toc.dataset.contentEntranceEnabled = "true";
      toc.dataset.tocEntrance = "entered";

      const tocItems = Array.from(toc.querySelectorAll(".content-toc-item"));

      tocItems.forEach((item, index) => {
        if (!(item instanceof HTMLElement)) return;
        item.style.setProperty("--content-toc-enter-order", `${index}`);
      });

      requestAnimationFrame(() => {
        document.dispatchEvent(new CustomEvent(CONTENT_TOC_REFRESH_EVENT));
      });
    }
  };

  runContentPageEntrance();
}
