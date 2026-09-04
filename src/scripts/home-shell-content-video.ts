type VideoFrame = HTMLElement & {
  dataset: DOMStringMap;
};

type ContentVideoWindow = Window & {
  __homeShellContentVideoCleanup?: () => void;
};

const VIDEO_FRAME_SELECTOR = ".content-video-frame[data-video-player='true']";

function getVideoMedia(frame: VideoFrame) {
  return frame.querySelector("[data-video-src]") as
    | HTMLVideoElement
    | HTMLIFrameElement
    | null;
}

function getVideoButton(frame: VideoFrame) {
  return frame.querySelector(
    "[data-video-play='true']",
  ) as HTMLButtonElement | null;
}

export function showVideoError(frame: VideoFrame) {
  const button = getVideoButton(frame);
  const sourceLink = frame.querySelector(
    "[data-video-source-link='true']",
  ) as HTMLAnchorElement | null;
  const error = frame.querySelector(
    "[data-video-error='true']",
  ) as HTMLElement | null;

  if (button) button.hidden = false;
  if (sourceLink) sourceLink.hidden = false;
  if (error) error.hidden = false;
  frame.dataset.videoState = "error";
}

export function activateVideoPlayer(frame: VideoFrame) {
  const media = getVideoMedia(frame);
  const source = media?.getAttribute("data-video-src");
  if (!media || !source) return;

  media.setAttribute("src", source);
  const button = getVideoButton(frame);
  if (button) button.hidden = true;
  frame.dataset.videoState = "loading";

  if (media.tagName.toLowerCase() !== "video") {
    frame.dataset.videoState = "ready";
    return;
  }

  const video = media as HTMLVideoElement;
  video.load();
  try {
    const playResult = video.play();
    if (playResult && typeof playResult.catch === "function") {
      void playResult.catch(() => {
        // Browser autoplay policy may reject scripted playback. Native controls
        // remain available after the placeholder is dismissed.
      });
    }
  } catch {
    // Some browsers throw synchronously when scripted playback is unavailable.
  }
  frame.dataset.videoState = "ready";
}

export function initHomeShellContentVideo() {
  const browserWindow = window as ContentVideoWindow;
  browserWindow.__homeShellContentVideoCleanup?.();

  const frames = Array.from(
    document.querySelectorAll<VideoFrame>(VIDEO_FRAME_SELECTOR),
  );
  if (frames.length === 0) {
    browserWindow.__homeShellContentVideoCleanup = undefined;
    return;
  }

  const controller = new AbortController();
  browserWindow.__homeShellContentVideoCleanup = () => controller.abort();

  frames.forEach((frame) => {
    const media = getVideoMedia(frame);
    const button = getVideoButton(frame);
    if (!media || !button) return;

    button.addEventListener("click", () => activateVideoPlayer(frame), {
      signal: controller.signal,
    });
    media.addEventListener("error", () => showVideoError(frame), {
      signal: controller.signal,
    });
  });
}

export function cleanupHomeShellContentVideo() {
  const browserWindow = window as ContentVideoWindow;
  browserWindow.__homeShellContentVideoCleanup?.();
  browserWindow.__homeShellContentVideoCleanup = undefined;
}
