type HomeShellContentFoldWindow = Window & {
  __homeShellContentFoldCleanup?: () => void;
};

const FOLD_SELECTOR = ".content-fold";
const FOLD_BODY_SELECTOR = ".content-fold-body";
const FOLD_ANIMATION_MS = 260;

function getFoldBody(fold: HTMLElement) {
  const body = fold.querySelector(FOLD_BODY_SELECTOR);
  return body instanceof HTMLElement ? body : null;
}

function syncFoldHeight(fold: HTMLElement) {
  const body = getFoldBody(fold);
  if (!body) return;

  fold.style.setProperty(
    "--content-fold-body-height",
    `${body.scrollHeight}px`,
  );
}

function setFoldOpen(fold: HTMLDetailsElement, open: boolean) {
  const body = getFoldBody(fold);

  if (!body || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    fold.open = open;
    if (open) syncFoldHeight(fold);
    return;
  }

  window.clearTimeout(Number(fold.dataset.foldTimer || 0));
  syncFoldHeight(fold);

  if (open) {
    fold.open = true;
    fold.dataset.foldState = "opening";
    requestAnimationFrame(() => {
      syncFoldHeight(fold);
      fold.dataset.foldState = "open";
    });
    return;
  }

  fold.dataset.foldState = "closing";
  syncFoldHeight(fold);

  requestAnimationFrame(() => {
    fold.style.setProperty("--content-fold-body-height", "0px");
  });

  const timer = window.setTimeout(() => {
    fold.open = false;
    fold.dataset.foldState = "closed";
    fold.dataset.foldTimer = "";
  }, FOLD_ANIMATION_MS);

  fold.dataset.foldTimer = String(timer);
}

function initFold(fold: HTMLDetailsElement, controller: AbortController) {
  const body = getFoldBody(fold);
  if (!body || fold.dataset.foldReady === "true") return;

  fold.dataset.foldReady = "true";
  fold.dataset.foldState = fold.open ? "open" : "closed";

  if (fold.open) {
    syncFoldHeight(fold);
  }

  fold.addEventListener(
    "click",
    (event) => {
      const summary =
        event.target instanceof Element
          ? event.target.closest(".content-fold-summary")
          : null;

      if (!summary) return;

      event.preventDefault();
      setFoldOpen(fold, !fold.open);
    },
    { signal: controller.signal },
  );
}

export function initHomeShellContentFold() {
  const browserWindow = window as HomeShellContentFoldWindow;
  browserWindow.__homeShellContentFoldCleanup?.();

  const folds = Array.from(
    document.querySelectorAll<HTMLDetailsElement>(FOLD_SELECTOR),
  );

  if (folds.length === 0) {
    browserWindow.__homeShellContentFoldCleanup = undefined;
    return;
  }

  const controller = new AbortController();
  browserWindow.__homeShellContentFoldCleanup = () => {
    folds.forEach((fold) => {
      window.clearTimeout(Number(fold.dataset.foldTimer || 0));
      delete fold.dataset.foldReady;
      delete fold.dataset.foldState;
      delete fold.dataset.foldTimer;
    });
    controller.abort();
  };

  folds.forEach((fold) => {
    initFold(fold, controller);
  });

  window.addEventListener(
    "resize",
    () => {
      folds.forEach((fold) => {
        if (fold.open) syncFoldHeight(fold);
      });
    },
    { signal: controller.signal },
  );
}
