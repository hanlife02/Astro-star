type HeadingEntry = {
  link: HTMLAnchorElement;
  heading: HTMLElement;
};

export function initHomeShellContentToc() {
  const contentPage = document.querySelector("[data-home-shell-content-page]");
  const toc = document.querySelector("[data-home-shell-content-toc]");
  const tocList = toc?.querySelector(".content-toc-list");

  if (!(contentPage instanceof HTMLElement) || !(toc instanceof HTMLElement) || !(tocList instanceof HTMLElement)) return;

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

  let frameId = 0;

  const getHeadingOffset = (heading: HTMLElement) => {
    return heading.getBoundingClientRect().top + window.scrollY;
  };

  const getTocScrollContainer = () => {
    const tocListStyle = window.getComputedStyle(tocList);
    const overflowY = tocListStyle.overflowY || tocListStyle.overflow;
    return overflowY === "auto" || overflowY === "scroll" ? tocList : toc;
  };

  const updateContentToc = () => {
    const viewportTop = window.scrollY;
    const viewportBottom = viewportTop + window.innerHeight;
    const visibleEntries = headingEntries.filter((entry) => {
      const headingTop = getHeadingOffset(entry.heading);
      const headingBottom = headingTop + entry.heading.offsetHeight;
      return headingBottom > viewportTop && headingTop < viewportBottom;
    });

    let activeEntry = visibleEntries[0] ?? headingEntries[0];

    if (!visibleEntries.length) {
      headingEntries.forEach((entry) => {
        if (getHeadingOffset(entry.heading) <= viewportTop) {
          activeEntry = entry;
        }
      });
    }

    headingEntries.forEach((entry) => {
      const isActive = entry === activeEntry;
      entry.link.classList.toggle("is-active", isActive);

      if (isActive) {
        entry.link.setAttribute("aria-current", "location");
      } else {
        entry.link.removeAttribute("aria-current");
      }
    });

    const activeItem = activeEntry.link.closest(".content-toc-item");
    if (!(activeItem instanceof HTMLElement)) return;

    const tocScrollContainer = getTocScrollContainer();
    const itemTopInToc = activeItem.offsetTop;
    const centeredTocTop = itemTopInToc - (tocScrollContainer.clientHeight - activeItem.offsetHeight) / 2;
    const maxTocScrollTop = Math.max(0, tocScrollContainer.scrollHeight - tocScrollContainer.clientHeight);
    const nextTocScrollTop = Math.min(Math.max(0, centeredTocTop), maxTocScrollTop);

    tocScrollContainer.scrollTo({
      top: nextTocScrollTop,
      behavior: "smooth",
    });
  };

  const queueContentTocUpdate = () => {
    cancelAnimationFrame(frameId);
    frameId = requestAnimationFrame(updateContentToc);
  };

  const queueContentTocUpdateWhenReady = () => {
    if (!tocEntranceSettled) return;
    queueContentTocUpdate();
  };

  headingEntries.forEach((entry) => {
    entry.link.addEventListener("click", (event) => {
      event.preventDefault();
      entry.heading.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });

      if (history.replaceState) {
        history.replaceState(null, "", `#${entry.heading.id}`);
      }

      queueContentTocUpdateWhenReady();
    });
  });

  window.addEventListener("scroll", queueContentTocUpdateWhenReady, { passive: true });
  window.addEventListener("resize", queueContentTocUpdateWhenReady);
  window.addEventListener("load", queueContentTocUpdateWhenReady, { once: true });
  document.addEventListener("content-toc:refresh", () => {
    tocEntranceSettled = true;
    queueContentTocUpdate();
  });

  if (tocEntranceSettled) {
    queueContentTocUpdate();
  }
}
