import { HOME_SHELL_DESKTOP_MEDIA_QUERY } from "./home-shell-breakpoints";

type HomeShellDesktopSignatureNavWindow = Window & {
  __homeShellDesktopSignatureNavCleanup?: () => void;
};

export function initHomeShellDesktopSignatureNav() {
  const browserWindow = window as HomeShellDesktopSignatureNavWindow;
  browserWindow.__homeShellDesktopSignatureNavCleanup?.();

  const controller = new AbortController();
  const shell = document.querySelector("[data-home-shell-root]");
  const signatureCollapse = shell?.querySelector(
    "[data-home-shell-signature-nav]",
  );
  let signatureCollapseCloseTimer = 0;

  browserWindow.__homeShellDesktopSignatureNavCleanup = () => {
    window.clearTimeout(signatureCollapseCloseTimer);
    controller.abort();
  };

  if (!(signatureCollapse instanceof HTMLDetailsElement)) return;

  const signatureCollapseTrigger = signatureCollapse.querySelector(
    ".signature-collapse-trigger",
  );
  const desktopNavMedia = window.matchMedia(HOME_SHELL_DESKTOP_MEDIA_QUERY);

  const syncDesktopSignatureCollapse = () => {
    window.clearTimeout(signatureCollapseCloseTimer);
    delete signatureCollapse.dataset.panelState;

    if (desktopNavMedia.matches && signatureCollapse.open) {
      signatureCollapse.open = false;
    }
  };

  const openDesktopSignatureCollapse = () => {
    if (!desktopNavMedia.matches) return;

    window.clearTimeout(signatureCollapseCloseTimer);
    signatureCollapse.open = true;
    signatureCollapse.dataset.panelState = "open";
  };

  const closeDesktopSignatureCollapse = () => {
    if (!desktopNavMedia.matches) return;

    window.clearTimeout(signatureCollapseCloseTimer);
    signatureCollapse.dataset.panelState = "closing";
    signatureCollapseCloseTimer = window.setTimeout(() => {
      signatureCollapse.open = false;
      delete signatureCollapse.dataset.panelState;
    }, 280);
  };

  syncDesktopSignatureCollapse();
  desktopNavMedia.addEventListener("change", syncDesktopSignatureCollapse, {
    signal: controller.signal,
  });

  signatureCollapseTrigger?.addEventListener(
    "click",
    (event) => {
      if (!desktopNavMedia.matches) return;
      event.preventDefault();
    },
    { signal: controller.signal },
  );

  signatureCollapse.addEventListener(
    "mouseenter",
    () => {
      openDesktopSignatureCollapse();
    },
    { signal: controller.signal },
  );

  signatureCollapse.addEventListener(
    "mouseleave",
    () => {
      closeDesktopSignatureCollapse();
    },
    { signal: controller.signal },
  );

  signatureCollapse.addEventListener(
    "focusin",
    () => {
      openDesktopSignatureCollapse();
    },
    { signal: controller.signal },
  );

  signatureCollapse.addEventListener(
    "focusout",
    (event) => {
      if (!desktopNavMedia.matches) return;

      const relatedTarget = event.relatedTarget;
      if (
        relatedTarget instanceof Node &&
        signatureCollapse.contains(relatedTarget)
      )
        return;

      closeDesktopSignatureCollapse();
    },
    { signal: controller.signal },
  );
}
