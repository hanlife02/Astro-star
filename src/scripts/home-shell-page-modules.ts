type HomeShellPageModuleRuntime = {
  readonly initialize: () => unknown;
  readonly cleanup?: () => void;
};

type HomeShellPageModule = {
  readonly name: string;
  readonly selector: string;
  readonly load: () => Promise<HomeShellPageModuleRuntime>;
};

const HOME_SHELL_PAGE_MODULES = [
  {
    name: "profile-avatar",
    selector: "[data-home-profile-avatar]",
    load: async () => {
      const module = await import("./home-shell-profile-avatar");
      return { initialize: module.initHomeShellProfileAvatar };
    },
  },
  {
    name: "content-toc",
    selector: "[data-home-shell-content-toc]",
    load: async () => {
      const module = await import("./home-shell-content-toc");
      return { initialize: module.initHomeShellContentToc };
    },
  },
  {
    name: "mobile-toc",
    selector: "[data-home-shell-content-toc]",
    load: async () => {
      const module = await import("./home-shell-mobile-toc");
      return { initialize: module.initHomeShellMobileToc };
    },
  },
  {
    name: "document-progress",
    selector: "[data-document-navigation='true']",
    load: async () => {
      const module = await import("./home-shell-document-progress");
      return { initialize: module.initHomeShellDocumentProgress };
    },
  },
  {
    name: "code-copy",
    selector: ".content-page-body pre",
    load: async () => {
      const module = await import("./home-shell-code-copy");
      return { initialize: module.initHomeShellCodeCopy };
    },
  },
  {
    name: "content-fold",
    selector: ".content-fold",
    load: async () => {
      const module = await import("./home-shell-content-fold");
      return { initialize: module.initHomeShellContentFold };
    },
  },
  {
    name: "article-actions",
    selector: "[data-article-actions]",
    load: async () => {
      const module = await import("./home-shell-article-actions");
      return {
        initialize: module.initHomeShellArticleActions,
        cleanup: module.cleanupHomeShellArticleActions,
      };
    },
  },
  {
    name: "constellation-background",
    selector: ".constellation-bg__canvas",
    load: async () => {
      const module = await import("./home-shell-constellation-background");
      return {
        initialize: module.initHomeShellConstellationBackground,
        cleanup: module.cleanupHomeShellConstellationBackground,
      };
    },
  },
  {
    name: "waline",
    selector:
      "[data-article-waline], .waline-pageview-count, .waline-comment-count",
    load: async () => {
      const module = await import("./home-shell-waline");
      return {
        initialize: () =>
          Promise.all([
            module.initHomeShellWalineComments(),
            module.initHomeShellWalinePageviews(),
          ]),
        cleanup: () => {
          module.cleanupHomeShellWalineComments();
          module.cleanupHomeShellWalinePageviews();
        },
      };
    },
  },
  {
    name: "github-repo-cards",
    selector: "[data-github-repo-card='true']",
    load: async () => {
      const module = await import("./home-shell-github-repo-cards");
      return { initialize: module.initHomeShellGitHubRepoCards };
    },
  },
  {
    name: "friend-link-avatars",
    selector: "[data-friend-links-grid='true']",
    load: async () => {
      const module = await import("./home-shell-friend-link-avatars");
      return { initialize: module.initHomeShellFriendLinkAvatars };
    },
  },
  {
    name: "friend-feed",
    selector: "[data-friend-feed-list='true']",
    load: async () => {
      const module = await import("./home-shell-friend-feed");
      return { initialize: module.initHomeShellFriendFeed };
    },
  },
  {
    name: "codetime",
    selector: "[data-codetime-badge], [data-codetime-status]",
    load: async () => {
      const module = await import("./home-shell-codetime");
      return { initialize: module.initHomeShellCodeTime };
    },
  },
  {
    name: "content-image-lightbox",
    selector: ".content-image-figure img",
    load: async () => {
      const module = await import("./home-shell-content-image-lightbox");
      return {
        initialize: module.initHomeShellContentImageLightbox,
        cleanup: module.cleanupHomeShellContentImageLightbox,
      };
    },
  },
] as const satisfies readonly HomeShellPageModule[];

let activePageModulesController: AbortController | undefined;

const runHomeShellPageModuleCleanup = (name: string, cleanup: () => void) => {
  try {
    cleanup();
  } catch (error) {
    console.warn(`[HomeShell] Failed to cleanup ${name}.`, error);
  }
};

const runHomeShellPageModule = async (
  definition: HomeShellPageModule,
  signal: AbortSignal,
) => {
  try {
    const runtime = await definition.load();
    if (signal.aborted) return;

    const cleanup = runtime.cleanup;
    if (cleanup) {
      signal.addEventListener(
        "abort",
        () => {
          runHomeShellPageModuleCleanup(definition.name, cleanup);
        },
        { once: true },
      );
    }

    const result = runtime.initialize();
    if (result instanceof Promise) {
      await result;
    }
  } catch (error) {
    if (signal.aborted) return;
    console.warn(`[HomeShell] Failed to initialize ${definition.name}.`, error);
  }
};

export function cleanupHomeShellPageModules(): void {
  activePageModulesController?.abort();
  activePageModulesController = undefined;
}

export function initHomeShellPageModules(): void {
  cleanupHomeShellPageModules();

  const controller = new AbortController();
  activePageModulesController = controller;

  HOME_SHELL_PAGE_MODULES.forEach((definition) => {
    if (!document.querySelector(definition.selector)) return;
    void runHomeShellPageModule(definition, controller.signal);
  });
}
