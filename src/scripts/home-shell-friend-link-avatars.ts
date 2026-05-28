type FriendLinkAvatarWindow = Window & {
  __homeShellFriendLinkAvatarsCleanup?: () => void;
};

const GRID_SELECTOR = "[data-friend-links-grid='true']";
const AVATAR_SELECTOR = "[data-friend-link-avatar='true']";
const AVATAR_FRAME_SELECTOR = "[data-friend-link-avatar-frame='true']";

function syncAvatarState(image: HTMLImageElement) {
  const frame = image.closest<HTMLElement>(AVATAR_FRAME_SELECTOR);
  if (!frame) return;

  frame.dataset.avatarState =
    image.complete && image.naturalWidth > 0 ? "loaded" : "error";
}

async function decodeLoadedImage(image: HTMLImageElement) {
  if (image.naturalWidth <= 0 || typeof image.decode !== "function") {
    return;
  }

  try {
    await image.decode();
  } catch {
    return;
  }
}

async function settleImage(image: HTMLImageElement, signal: AbortSignal) {
  if (!signal.aborted && !image.complete) {
    await new Promise<void>((resolve) => {
      const cleanup = () => {
        image.removeEventListener("load", settle);
        image.removeEventListener("error", settle);
        signal.removeEventListener("abort", abort);
      };
      const settle = () => {
        cleanup();
        resolve();
      };
      const abort = () => {
        cleanup();
        resolve();
      };

      image.addEventListener("load", settle);
      image.addEventListener("error", settle);
      signal.addEventListener("abort", abort, { once: true });
    });
  }

  if (signal.aborted) return;

  await decodeLoadedImage(image);
  syncAvatarState(image);
}

async function revealGridWhenReady(
  grid: HTMLElement,
  controller: AbortController,
) {
  const images = Array.from(
    grid.querySelectorAll<HTMLImageElement>(AVATAR_SELECTOR),
  );

  grid.dataset.friendLinksState = "loading";
  grid.setAttribute("aria-busy", "true");

  await Promise.all(
    images.map((image) => settleImage(image, controller.signal)),
  );

  if (controller.signal.aborted) return;

  grid.dataset.friendLinksState = "ready";
  grid.setAttribute("aria-busy", "false");
}

export function initHomeShellFriendLinkAvatars() {
  const browserWindow = window as FriendLinkAvatarWindow;
  browserWindow.__homeShellFriendLinkAvatarsCleanup?.();

  const grids = Array.from(
    document.querySelectorAll<HTMLElement>(GRID_SELECTOR),
  );

  if (grids.length === 0) {
    browserWindow.__homeShellFriendLinkAvatarsCleanup = undefined;
    return;
  }

  const controller = new AbortController();
  browserWindow.__homeShellFriendLinkAvatarsCleanup = () => {
    controller.abort();
  };

  grids.forEach((grid) => {
    void revealGridWhenReady(grid, controller);
  });
}
