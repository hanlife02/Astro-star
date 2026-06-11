type CodeTimeWindow = Window & {
  __homeShellCodeTimeCleanup?: () => void;
};

function setStatusPopoverOpen(
  root: HTMLElement,
  popover: HTMLElement,
  isOpen: boolean,
) {
  if (isOpen) {
    root.dataset.codetimeStatusOpen = "true";
  } else {
    delete root.dataset.codetimeStatusOpen;
  }

  root.setAttribute("aria-expanded", String(isOpen));
  popover.setAttribute("aria-hidden", String(!isOpen));
}

function initCodeTimeStatusPopover(
  root: HTMLElement,
  popover: HTMLElement,
  signal: AbortSignal,
  onOpen?: () => void,
) {
  root.setAttribute("role", "button");
  root.setAttribute("tabindex", "0");
  root.setAttribute("aria-label", "Show CodeTime status");
  root.setAttribute("aria-expanded", "false");

  const close = () => {
    setStatusPopoverOpen(root, popover, false);
  };

  const toggle = () => {
    const isOpen = root.dataset.codetimeStatusOpen !== "true";

    if (isOpen) {
      onOpen?.();
    }

    setStatusPopoverOpen(root, popover, isOpen);
  };

  root.addEventListener(
    "click",
    (event) => {
      event.preventDefault();
      toggle();
    },
    { signal },
  );

  root.addEventListener(
    "keydown",
    (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;

      event.preventDefault();
      toggle();
    },
    { signal },
  );

  document.addEventListener(
    "click",
    (event) => {
      if (!(event.target instanceof Node) || root.contains(event.target)) {
        return;
      }

      close();
    },
    { signal },
  );

  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape") {
        close();
      }
    },
    { signal },
  );

  signal.addEventListener(
    "abort",
    () => {
      close();
      root.removeAttribute("role");
      root.removeAttribute("tabindex");
      root.removeAttribute("aria-label");
      root.removeAttribute("aria-expanded");
    },
    { once: true },
  );
}

function hideCodeTimeElement(image: HTMLImageElement, closestSelector: string) {
  image.closest<HTMLElement>(closestSelector)?.remove();
}

function settleCodeTimeImage(
  image: HTMLImageElement,
  closestSelector: string,
  onAvailable?: () => void,
  signal?: AbortSignal,
) {
  const settle = () => {
    if (signal?.aborted) return;

    if (image.naturalWidth <= 0) {
      hideCodeTimeElement(image, closestSelector);
      return;
    }

    onAvailable?.();
  };

  if (image.complete) {
    settle();
    return;
  }

  image.addEventListener("load", settle, { once: true, signal });
  image.addEventListener("error", settle, { once: true, signal });
}

function syncCodeTimeStatusTheme(image: HTMLImageElement) {
  const theme =
    document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  const url = new URL(
    image.getAttribute("src") ?? image.src,
    window.location.href,
  );

  if (url.searchParams.get("theme") === theme) return;

  url.searchParams.set("theme", theme);
  image.src = `${url.pathname}${url.search}`;
}

function refreshCodeTimeStatusImage(image: HTMLImageElement) {
  const theme =
    document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  const url = new URL(
    image.getAttribute("src") ?? image.src,
    window.location.href,
  );

  url.searchParams.set("theme", theme);
  url.searchParams.set("refresh", String(Date.now()));
  image.src = `${url.pathname}${url.search}`;
}

export function initHomeShellCodeTime() {
  const browserWindow = window as CodeTimeWindow;
  browserWindow.__homeShellCodeTimeCleanup?.();

  const badgeImage = document.querySelector<HTMLImageElement>(
    "[data-codetime-badge]",
  );
  const statusImage = document.querySelector<HTMLImageElement>(
    "[data-codetime-status]",
  );
  const statusRoot = document.querySelector<HTMLElement>(
    "[data-codetime-status-root]",
  );
  const statusPopover = document.querySelector<HTMLElement>(
    "[data-codetime-status-popover]",
  );
  const statusController = new AbortController();
  let themeObserver: MutationObserver | undefined;

  if (badgeImage) {
    settleCodeTimeImage(badgeImage, "[data-codetime-metric]");
  }

  if (statusImage) {
    syncCodeTimeStatusTheme(statusImage);
    settleCodeTimeImage(
      statusImage,
      "[data-codetime-status-popover]",
      statusRoot && statusPopover
        ? () => {
            initCodeTimeStatusPopover(
              statusRoot,
              statusPopover,
              statusController.signal,
              () => {
                refreshCodeTimeStatusImage(statusImage);
              },
            );
          }
        : undefined,
      statusController.signal,
    );

    statusRoot?.addEventListener(
      "pointerenter",
      (event) => {
        if (event.pointerType === "touch") return;

        refreshCodeTimeStatusImage(statusImage);
      },
      { signal: statusController.signal },
    );

    themeObserver = new MutationObserver(() => {
      if (statusImage.isConnected) {
        syncCodeTimeStatusTheme(statusImage);
      }
    });

    themeObserver.observe(document.documentElement, {
      attributeFilter: ["data-theme"],
      attributes: true,
    });
  }

  if (statusImage || statusRoot) {
    browserWindow.__homeShellCodeTimeCleanup = () => {
      statusController.abort();
      themeObserver?.disconnect();
    };
  } else {
    browserWindow.__homeShellCodeTimeCleanup = undefined;
  }
}
