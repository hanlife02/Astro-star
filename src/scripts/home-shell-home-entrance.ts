type HomeEntranceWindow = Window & {
  __homeShellHomeEntranceCleanup?: () => void;
};

export const HOME_MAIN_READY_EVENT = "home-shell:main-ready";
const HOME_MAIN_WAIT_MS = 350;

export function initHomeShellHomeEntrance() {
  const browserWindow = window as HomeEntranceWindow;
  browserWindow.__homeShellHomeEntranceCleanup?.();

  const shell = document.querySelector<HTMLElement>(
    '[data-home-main-state="waiting"]',
  );
  if (!shell) return;

  const avatar = shell.querySelector<HTMLImageElement>(
    "[data-home-profile-avatar]",
  );
  const avatarFrame = avatar?.closest<HTMLElement>(
    "[data-profile-avatar-state]",
  );
  const controller = new AbortController();
  let revealed = false;

  const reveal = () => {
    if (revealed || controller.signal.aborted) return;

    revealed = true;
    shell.dataset.homeMainState = "ready";
    shell.dispatchEvent(new CustomEvent(HOME_MAIN_READY_EVENT));
  };

  const markAvatar = (state: "loaded" | "fallback") => {
    if (avatarFrame) {
      avatarFrame.dataset.profileAvatarState = state;
    }
  };

  const onLoad = () => {
    markAvatar("loaded");
    reveal();
  };
  const onError = () => {
    markAvatar("fallback");
    reveal();
  };

  if (!avatar) {
    reveal();
  } else if (avatar.complete) {
    if (avatar.naturalWidth > 0) {
      onLoad();
    } else {
      onError();
    }
  } else {
    avatar.addEventListener("load", onLoad, { signal: controller.signal });
    avatar.addEventListener("error", onError, { signal: controller.signal });
  }

  const waitTimer = window.setTimeout(() => {
    if (avatar && avatar.naturalWidth > 0) {
      markAvatar("loaded");
    } else {
      markAvatar("fallback");
    }
    reveal();
  }, HOME_MAIN_WAIT_MS);

  browserWindow.__homeShellHomeEntranceCleanup = () => {
    window.clearTimeout(waitTimer);
    controller.abort();
    browserWindow.__homeShellHomeEntranceCleanup = undefined;
  };
}
