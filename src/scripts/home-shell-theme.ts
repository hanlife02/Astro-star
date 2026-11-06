const STORAGE_KEY = "theme-preference";
const RESOLVED_COOKIE_KEY = "theme-resolved";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const VALID_MODES = ["light", "dark", "system"] as const;

type ThemeMode = (typeof VALID_MODES)[number];
type HomeShellThemeWindow = Window & {
  __homeShellThemeCleanup?: () => void;
};

export function initHomeShellTheme() {
  const browserWindow = window as HomeShellThemeWindow;
  browserWindow.__homeShellThemeCleanup?.();

  const controller = new AbortController();
  const toggleButton = document.getElementById("theme-toggle");
  const icons = {
    light: toggleButton?.querySelector('[data-theme-icon="light"]'),
    dark: toggleButton?.querySelector('[data-theme-icon="dark"]'),
    system: toggleButton?.querySelector('[data-theme-icon="system"]'),
  };
  const snowBackground = document.querySelector(".snow-bg");
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const root = document.documentElement;
  let activeTransition: ViewTransition | undefined;
  let revealAnimation: Animation | undefined;

  const cancelTransition = () => {
    activeTransition?.skipTransition();
    activeTransition = undefined;
    revealAnimation?.cancel();
    revealAnimation = undefined;
    delete root.dataset.themeTransitioning;
    if (toggleButton) delete toggleButton.dataset.themeChanging;
  };

  let currentMode: ThemeMode = "system";
  browserWindow.__homeShellThemeCleanup = () => {
    controller.abort();
    cancelTransition();
  };

  const resolveMode = (mode: ThemeMode) =>
    mode === "system" ? (media.matches ? "dark" : "light") : mode;
  const readCookie = (key: string) => {
    try {
      const match = document.cookie.match(
        new RegExp(
          `(?:^|; )${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]*)`,
        ),
      );
      return match ? decodeURIComponent(match[1]) : "";
    } catch {
      return "";
    }
  };
  const writeCookie = (key: string, value: string) => {
    try {
      document.cookie = `${key}=${encodeURIComponent(value)}; Max-Age=${COOKIE_MAX_AGE}; Path=/; SameSite=Lax`;
    } catch {
      // Cookie persistence is optional; the resolved theme still applies.
    }
  };
  const readStoredThemeMode = () => {
    try {
      return window.localStorage.getItem(STORAGE_KEY);
    } catch {
      return "";
    }
  };
  const writeStoredThemeMode = (mode: ThemeMode) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // Storage can be unavailable in private or restricted browsing contexts.
    }
  };

  const nextMode = (mode: ThemeMode): ThemeMode => {
    const index = VALID_MODES.indexOf(mode);
    return VALID_MODES[(index + 1) % VALID_MODES.length];
  };

  const syncToggle = (mode: ThemeMode) => {
    const next = nextMode(mode);

    if (toggleButton instanceof HTMLButtonElement) {
      toggleButton.setAttribute(
        "aria-label",
        `Current theme: ${mode}. Click to switch to ${next}.`,
      );
    }

    Object.entries(icons).forEach(([iconMode, iconNode]) => {
      if (!(iconNode instanceof HTMLElement)) return;
      iconNode.hidden = iconMode !== mode;
    });
  };

  const getInitialMode = (): ThemeMode => {
    const stored = readStoredThemeMode();
    if (stored && VALID_MODES.includes(stored as ThemeMode))
      return stored as ThemeMode;
    const cookieMode = readCookie(STORAGE_KEY);
    if (cookieMode && VALID_MODES.includes(cookieMode as ThemeMode))
      return cookieMode as ThemeMode;
    const rootMode = document.documentElement.dataset.themeMode;
    if (rootMode && VALID_MODES.includes(rootMode as ThemeMode))
      return rootMode as ThemeMode;
    return "system";
  };

  const applyTheme = (mode: ThemeMode) => {
    currentMode = mode;
    const resolved = resolveMode(mode);

    document.documentElement.dataset.themeMode = mode;
    document.documentElement.dataset.theme = resolved;
    document.documentElement.style.colorScheme = resolved;
    document.documentElement.style.backgroundColor =
      resolved === "dark" ? "#000000" : "#ffffff";

    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta instanceof HTMLMetaElement) {
      themeColorMeta.content = resolved === "dark" ? "#000000" : "#ffffff";
    }

    if (snowBackground instanceof HTMLElement) {
      snowBackground.dataset.mode = resolved;
    }

    syncToggle(mode);
    writeStoredThemeMode(mode);
    writeCookie(STORAGE_KEY, mode);
    writeCookie(RESOLVED_COOKIE_KEY, resolved);
  };

  const toggleTheme = async () => {
    if (activeTransition) return;
    const mode = nextMode(currentMode);
    if (
      reducedMotion.matches ||
      typeof document.startViewTransition !== "function" ||
      root.dataset.routeTransitioning === "true" ||
      root.dataset.theme === resolveMode(mode) ||
      !toggleButton
    ) {
      applyTheme(mode);
      return;
    }

    const bounds = toggleButton.getBoundingClientRect();
    const x = bounds.left + bounds.width / 2;
    const y = bounds.top + bounds.height / 2;
    const radius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );
    let transition: ViewTransition | undefined;
    let applied = false;
    root.dataset.themeTransitioning = "true";
    toggleButton.dataset.themeChanging = "true";

    try {
      transition = document.startViewTransition(() => {
        if (controller.signal.aborted) return;
        applyTheme(mode);
        applied = true;
      });
      activeTransition = transition;
      // A hidden tab or an Astro navigation can skip the snapshot capture.
      void transition.finished.catch(() => {});
      await transition.ready;
      if (controller.signal.aborted || activeTransition !== transition) return;

      revealAnimation = root.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${Math.ceil(radius)}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 650,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          pseudoElement: "::view-transition-new(root)",
          fill: "both",
        },
      );
      await revealAnimation.finished;
    } catch {
      // Theme selection must still work when a browser cannot capture snapshots.
      if (!controller.signal.aborted && !applied) applyTheme(mode);
    } finally {
      if (activeTransition === transition) cancelTransition();
    }
  };

  toggleButton?.addEventListener("click", () => void toggleTheme(), {
    signal: controller.signal,
  });
  document.addEventListener("astro:before-preparation", cancelTransition, {
    signal: controller.signal,
  });
  window.addEventListener("resize", cancelTransition, {
    signal: controller.signal,
  });
  reducedMotion.addEventListener(
    "change",
    () => {
      if (reducedMotion.matches) cancelTransition();
    },
    { signal: controller.signal },
  );

  media.addEventListener(
    "change",
    () => {
      if (currentMode === "system") {
        cancelTransition();
        applyTheme("system");
      }
    },
    { signal: controller.signal },
  );

  applyTheme(getInitialMode());
}
