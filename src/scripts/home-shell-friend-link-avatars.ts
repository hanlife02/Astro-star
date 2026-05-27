type FriendLinkAvatarWindow = Window & {
  __homeShellFriendLinkAvatarsCleanup?: () => void;
};

const AVATAR_SELECTOR = "[data-friend-link-avatar='true']";
const AVATAR_FRAME_SELECTOR = "[data-friend-link-avatar-frame='true']";

function syncAvatarState(image: HTMLImageElement) {
  const frame = image.closest<HTMLElement>(AVATAR_FRAME_SELECTOR);
  if (!frame) return;

  frame.dataset.avatarState =
    image.complete && image.naturalWidth > 0 ? "loaded" : "error";
}

export function initHomeShellFriendLinkAvatars() {
  const browserWindow = window as FriendLinkAvatarWindow;
  browserWindow.__homeShellFriendLinkAvatarsCleanup?.();

  const images = Array.from(
    document.querySelectorAll<HTMLImageElement>(AVATAR_SELECTOR),
  );

  if (images.length === 0) {
    browserWindow.__homeShellFriendLinkAvatarsCleanup = undefined;
    return;
  }

  const controller = new AbortController();
  browserWindow.__homeShellFriendLinkAvatarsCleanup = () => {
    controller.abort();
  };

  images.forEach((image) => {
    if (image.complete) {
      syncAvatarState(image);
      return;
    }

    image.addEventListener("load", () => syncAvatarState(image), {
      once: true,
      signal: controller.signal,
    });
    image.addEventListener("error", () => syncAvatarState(image), {
      once: true,
      signal: controller.signal,
    });
  });
}
