const STORAGE_KEY = "theme-preference";
const RESOLVED_COOKIE_KEY = "theme-resolved";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const VALID_MODES = ["light", "dark", "system"] as const;

type ThemeMode = (typeof VALID_MODES)[number];

export function initHomeShellTheme() {
  const toggleButton = document.getElementById("theme-toggle");
  const icons = {
    light: toggleButton?.querySelector('[data-theme-icon="light"]'),
    dark: toggleButton?.querySelector('[data-theme-icon="dark"]'),
    system: toggleButton?.querySelector('[data-theme-icon="system"]'),
  };
  const snowBackground = document.querySelector(".snow-bg");
  const media = window.matchMedia("(prefers-color-scheme: dark)");

  let currentMode: ThemeMode = "system";

  const resolveMode = (mode: ThemeMode) => (mode === "system" ? (media.matches ? "dark" : "light") : mode);
  const readCookie = (key: string) => {
    const match = document.cookie.match(new RegExp(`(?:^|; )${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : "";
  };
  const writeCookie = (key: string, value: string) => {
    document.cookie = `${key}=${encodeURIComponent(value)}; Max-Age=${COOKIE_MAX_AGE}; Path=/; SameSite=Lax`;
  };

  const nextMode = (mode: ThemeMode): ThemeMode => {
    const index = VALID_MODES.indexOf(mode);
    return VALID_MODES[(index + 1) % VALID_MODES.length];
  };

  const syncToggle = (mode: ThemeMode) => {
    const next = nextMode(mode);

    if (toggleButton instanceof HTMLButtonElement) {
      toggleButton.setAttribute("aria-label", `Current theme: ${mode}. Click to switch to ${next}.`);
    }

    Object.entries(icons).forEach(([iconMode, iconNode]) => {
      if (!(iconNode instanceof HTMLElement)) return;
      iconNode.hidden = iconMode !== mode;
    });
  };

  const getInitialMode = (): ThemeMode => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && VALID_MODES.includes(stored as ThemeMode)) return stored as ThemeMode;
    const cookieMode = readCookie(STORAGE_KEY);
    if (cookieMode && VALID_MODES.includes(cookieMode as ThemeMode)) return cookieMode as ThemeMode;
    const rootMode = document.documentElement.dataset.themeMode;
    if (rootMode && VALID_MODES.includes(rootMode as ThemeMode)) return rootMode as ThemeMode;
    return "system";
  };

  const applyTheme = (mode: ThemeMode) => {
    currentMode = mode;
    const resolved = resolveMode(mode);

    document.documentElement.dataset.themeMode = mode;
    document.documentElement.dataset.theme = resolved;
    document.documentElement.style.colorScheme = resolved;
    document.documentElement.style.backgroundColor = resolved === "dark" ? "#000000" : "#ffffff";

    if (snowBackground instanceof HTMLElement) {
      snowBackground.dataset.mode = resolved;
    }

    syncToggle(mode);
    window.localStorage.setItem(STORAGE_KEY, mode);
    writeCookie(STORAGE_KEY, mode);
    writeCookie(RESOLVED_COOKIE_KEY, resolved);
  };

  toggleButton?.addEventListener("click", () => {
    applyTheme(nextMode(currentMode));
  });

  media.addEventListener("change", () => {
    if (currentMode === "system") {
      applyTheme("system");
    }
  });

  applyTheme(getInitialMode());
}
