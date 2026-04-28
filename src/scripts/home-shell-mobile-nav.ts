import { HOME_SHELL_DESKTOP_MEDIA_QUERY } from "./home-shell-breakpoints";

type HomeShellMobileNavWindow = Window & {
  __homeShellMobileNavCleanup?: () => void;
};

export function initHomeShellMobileNav() {
  const browserWindow = window as HomeShellMobileNavWindow;
  browserWindow.__homeShellMobileNavCleanup?.();

  const controller = new AbortController();
  browserWindow.__homeShellMobileNavCleanup = () => {
    controller.abort();
  };

  const shell = document.querySelector("[data-home-shell-root]");
  const mobileNavDrawer = shell?.querySelector("[data-home-shell-mobile-nav]");
  if (!(mobileNavDrawer instanceof HTMLDetailsElement)) return;

  const mobileNavMedia = window.matchMedia(HOME_SHELL_DESKTOP_MEDIA_QUERY);

  const closeMobileNavDrawer = () => {
    if (mobileNavMedia.matches) return;
    mobileNavDrawer.open = false;
  };

  document.addEventListener(
    "click",
    (event) => {
      if (mobileNavMedia.matches || !mobileNavDrawer.open) return;
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (mobileNavDrawer.contains(target)) return;
      closeMobileNavDrawer();
    },
    { signal: controller.signal },
  );

  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key !== "Escape") return;
      closeMobileNavDrawer();
    },
    { signal: controller.signal },
  );

  mobileNavMedia.addEventListener(
    "change",
    () => {
      if (mobileNavMedia.matches) {
        mobileNavDrawer.open = false;
      }
    },
    { signal: controller.signal },
  );
}
