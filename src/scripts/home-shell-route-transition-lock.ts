type RouteTransitionWindow = Window & {
  __homeShellRouteTransitionLockBound?: boolean;
  __homeShellRouteTransitionUnlockTimer?: number;
};

type TransitionEventWithSignal = Event & {
  signal?: AbortSignal;
};

type TransitionEventWithViewTransition = Event & {
  newDocument?: Document;
  viewTransition?: {
    finished?: Promise<unknown>;
    updateCallbackDone?: Promise<unknown>;
  };
};

const ROUTE_TRANSITION_UNLOCK_TIMEOUT_MS = 2400;

export function initHomeShellRouteTransitionLock() {
  const browserWindow = window as RouteTransitionWindow;

  if (browserWindow.__homeShellRouteTransitionLockBound) return;

  const clearUnlockTimer = () => {
    window.clearTimeout(browserWindow.__homeShellRouteTransitionUnlockTimer);
    browserWindow.__homeShellRouteTransitionUnlockTimer = undefined;
  };

  const unlockRouteTransition = () => {
    clearUnlockTimer();
    delete document.documentElement.dataset.routeTransitioning;
  };

  const lockRouteTransition = () => {
    clearUnlockTimer();
    document.documentElement.dataset.routeTransitioning = "true";
    browserWindow.__homeShellRouteTransitionUnlockTimer = window.setTimeout(
      unlockRouteTransition,
      ROUTE_TRANSITION_UNLOCK_TIMEOUT_MS,
    );
  };

  const isModifiedClick = (event: MouseEvent) =>
    event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey;

  const getRoutedLink = (event: MouseEvent) => {
    const target = event.composedPath()[0];
    if (!(target instanceof Element)) return null;

    const link = target.closest("a, area");
    if (!(link instanceof HTMLAnchorElement) && !(link instanceof HTMLAreaElement)) return null;
    if (!link.href || link.hasAttribute("download") || link.dataset.astroReload !== undefined) return null;

    const linkTarget = link instanceof HTMLElement ? link.target : "";
    if (linkTarget && linkTarget !== "_self") return null;

    const url = new URL(link.href, window.location.href);
    if (url.origin !== window.location.origin) return null;
    if (url.pathname === window.location.pathname && url.search === window.location.search && url.hash) return null;

    return link;
  };

  document.addEventListener(
    "click",
    (event) => {
      if (event.defaultPrevented || isModifiedClick(event) || !getRoutedLink(event)) return;

      if (document.documentElement.dataset.routeTransitioning === "true") {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }

      lockRouteTransition();
    },
    { capture: true },
  );

  document.addEventListener("astro:before-preparation", (event) => {
    lockRouteTransition();

    const signal = (event as TransitionEventWithSignal).signal;
    signal?.addEventListener("abort", unlockRouteTransition, { once: true });
  });

  document.addEventListener("astro:before-swap", (event) => {
    const transitionEvent = event as TransitionEventWithViewTransition;
    transitionEvent.newDocument?.documentElement.setAttribute("data-route-transitioning", "true");

    const transitionDone =
      transitionEvent.viewTransition?.finished ?? transitionEvent.viewTransition?.updateCallbackDone;

    void transitionDone?.finally(unlockRouteTransition).catch(unlockRouteTransition);
  });

  window.addEventListener("pageshow", unlockRouteTransition);
  browserWindow.__homeShellRouteTransitionLockBound = true;
}
