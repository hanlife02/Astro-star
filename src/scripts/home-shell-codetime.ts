function hideCodeTimeBadge(image: HTMLImageElement) {
  image.closest<HTMLElement>("[data-codetime-metric]")?.remove();
}

function settleCodeTimeBadge(image: HTMLImageElement) {
  const settle = () => {
    if (image.naturalWidth <= 0) {
      hideCodeTimeBadge(image);
    }
  };

  if (image.complete) {
    settle();
    return;
  }

  image.addEventListener("load", settle, { once: true });
  image.addEventListener("error", settle, { once: true });
}

export function initHomeShellCodeTime() {
  const image = document.querySelector<HTMLImageElement>(
    "[data-codetime-badge]",
  );
  if (!image) return;

  settleCodeTimeBadge(image);
}
