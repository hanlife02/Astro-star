export function initHomeShellDesktopSignatureNav() {
  const shell = document.querySelector("[data-home-shell-root]");
  const signatureCollapse = shell?.querySelector("[data-home-shell-signature-nav]");
  if (!(signatureCollapse instanceof HTMLDetailsElement)) return;

  const signatureCollapseTrigger = signatureCollapse.querySelector(".signature-collapse-trigger");
  const desktopNavMedia = window.matchMedia("(min-width: 56.25rem)");
  let signatureCollapseCloseTimer = 0;

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
  desktopNavMedia.addEventListener("change", syncDesktopSignatureCollapse);

  signatureCollapseTrigger?.addEventListener("click", (event) => {
    if (!desktopNavMedia.matches) return;
    event.preventDefault();
  });

  signatureCollapse.addEventListener("mouseenter", () => {
    openDesktopSignatureCollapse();
  });

  signatureCollapse.addEventListener("mouseleave", () => {
    closeDesktopSignatureCollapse();
  });

  signatureCollapse.addEventListener("focusin", () => {
    openDesktopSignatureCollapse();
  });

  signatureCollapse.addEventListener("focusout", (event) => {
    if (!desktopNavMedia.matches) return;

    const relatedTarget = event.relatedTarget;
    if (relatedTarget instanceof Node && signatureCollapse.contains(relatedTarget)) return;

    closeDesktopSignatureCollapse();
  });
}
