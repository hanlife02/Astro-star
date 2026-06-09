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

function trackAvatarImage(image: HTMLImageElement, signal: AbortSignal) {
  if (image.complete) {
    syncAvatarState(image);
    return;
  }

  const cleanup = () => {
    image.removeEventListener("load", settle);
    image.removeEventListener("error", settle);
    signal.removeEventListener("abort", cleanup);
  };
  const settle = () => {
    cleanup();
    syncAvatarState(image);
  };

  image.addEventListener("load", settle);
  image.addEventListener("error", settle);
  signal.addEventListener("abort", cleanup, { once: true });
}

function initGridAvatars(grid: HTMLElement, controller: AbortController) {
  const images = Array.from(
    grid.querySelectorAll<HTMLImageElement>(AVATAR_SELECTOR),
  );

  grid.dataset.friendLinksState = "ready";
  grid.setAttribute("aria-busy", "false");

  images.forEach((image) => {
    trackAvatarImage(image, controller.signal);
  });
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
    initGridAvatars(grid, controller);
  });
}
