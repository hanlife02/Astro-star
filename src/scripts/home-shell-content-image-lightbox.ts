type HomeShellImageLightboxWindow = Window & {
  __homeShellImageLightboxBound?: boolean;
};

const LIGHTBOX_ID = "content-image-lightbox";

function getImageCaption(image: HTMLImageElement) {
  const figure = image.closest(".content-image-figure");
  const caption = figure?.querySelector(".content-image-caption");

  return caption?.textContent?.trim() || image.alt.trim();
}

function createLightbox() {
  const existingLightbox = document.getElementById(LIGHTBOX_ID);
  if (existingLightbox instanceof HTMLElement) return existingLightbox;

  const lightbox = document.createElement("div");
  lightbox.id = LIGHTBOX_ID;
  lightbox.className = "content-image-lightbox";
  lightbox.hidden = true;
  lightbox.setAttribute("role", "dialog");
  lightbox.setAttribute("aria-modal", "true");

  const backdrop = document.createElement("button");
  backdrop.className = "content-image-lightbox-backdrop";
  backdrop.type = "button";
  backdrop.setAttribute("aria-label", "Close image preview");
  backdrop.dataset.contentImageLightboxClose = "true";

  const frame = document.createElement("figure");
  frame.className = "content-image-lightbox-frame";

  const closeButton = document.createElement("button");
  closeButton.className = "content-image-lightbox-close";
  closeButton.type = "button";
  closeButton.setAttribute("aria-label", "Close image preview");
  closeButton.dataset.contentImageLightboxClose = "true";

  const closeIcon = document.createElement("span");
  closeIcon.setAttribute("aria-hidden", "true");
  closeButton.append(closeIcon);

  const image = document.createElement("img");
  image.className = "content-image-lightbox-image";
  image.decoding = "async";
  image.alt = "";

  const caption = document.createElement("figcaption");
  caption.className = "content-image-lightbox-caption";
  caption.hidden = true;

  frame.append(closeButton, image, caption);
  lightbox.append(backdrop, frame);
  document.body.append(lightbox);

  return lightbox;
}

function getLightboxImage(lightbox: HTMLElement) {
  return lightbox.querySelector(".content-image-lightbox-image");
}

function getLightboxCaption(lightbox: HTMLElement) {
  return lightbox.querySelector(".content-image-lightbox-caption");
}

function closeLightbox() {
  const lightbox = document.getElementById(LIGHTBOX_ID);
  if (!(lightbox instanceof HTMLElement) || lightbox.hidden) return;

  lightbox.dataset.lightboxState = "closing";
  document.documentElement.classList.remove("content-image-lightbox-open");

  window.setTimeout(() => {
    lightbox.hidden = true;
    lightbox.dataset.lightboxState = "closed";
  }, 180);
}

function openLightbox(sourceImage: HTMLImageElement) {
  const lightbox = createLightbox();
  const image = getLightboxImage(lightbox);
  const caption = getLightboxCaption(lightbox);
  const captionText = getImageCaption(sourceImage);

  if (!(image instanceof HTMLImageElement)) return;

  image.src = sourceImage.currentSrc || sourceImage.src;
  image.alt = sourceImage.alt;

  if (caption instanceof HTMLElement) {
    caption.textContent = captionText;
    caption.hidden = !captionText;
  }

  lightbox.hidden = false;
  lightbox.dataset.lightboxState = "open";
  document.documentElement.classList.add("content-image-lightbox-open");
}

function getClickedContentImage(target: EventTarget | null) {
  if (!(target instanceof Element)) return null;

  const image = target.closest(".content-image-figure img");
  return image instanceof HTMLImageElement ? image : null;
}

export function initHomeShellContentImageLightbox() {
  createLightbox();

  const browserWindow = window as HomeShellImageLightboxWindow;
  if (browserWindow.__homeShellImageLightboxBound) return;

  browserWindow.__homeShellImageLightboxBound = true;

  document.addEventListener("click", (event) => {
    const closeTarget =
      event.target instanceof Element
        ? event.target.closest("[data-content-image-lightbox-close='true']")
        : null;

    if (closeTarget) {
      closeLightbox();
      return;
    }

    const image = getClickedContentImage(event.target);
    if (!image) return;

    event.preventDefault();
    openLightbox(image);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeLightbox();
    }
  });
}
