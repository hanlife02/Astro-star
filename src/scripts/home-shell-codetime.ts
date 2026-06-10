type CodeTimeWindow = Window & {
  __homeShellCodeTimeCleanup?: () => void;
};

function hideCodeTimeElement(image: HTMLImageElement, closestSelector: string) {
  image.closest<HTMLElement>(closestSelector)?.remove();
}

function settleCodeTimeImage(image: HTMLImageElement, closestSelector: string) {
  const settle = () => {
    if (image.naturalWidth <= 0) {
      hideCodeTimeElement(image, closestSelector);
    }
  };

  if (image.complete) {
    settle();
    return;
  }

  image.addEventListener("load", settle, { once: true });
  image.addEventListener("error", settle, { once: true });
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

export function initHomeShellCodeTime() {
  const browserWindow = window as CodeTimeWindow;
  browserWindow.__homeShellCodeTimeCleanup?.();

  const badgeImage = document.querySelector<HTMLImageElement>(
    "[data-codetime-badge]",
  );
  const statusImage = document.querySelector<HTMLImageElement>(
    "[data-codetime-status]",
  );

  if (badgeImage) {
    settleCodeTimeImage(badgeImage, "[data-codetime-metric]");
  }

  if (statusImage) {
    syncCodeTimeStatusTheme(statusImage);
    settleCodeTimeImage(statusImage, "[data-codetime-status-popover]");

    const themeObserver = new MutationObserver(() => {
      if (statusImage.isConnected) {
        syncCodeTimeStatusTheme(statusImage);
      }
    });

    themeObserver.observe(document.documentElement, {
      attributeFilter: ["data-theme"],
      attributes: true,
    });

    browserWindow.__homeShellCodeTimeCleanup = () => {
      themeObserver.disconnect();
    };
  } else {
    browserWindow.__homeShellCodeTimeCleanup = undefined;
  }
}
