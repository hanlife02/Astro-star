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

  const signatureCollapseTrigger = signatureCollapse.querySelector<HTMLElement>(
    ".signature-collapse-trigger",
  );
  const signatureCollapsePanel = signatureCollapse.querySelector(
    ".signature-collapse-panel",
  );
  const desktopNavMedia = window.matchMedia(HOME_SHELL_DESKTOP_MEDIA_QUERY);
  let signatureCollapseWasOpenOnTriggerActivation = false;

  const isDesktopSignatureCollapseOpen = () =>
    signatureCollapse.open && signatureCollapse.dataset.panelState === "open";

  const syncDesktopSignatureCollapseHitArea = () => {
    if (!(signatureCollapsePanel instanceof HTMLElement)) return;

    signatureCollapse.style.setProperty(
      "--signature-collapse-panel-hit-height",
      `${signatureCollapsePanel.scrollHeight}px`,
    );
  };

  const syncDesktopSignatureCollapse = () => {
    window.clearTimeout(signatureCollapseCloseTimer);
    delete signatureCollapse.dataset.panelState;
    syncDesktopSignatureCollapseHitArea();

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

  const captureTriggerActivationState = () => {
    if (!desktopNavMedia.matches) return;

    signatureCollapseWasOpenOnTriggerActivation =
      isDesktopSignatureCollapseOpen();
  };

  const toggleDesktopSignatureCollapse = () => {
    if (!desktopNavMedia.matches) return;

    if (signatureCollapseWasOpenOnTriggerActivation) {
      closeDesktopSignatureCollapse();
    } else {
      openDesktopSignatureCollapse();
    }

    signatureCollapseWasOpenOnTriggerActivation = false;
  };

  syncDesktopSignatureCollapse();
  desktopNavMedia.addEventListener("change", syncDesktopSignatureCollapse, {
    signal: controller.signal,
  });
  window.addEventListener("resize", syncDesktopSignatureCollapseHitArea, {
    signal: controller.signal,
  });

  signatureCollapseTrigger?.addEventListener(
    "pointerdown",
    captureTriggerActivationState,
    { signal: controller.signal },
  );

  signatureCollapseTrigger?.addEventListener(
    "keydown",
    (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;

      captureTriggerActivationState();
    },
    { signal: controller.signal },
  );

  signatureCollapseTrigger?.addEventListener(
    "click",
    (event) => {
      if (!desktopNavMedia.matches) return;

      event.preventDefault();
      toggleDesktopSignatureCollapse();
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
    (event) => {
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
