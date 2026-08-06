type ProfileAvatarWindow = Window & {
  __homeShellProfileAvatarCleanup?: () => void;
};

export function initHomeShellProfileAvatar() {
  const browserWindow = window as ProfileAvatarWindow;
  browserWindow.__homeShellProfileAvatarCleanup?.();

  const avatar = document.querySelector<HTMLImageElement>(
    "[data-home-profile-avatar]",
  );
  const avatarFrame = avatar?.closest<HTMLElement>(
    "[data-profile-avatar-state]",
  );

  if (!avatar || !avatarFrame) return;

  const controller = new AbortController();
  const markLoaded = () => {
    avatarFrame.dataset.profileAvatarState = "loaded";
  };
  const markFallback = () => {
    avatarFrame.dataset.profileAvatarState = "fallback";
  };

  if (avatar.complete) {
    if (avatar.naturalWidth > 0) {
      markLoaded();
    } else {
      markFallback();
    }
  } else {
    avatar.addEventListener("load", markLoaded, {
      once: true,
      signal: controller.signal,
    });
    avatar.addEventListener("error", markFallback, {
      once: true,
      signal: controller.signal,
    });
  }

  browserWindow.__homeShellProfileAvatarCleanup = () => {
    controller.abort();
    browserWindow.__homeShellProfileAvatarCleanup = undefined;
  };
}
