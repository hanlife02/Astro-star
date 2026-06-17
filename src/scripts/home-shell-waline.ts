import type { WalineAbort, WalineInstance } from "@waline/client";

type HomeShellWalineWindow = Window & {
  __homeShellWalineConfigPromise?: Promise<string>;
  __homeShellWalineCommentsCleanup?: () => void;
  __homeShellWalineCommentsRunId?: number;
  __homeShellWalinePageviewCleanup?: () => void;
  __homeShellWalinePageviewRunId?: number;
  __homeShellTikzJaxLoadPromise?: Promise<TikzJaxProcessor>;
  __homeShellTikzJaxProcessor?: TikzJaxProcessor;
  __homeShellTikzJaxRenderPromise?: Promise<void>;
};

let walineClientModule: Promise<typeof import("@waline/client")> | undefined;
let walinePageviewModule:
  | Promise<typeof import("@waline/client/pageview")>
  | undefined;
let walineCommentModule:
  | Promise<typeof import("@waline/client/comment")>
  | undefined;

const WALINE_COMMENTS_ROOT_MARGIN = "360px 0px";
const WALINE_COMMENTS_LANG = "zh-CN";
const TIKZJAX_FONT_STYLESHEET_URL = "https://tikzjax.com/v1/fonts.css";
const TIKZJAX_SCRIPT_URL = "https://tikzjax.com/v1/tikzjax.js";
const TIKZJAX_FONT_STYLESHEET_ID = "home-shell-tikzjax-fonts";
const TIKZJAX_SCRIPT_ID = "home-shell-tikzjax-script";
const TIKZ_BLOCK_PATTERN =
  /\\begin\s*\{tikzpicture\}[\s\S]*?\\end\s*\{tikzpicture\}/g;
const GITHUB_ALERT_PATTERN =
  /^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/i;
const MAX_TIKZ_BLOCKS_PER_RENDER = 4;
const MAX_TIKZ_BLOCK_LENGTH = 8000;

type TikzJaxProcessor = () => void | Promise<void>;
type GitHubAlertKind = "note" | "tip" | "important" | "warning" | "caution";

function loadWalineClientModule() {
  walineClientModule ??= import("@waline/client");
  return walineClientModule;
}

function loadWalinePageviewModule() {
  walinePageviewModule ??= import("@waline/client/pageview");
  return walinePageviewModule;
}

function loadWalineCommentModule() {
  walineCommentModule ??= import("@waline/client/comment");
  return walineCommentModule;
}

function ensureTikzJaxFontStylesheet() {
  if (document.getElementById(TIKZJAX_FONT_STYLESHEET_ID)) return;

  const link = document.createElement("link");
  link.id = TIKZJAX_FONT_STYLESHEET_ID;
  link.rel = "stylesheet";
  link.type = "text/css";
  link.href = TIKZJAX_FONT_STYLESHEET_URL;

  document.head.append(link);
}

function loadTikzJaxProcessor() {
  const browserWindow = window as HomeShellWalineWindow;

  if (browserWindow.__homeShellTikzJaxProcessor) {
    return Promise.resolve(browserWindow.__homeShellTikzJaxProcessor);
  }

  if (browserWindow.__homeShellTikzJaxLoadPromise) {
    return browserWindow.__homeShellTikzJaxLoadPromise;
  }

  ensureTikzJaxFontStylesheet();

  const previousOnload = window.onload;

  browserWindow.__homeShellTikzJaxLoadPromise = new Promise(
    (resolve, reject) => {
      const resolveProcessor = () => {
        const tikzJaxOnload = window.onload;

        if (typeof tikzJaxOnload !== "function") {
          reject(new Error("TikZJax did not expose a renderer."));
          return;
        }

        const processor: TikzJaxProcessor = () =>
          tikzJaxOnload.call(window, new Event("load"));

        browserWindow.__homeShellTikzJaxProcessor = processor;
        window.onload = previousOnload;
        resolve(processor);
      };

      const existingScript = document.getElementById(TIKZJAX_SCRIPT_ID);
      if (existingScript instanceof HTMLScriptElement) {
        if (existingScript.dataset.loaded === "true") {
          resolveProcessor();
          return;
        }

        existingScript.addEventListener("load", resolveProcessor, {
          once: true,
        });
        existingScript.addEventListener("error", () => {
          reject(new Error("Failed to load TikZJax."));
        });
        return;
      }

      const script = document.createElement("script");
      script.id = TIKZJAX_SCRIPT_ID;
      script.src = TIKZJAX_SCRIPT_URL;
      script.async = true;
      script.addEventListener(
        "load",
        () => {
          script.dataset.loaded = "true";
          resolveProcessor();
        },
        { once: true },
      );
      script.addEventListener(
        "error",
        () => {
          reject(new Error("Failed to load TikZJax."));
        },
        { once: true },
      );

      document.head.append(script);
    },
  );

  return browserWindow.__homeShellTikzJaxLoadPromise;
}

function queueTikzJaxRender() {
  const browserWindow = window as HomeShellWalineWindow;
  const previousRender =
    browserWindow.__homeShellTikzJaxRenderPromise ?? Promise.resolve();

  browserWindow.__homeShellTikzJaxRenderPromise = previousRender
    .catch(() => undefined)
    .then(async () => {
      const processor = await loadTikzJaxProcessor();
      await processor();
    })
    .catch((error) => {
      console.warn("[Waline] Failed to render TikZ comment content.", error);
    });
}

function createTikzFigure(tikzSource: string) {
  const figure = document.createElement("figure");
  figure.className = "article-comment-tikz";

  const script = document.createElement("script");
  script.type = "text/tikz";
  script.textContent = tikzSource.trim();

  figure.append(script);
  return figure;
}

function findTextOffsetNode(
  textNodes: Text[],
  offset: number,
): { node: Text; offset: number } | null {
  let currentOffset = 0;

  for (const node of textNodes) {
    const nodeLength = node.nodeValue?.length ?? 0;
    const nextOffset = currentOffset + nodeLength;

    if (offset >= currentOffset && offset <= nextOffset) {
      return {
        node,
        offset: offset - currentOffset,
      };
    }

    currentOffset = nextOffset;
  }

  return null;
}

function shouldSkipTikzTextNode(node: Text) {
  const parentElement = node.parentElement;

  return (
    !parentElement ||
    Boolean(
      parentElement.closest(
        ".article-comment-tikz, script, style, svg, textarea, input, pre, code",
      ),
    )
  );
}

function collectTikzTextNodes(root: HTMLElement) {
  const textNodes: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return node instanceof Text && !shouldSkipTikzTextNode(node)
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    },
  });

  while (walker.nextNode()) {
    textNodes.push(walker.currentNode as Text);
  }

  return textNodes;
}

function replaceTikzCodeBlocks(root: HTMLElement) {
  let renderedCount = 0;
  const codeBlocks = Array.from(root.querySelectorAll("pre > code, code"));

  codeBlocks.forEach((codeBlock) => {
    if (
      renderedCount >= MAX_TIKZ_BLOCKS_PER_RENDER ||
      !(codeBlock instanceof HTMLElement) ||
      codeBlock.closest(".article-comment-tikz")
    ) {
      return;
    }

    const source = codeBlock.textContent?.trim() ?? "";
    const match = source.match(TIKZ_BLOCK_PATTERN);

    if (
      !match ||
      match.length !== 1 ||
      match[0].trim() !== source ||
      source.length > MAX_TIKZ_BLOCK_LENGTH
    ) {
      return;
    }

    const replacementTarget =
      codeBlock.parentElement?.tagName === "PRE"
        ? codeBlock.parentElement
        : codeBlock;

    replacementTarget.replaceWith(createTikzFigure(source));
    renderedCount += 1;
  });

  return renderedCount;
}

function replaceTikzTextBlocks(root: HTMLElement) {
  const textNodes = collectTikzTextNodes(root);
  const textContent = textNodes
    .map((textNode) => textNode.nodeValue ?? "")
    .join("");
  const matches = Array.from(textContent.matchAll(TIKZ_BLOCK_PATTERN)).slice(
    0,
    MAX_TIKZ_BLOCKS_PER_RENDER,
  );
  let renderedCount = 0;

  matches.reverse().forEach((match) => {
    const tikzSource = match[0];
    const matchIndex = match.index ?? -1;

    if (
      matchIndex < 0 ||
      tikzSource.length > MAX_TIKZ_BLOCK_LENGTH ||
      renderedCount >= MAX_TIKZ_BLOCKS_PER_RENDER
    ) {
      return;
    }

    const start = findTextOffsetNode(textNodes, matchIndex);
    const end = findTextOffsetNode(textNodes, matchIndex + tikzSource.length);

    if (!start || !end) return;

    const range = document.createRange();
    range.setStart(start.node, start.offset);
    range.setEnd(end.node, end.offset);
    range.deleteContents();
    range.insertNode(createTikzFigure(tikzSource));
    range.detach();
    renderedCount += 1;
  });

  return renderedCount;
}

function formatGitHubAlertLabel(alertKind: GitHubAlertKind) {
  return alertKind.charAt(0).toUpperCase() + alertKind.slice(1);
}

function getFirstTextNode(root: Node) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

  return walker.nextNode() ? (walker.currentNode as Text) : null;
}

function removeLeadingBreaks(element: HTMLElement) {
  while (element.firstChild instanceof HTMLBRElement) {
    element.firstChild.remove();
  }
}

function applyGitHubAlertBlockquotes(root: HTMLElement) {
  const blockquotes = Array.from(root.querySelectorAll("blockquote"));

  blockquotes.forEach((blockquote) => {
    if (
      !(blockquote instanceof HTMLElement) ||
      blockquote.classList.contains("article-comment-alert")
    ) {
      return;
    }

    const firstTextNode = getFirstTextNode(blockquote);
    const firstTextValue = firstTextNode?.nodeValue ?? "";
    const match = firstTextValue.match(GITHUB_ALERT_PATTERN);
    if (!firstTextNode || !match) return;

    const alertKind = match[1].toLowerCase() as GitHubAlertKind;
    firstTextNode.nodeValue = firstTextValue.replace(GITHUB_ALERT_PATTERN, "");

    const firstParagraph = firstTextNode.parentElement;
    if (firstParagraph instanceof HTMLParagraphElement) {
      if (!firstTextNode.nodeValue) {
        firstTextNode.remove();
      }
      removeLeadingBreaks(firstParagraph);

      if (
        !firstParagraph.textContent?.trim() &&
        firstParagraph.children.length === 0
      ) {
        firstParagraph.remove();
      }
    }

    const label = document.createElement("div");
    label.className = "article-comment-alert-label";
    label.textContent = formatGitHubAlertLabel(alertKind);

    blockquote.classList.add(
      "article-comment-alert",
      `article-comment-alert--${alertKind}`,
    );
    blockquote.prepend(label);
  });
}

function renderWalineEnhancedContent(root: ParentNode) {
  const contentBlocks = Array.from(
    root.querySelectorAll(".article-comments-thread .wl-content"),
  );
  let renderedCount = 0;

  contentBlocks.forEach((contentBlock) => {
    if (!(contentBlock instanceof HTMLElement)) return;

    applyGitHubAlertBlockquotes(contentBlock);
    renderedCount += replaceTikzCodeBlocks(contentBlock);
    renderedCount += replaceTikzTextBlocks(contentBlock);
  });

  if (renderedCount > 0) {
    queueTikzJaxRender();
  }
}

function initWalineContentEnhancements(walineThread: HTMLElement) {
  let renderQueued = false;

  const render = () => {
    renderQueued = false;
    renderWalineEnhancedContent(walineThread);
  };

  render();

  const observer = new MutationObserver(() => {
    if (renderQueued) return;

    renderQueued = true;
    window.requestAnimationFrame(render);
  });
  observer.observe(walineThread, {
    childList: true,
    characterData: true,
    subtree: true,
  });

  return () => {
    observer.disconnect();
  };
}

export function cleanupHomeShellWalineComments() {
  const browserWindow = window as HomeShellWalineWindow;
  browserWindow.__homeShellWalineCommentsRunId =
    (browserWindow.__homeShellWalineCommentsRunId ?? 0) + 1;
  const cleanup = browserWindow.__homeShellWalineCommentsCleanup;
  browserWindow.__homeShellWalineCommentsCleanup = undefined;

  if (!cleanup) return;

  try {
    cleanup();
  } catch (error) {
    console.warn(
      "[Waline] Failed to cleanup previous comments instance.",
      error,
    );
  }
}

export function cleanupHomeShellWalinePageviews() {
  const browserWindow = window as HomeShellWalineWindow;
  browserWindow.__homeShellWalinePageviewRunId =
    (browserWindow.__homeShellWalinePageviewRunId ?? 0) + 1;
  const cleanup = browserWindow.__homeShellWalinePageviewCleanup;
  browserWindow.__homeShellWalinePageviewCleanup = undefined;

  if (!cleanup) return;

  try {
    cleanup();
  } catch (error) {
    console.warn("[Waline] Failed to cleanup previous pageviews.", error);
  }
}

export function getConfiguredWalineServerURL() {
  const browserWindow = window as HomeShellWalineWindow;

  if (!browserWindow.__homeShellWalineConfigPromise) {
    browserWindow.__homeShellWalineConfigPromise = fetch(
      "/api/waline-config.json",
      {
        credentials: "same-origin",
      },
    )
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { serverURL?: unknown } | null) =>
        typeof payload?.serverURL === "string" ? payload.serverURL.trim() : "",
      )
      .catch(() => "");
  }

  return browserWindow.__homeShellWalineConfigPromise;
}

export async function initHomeShellWalineComments() {
  const browserWindow = window as HomeShellWalineWindow;
  cleanupHomeShellWalineComments();
  const runId = (browserWindow.__homeShellWalineCommentsRunId ?? 0) + 1;
  browserWindow.__homeShellWalineCommentsRunId = runId;

  const walineRoots = Array.from(
    document.querySelectorAll("[data-article-waline]"),
  );
  if (walineRoots.length === 0) {
    browserWindow.__homeShellWalineCommentsCleanup = undefined;
    return;
  }

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;

        observer.disconnect();
        void hydrateWalineComments(runId);
      },
      {
        rootMargin: WALINE_COMMENTS_ROOT_MARGIN,
      },
    );

    walineRoots.forEach((walineRoot) => {
      observer.observe(walineRoot);
    });

    browserWindow.__homeShellWalineCommentsCleanup = () => {
      observer.disconnect();
    };
    return;
  }

  await hydrateWalineComments(runId);
}

async function hydrateWalineComments(runId: number) {
  const browserWindow = window as HomeShellWalineWindow;
  const walineRoots = Array.from(
    document.querySelectorAll("[data-article-waline]"),
  );

  if (walineRoots.length === 0) {
    browserWindow.__homeShellWalineCommentsCleanup = undefined;
    return;
  }

  const { init } = await loadWalineClientModule();
  if (browserWindow.__homeShellWalineCommentsRunId !== runId) return;

  const needsConfiguredServerURL = walineRoots.some(
    (walineRoot) => !walineRoot.getAttribute("data-waline-server-url")?.trim(),
  );
  const configuredServerURL = needsConfiguredServerURL
    ? await getConfiguredWalineServerURL()
    : "";
  if (browserWindow.__homeShellWalineCommentsRunId !== runId) return;

  const instances: WalineInstance[] = [];
  const contentEnhancementCleanups: Array<() => void> = [];

  walineRoots.forEach((walineRoot) => {
    const walineThread = walineRoot.querySelector("[data-waline-thread]");
    const serverURL =
      walineRoot.getAttribute("data-waline-server-url")?.trim() ||
      configuredServerURL;
    const path = walineRoot.getAttribute("data-waline-path")?.trim();
    const lang = WALINE_COMMENTS_LANG;

    if (!serverURL) {
      console.warn(
        "[Waline] WALINE_SERVER_URL or PUBLIC_WALINE_SERVER_URL is not configured.",
      );
      return;
    }

    if (!(walineThread instanceof HTMLElement) || !path) {
      return;
    }

    const instance = init({
      el: walineThread,
      serverURL,
      path,
      lang,
      pageview: false,
    });

    if (instance) {
      instances.push(instance);
      contentEnhancementCleanups.push(
        initWalineContentEnhancements(walineThread),
      );
    }
  });

  browserWindow.__homeShellWalineCommentsCleanup = () => {
    contentEnhancementCleanups.forEach((cleanup) => {
      cleanup();
    });
    instances.forEach((instance) => {
      try {
        instance.destroy();
      } catch (error) {
        console.warn("[Waline] Failed to destroy comments instance.", error);
      }
    });
  };
}

export async function initHomeShellWalinePageviews() {
  const browserWindow = window as HomeShellWalineWindow;
  cleanupHomeShellWalinePageviews();
  const runId = (browserWindow.__homeShellWalinePageviewRunId ?? 0) + 1;
  browserWindow.__homeShellWalinePageviewRunId = runId;

  const pageviewElement = document.querySelector(".waline-pageview-count");
  const commentElement = document.querySelector(".waline-comment-count");
  let serverURL =
    pageviewElement?.getAttribute("data-server-url")?.trim() ||
    commentElement?.getAttribute("data-server-url")?.trim();

  if (
    !(pageviewElement instanceof HTMLElement) &&
    !(commentElement instanceof HTMLElement)
  ) {
    browserWindow.__homeShellWalinePageviewCleanup = undefined;
    return;
  }

  if (!serverURL) {
    serverURL = await getConfiguredWalineServerURL();
  }

  if (!serverURL) {
    browserWindow.__homeShellWalinePageviewCleanup = undefined;
    return;
  }

  const [{ pageviewCount }, { commentCount }] = await Promise.all([
    loadWalinePageviewModule(),
    loadWalineCommentModule(),
  ]);
  if (browserWindow.__homeShellWalinePageviewRunId !== runId) return;

  const aborts: WalineAbort[] = [];

  if (pageviewElement instanceof HTMLElement) {
    aborts.push(pageviewCount({ serverURL, update: true }));
  }

  if (commentElement instanceof HTMLElement) {
    aborts.push(commentCount({ serverURL }));
  }

  browserWindow.__homeShellWalinePageviewCleanup = () => {
    aborts.forEach((abort) => {
      abort();
    });
  };
}
