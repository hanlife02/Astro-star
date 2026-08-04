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
  onUnavailable?: () => void,
  signal?: AbortSignal,
) {
  const settle = () => {
    if (signal?.aborted) return;

    if (image.naturalWidth <= 0) {
      hideCodeTimeElement(image, closestSelector);
      onUnavailable?.();
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
  if (!image.hasAttribute("src")) return;

  const theme =
    document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  const source = image.dataset.codetimeStatusSrc;

  if (!source) return;

  const url = new URL(source, window.location.href);

  if (url.searchParams.get("theme") === theme) return;

  url.searchParams.set("theme", theme);
  const nextSource = `${url.pathname}${url.search}`;

  if (image.getAttribute("src") !== nextSource) {
    image.src = nextSource;
  }
}

function requestCodeTimeStatusImage(
  image: HTMLImageElement,
  popover: HTMLElement,
  onUnavailable: () => void,
  signal: AbortSignal,
) {
  if (image.dataset.codetimeStatusRequested === "true") return;

  const source = image.dataset.codetimeStatusSrc;
  if (!source) return;

  const theme =
    document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  const url = new URL(source, window.location.href);
  url.searchParams.set("theme", theme);
  image.dataset.codetimeStatusRequested = "true";
  image.src = `${url.pathname}${url.search}`;
  settleCodeTimeImage(
    image,
    "[data-codetime-status-popover]",
    () => {
      popover.hidden = false;
    },
    onUnavailable,
    signal,
  );
}

function requestCodeTimeBadgeImage(
  image: HTMLImageElement,
  signal: AbortSignal,
) {
  if (image.dataset.codetimeBadgeRequested === "true") return;

  const source = image.dataset.codetimeBadgeSrc;
  if (!source) {
    hideCodeTimeElement(image, "[data-codetime-metric]");
    return;
  }

  const metric = image.closest<HTMLElement>("[data-codetime-metric]");
  image.dataset.codetimeBadgeRequested = "true";
  image.hidden = false;
  image.src = source;
  settleCodeTimeImage(
    image,
    "[data-codetime-metric]",
    () => {
      if (metric) {
        metric.dataset.codetimeState = "ready";
      }
    },
    undefined,
    signal,
  );
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
  const badgeController = new AbortController();
  const statusController = new AbortController();
  let themeObserver: MutationObserver | undefined;

  if (badgeImage) {
    requestCodeTimeBadgeImage(badgeImage, badgeController.signal);
  }

  if (statusImage && statusRoot && statusPopover) {
    const disableStatus = () => {
      statusController.abort();
      themeObserver?.disconnect();
    };

    const requestStatus = () => {
      requestCodeTimeStatusImage(
        statusImage,
        statusPopover,
        disableStatus,
        statusController.signal,
      );
    };

    initCodeTimeStatusPopover(
      statusRoot,
      statusPopover,
      statusController.signal,
      requestStatus,
    );

    statusRoot.addEventListener(
      "pointerenter",
      (event) => {
        if (event.pointerType === "touch") return;

        requestStatus();
      },
      { signal: statusController.signal },
    );

    themeObserver = new MutationObserver(() => {
      if (
        statusImage.isConnected &&
        statusImage.dataset.codetimeStatusRequested === "true"
      ) {
        syncCodeTimeStatusTheme(statusImage);
      }
    });

    themeObserver.observe(document.documentElement, {
      attributeFilter: ["data-theme"],
      attributes: true,
    });
  }

  if (badgeImage || statusImage || statusRoot) {
    browserWindow.__homeShellCodeTimeCleanup = () => {
      badgeController.abort();
      statusController.abort();
      themeObserver?.disconnect();
    };
  } else {
    browserWindow.__homeShellCodeTimeCleanup = undefined;
  }
}
