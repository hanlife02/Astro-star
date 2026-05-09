type HomeShellCodeCopyWindow = Window & {
  __homeShellCodeCopyCleanup?: () => void;
};

const COPIED_LABEL_RESET_MS = 1600;

async function copyText(text: string) {
  if (!navigator.clipboard?.writeText) {
    throw new Error("Clipboard API is unavailable.");
  }

  await navigator.clipboard.writeText(text);
}

export function initHomeShellCodeCopy() {
  const browserWindow = window as HomeShellCodeCopyWindow;
  browserWindow.__homeShellCodeCopyCleanup?.();

  const codeBlocks = Array.from(
    document.querySelectorAll<HTMLElement>(".content-page-body pre"),
  );

  if (codeBlocks.length === 0) {
    browserWindow.__homeShellCodeCopyCleanup = undefined;
    return;
  }

  const controller = new AbortController();
  const resetTimers: number[] = [];
  browserWindow.__homeShellCodeCopyCleanup = () => {
    resetTimers.forEach((timer) => {
      window.clearTimeout(timer);
    });
    controller.abort();
  };

  codeBlocks.forEach((block) => {
    if (block.dataset.codeCopyInitialized === "true") return;

    const code = block.querySelector("code");
    if (!(code instanceof HTMLElement)) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "content-code-copy";
    button.textContent = "Copy";
    button.setAttribute("aria-label", "Copy code block");

    button.addEventListener(
      "click",
      async () => {
        try {
          await copyText(code.textContent ?? "");
          button.textContent = "Copied";
          const timer = window.setTimeout(() => {
            button.textContent = "Copy";
          }, COPIED_LABEL_RESET_MS);
          resetTimers.push(timer);
        } catch {
          button.textContent = "Failed";
          const timer = window.setTimeout(() => {
            button.textContent = "Copy";
          }, COPIED_LABEL_RESET_MS);
          resetTimers.push(timer);
        }
      },
      { signal: controller.signal },
    );

    block.dataset.codeCopyInitialized = "true";
    block.append(button);
  });
}
