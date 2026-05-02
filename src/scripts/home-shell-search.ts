import {
  algoliaSiteSearchConfig,
  isAlgoliaSiteSearchConfigured,
} from "../config/search";
import type { AlgoliaSiteSearchConfig } from "../config/search";

type SiteSearchGlobal = {
  init: (config: AlgoliaSiteSearchConfig & { container: string }) => void;
  destroy?: (container: string) => void;
};

type SearchWindow = Window & {
  SiteSearch?: SiteSearchGlobal;
  __homeShellSearchKeyboardBound?: boolean;
  __homeShellSiteSearchScript?: Promise<void>;
};

const SITESEARCH_CONTAINER_SELECTOR = "#home-shell-search";
const SITESEARCH_CSS_URL =
  "https://unpkg.com/@algolia/sitesearch@latest/dist/search.min.css";
const SITESEARCH_SCRIPT_URL =
  "https://unpkg.com/@algolia/sitesearch@latest/dist/search.min.js";
const WAIT_FOR_BUTTON_ATTEMPTS = 30;

let pendingOpen: Promise<void> | undefined;

function getCurrentDarkMode() {
  const theme = document.documentElement.dataset.theme;

  if (theme === "dark") return true;
  if (theme === "light") return false;

  return algoliaSiteSearchConfig.darkMode;
}

function loadSiteSearchStyles() {
  if (document.querySelector("[data-home-shell-sitesearch-style]")) return;

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = SITESEARCH_CSS_URL;
  link.dataset.homeShellSiteSearchStyle = "true";
  document.head.append(link);
}

function loadSiteSearchScript(browserWindow: SearchWindow) {
  if (browserWindow.SiteSearch) return Promise.resolve();
  if (browserWindow.__homeShellSiteSearchScript)
    return browserWindow.__homeShellSiteSearchScript;

  browserWindow.__homeShellSiteSearchScript = new Promise<void>(
    (resolve, reject) => {
      const existingScript = document.querySelector<HTMLScriptElement>(
        "[data-home-shell-sitesearch-script]",
      );

      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(), {
          once: true,
        });
        existingScript.addEventListener(
          "error",
          () => reject(new Error("Failed to load Algolia SiteSearch.")),
          { once: true },
        );
        return;
      }

      const script = document.createElement("script");
      script.src = SITESEARCH_SCRIPT_URL;
      script.async = true;
      script.dataset.homeShellSiteSearchScript = "true";
      script.addEventListener("load", () => resolve(), { once: true });
      script.addEventListener(
        "error",
        () => reject(new Error("Failed to load Algolia SiteSearch.")),
        { once: true },
      );
      document.head.append(script);
    },
  );

  return browserWindow.__homeShellSiteSearchScript;
}

function initializeSiteSearch(
  container: HTMLElement,
  browserWindow: SearchWindow,
) {
  const darkMode = getCurrentDarkMode();
  const theme = darkMode ? "dark" : "light";

  if (
    container.dataset.searchInitialized === "true" &&
    container.dataset.searchTheme === theme
  )
    return;

  if (!browserWindow.SiteSearch)
    throw new Error("Algolia SiteSearch is not available.");

  browserWindow.SiteSearch.destroy?.(SITESEARCH_CONTAINER_SELECTOR);
  browserWindow.SiteSearch.init({
    ...algoliaSiteSearchConfig,
    container: SITESEARCH_CONTAINER_SELECTOR,
    darkMode,
  });

  container.dataset.searchInitialized = "true";
  container.dataset.searchTheme = theme;
}

function waitForSiteSearchButton(container: HTMLElement) {
  return new Promise<HTMLButtonElement>((resolve, reject) => {
    let attempts = 0;

    const check = () => {
      const button =
        container.querySelector<HTMLButtonElement>(".sitesearch-button");

      if (button) {
        resolve(button);
        return;
      }

      attempts += 1;
      if (attempts >= WAIT_FOR_BUTTON_ATTEMPTS) {
        reject(new Error("Algolia SiteSearch button was not rendered."));
        return;
      }

      window.requestAnimationFrame(check);
    };

    check();
  });
}

function openSiteSearch(container: HTMLElement, trigger: HTMLButtonElement) {
  if (pendingOpen) return pendingOpen;

  pendingOpen = (async () => {
    const browserWindow = window as SearchWindow;

    trigger.disabled = true;
    loadSiteSearchStyles();
    await loadSiteSearchScript(browserWindow);
    initializeSiteSearch(container, browserWindow);

    const button = await waitForSiteSearchButton(container);
    button.click();
  })()
    .catch((error) => {
      console.error(error);
    })
    .finally(() => {
      trigger.disabled = false;
      pendingOpen = undefined;
    });

  return pendingOpen;
}

export function initHomeShellSearch() {
  if (!isAlgoliaSiteSearchConfigured) return;

  const browserWindow = window as SearchWindow;
  const trigger = document.querySelector<HTMLButtonElement>(
    "[data-home-shell-search-trigger]",
  );
  const container = document.querySelector<HTMLElement>(
    "[data-home-shell-search-container]",
  );

  if (
    !trigger ||
    !container ||
    trigger.dataset.searchInitialized === "true"
  )
    return;

  trigger.addEventListener("click", () => {
    void openSiteSearch(container, trigger);
  });

  if (!browserWindow.__homeShellSearchKeyboardBound) {
    document.addEventListener("keydown", (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        document
          .querySelector<HTMLButtonElement>("[data-home-shell-search-trigger]")
          ?.click();
      }
    });

    browserWindow.__homeShellSearchKeyboardBound = true;
  }

  trigger.dataset.searchInitialized = "true";
}
