type HomeShellCodeCopyWindow = Window & {
  __homeShellCodeCopyCleanup?: () => void;
};

const COPY_STATE_RESET_MS = 1600;

const CODE_COPY_ICONS = {
  idle: {
    label: "Copy code block",
    icon: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg>`,
  },
  copied: {
    label: "Code copied",
    icon: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"></path></svg>`,
  },
  failed: {
    label: "Copy failed",
    icon: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>`,
  },
} as const;

type CodeCopyState = keyof typeof CODE_COPY_ICONS;

async function copyText(text: string) {
  if (!navigator.clipboard?.writeText) {
    throw new Error("Clipboard API is unavailable.");
  }

  await navigator.clipboard.writeText(text);
}

function setCopyButtonState(button: HTMLButtonElement, state: CodeCopyState) {
  const { label, icon } = CODE_COPY_ICONS[state];
  button.dataset.copyState = state;
  button.setAttribute("aria-label", label);
  button.title = label;
  button.innerHTML = icon;
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
  const initializedBlocks: HTMLElement[] = [];
  const copyButtons: HTMLButtonElement[] = [];
  browserWindow.__homeShellCodeCopyCleanup = () => {
    resetTimers.forEach((timer) => {
      window.clearTimeout(timer);
    });
    copyButtons.forEach((button) => {
      button.remove();
    });
    initializedBlocks.forEach((block) => {
      delete block.dataset.codeCopyInitialized;
    });
    controller.abort();
  };

  codeBlocks.forEach((block) => {
    block
      .querySelectorAll<HTMLButtonElement>(":scope > .content-code-copy")
      .forEach((button) => {
        button.remove();
      });
    delete block.dataset.codeCopyInitialized;

    const code = block.querySelector("code");
    if (!(code instanceof HTMLElement)) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "content-code-copy";
    setCopyButtonState(button, "idle");

    button.addEventListener(
      "click",
      async () => {
        try {
          await copyText(code.textContent ?? "");
          setCopyButtonState(button, "copied");
          const timer = window.setTimeout(() => {
            setCopyButtonState(button, "idle");
          }, COPY_STATE_RESET_MS);
          resetTimers.push(timer);
        } catch {
          setCopyButtonState(button, "failed");
          const timer = window.setTimeout(() => {
            setCopyButtonState(button, "idle");
          }, COPY_STATE_RESET_MS);
          resetTimers.push(timer);
        }
      },
      { signal: controller.signal },
    );

    block.dataset.codeCopyInitialized = "true";
    block.append(button);
    initializedBlocks.push(block);
    copyButtons.push(button);
  });
}
