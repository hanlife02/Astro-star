type HomeShellSignatureWindow = Window & {
  __homeShellSignatureCleanup?: () => void;
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

  signatures.forEach((signature) => {
    if (signature.dataset.signatureLoaded === "true") return;

    const assetSrc = signature.dataset.signatureAsset;
    if (!assetSrc) return;

    void hydrateSignature(signature, assetSrc, controller.signal).catch(() => {
      // Keep the CSS mask fallback when the SVG cannot be fetched or parsed.
    });
  });

  browserWindow.__homeShellSignatureCleanup = () => controller.abort();
}
