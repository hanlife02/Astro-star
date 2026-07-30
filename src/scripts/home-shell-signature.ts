type HomeShellSignatureWindow = Window & {
  __homeShellSignatureCleanup?: () => void;
  __homeShellSignatureRoutePending?: boolean;
};

function parseSignatureSvg(markup: string) {
  const parsedDocument = new DOMParser().parseFromString(
    markup,
    "image/svg+xml",
  );
  const parsedSvg = parsedDocument.documentElement;

  if (parsedSvg.nodeName.toLowerCase() !== "svg") return null;

  const svg = document.importNode(parsedSvg, true);
  svg.classList.add("signature-svg");

  return svg;
}

async function hydrateSignature(
  signature: HTMLElement,
  assetSrc: string,
  signal: AbortSignal,
) {
  const assetUrl = new URL(assetSrc, window.location.href);
  if (assetUrl.origin !== window.location.origin) return;

  const response = await fetch(assetUrl, {
    credentials: "same-origin",
    signal,
  });
  if (!response.ok || signal.aborted) return;

  const svg = parseSignatureSvg(await response.text());
  if (!svg || signal.aborted) return;

  signature.replaceChildren(svg);
  signature.dataset.signatureInline = "true";
  signature.dataset.signatureLoaded = "true";
}

export function initHomeShellSignature() {
  const browserWindow = window as HomeShellSignatureWindow;
  browserWindow.__homeShellSignatureCleanup?.();

  const controller = new AbortController();
  const signatures = document.querySelectorAll<HTMLElement>(
    "[data-signature-asset]",
  );
  const currentPathname = window.location.pathname.replace(/\/+$/, "") || "/";
  const shouldLockIncomingRouteHover =
    browserWindow.__homeShellSignatureRoutePending === true &&
    currentPathname === "/" &&
    document.documentElement.dataset.routeSwapping === "true";

  browserWindow.__homeShellSignatureRoutePending = false;

  signatures.forEach((signature) => {
    const signatureLink = signature.closest(".signature-wrap");

    // A swapped Home link inherits the pointer position but not a new hover intent.
    if (
      shouldLockIncomingRouteHover ||
      signature.dataset.signatureHoverLocked === "true"
    ) {
      signature.dataset.signatureHoverLocked = "true";
      const armRouteHoverUnlock = () => {
        if (controller.signal.aborted) return;
        if (document.documentElement.dataset.routeTransitioning === "true") {
          requestAnimationFrame(armRouteHoverUnlock);
          return;
        }

        signatureLink?.addEventListener(
          "pointerleave",
          () => delete signature.dataset.signatureHoverLocked,
          { once: true, signal: controller.signal },
        );
      };
      requestAnimationFrame(armRouteHoverUnlock);
    }

    if (signatureLink instanceof HTMLAnchorElement) {
      signatureLink.addEventListener(
        "click",
        (event) => {
          if (
            event.button !== 0 ||
            event.metaKey ||
            event.ctrlKey ||
            event.altKey ||
            event.shiftKey ||
            currentPathname === "/"
          )
            return;

          browserWindow.__homeShellSignatureRoutePending = true;
        },
        { signal: controller.signal },
      );
    }

    if (signature.dataset.signatureLoaded === "true") return;

    const assetSrc = signature.dataset.signatureAsset;
    if (!assetSrc) return;

    void hydrateSignature(signature, assetSrc, controller.signal).catch(() => {
      // Keep the CSS mask fallback when the SVG cannot be fetched or parsed.
    });
  });

  browserWindow.__homeShellSignatureCleanup = () => controller.abort();
}
