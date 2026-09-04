export function remarkContentFormatDirectives() {
  return function remarkContentFormatDirectivesTransformer(tree, file) {
    const source =
      typeof file?.value === "string"
        ? file.value
        : String(file?.value ?? "") || "";
    transformChildren(tree, source, file);
  };
}

function transformChildren(parent, source, file) {
  if (!Array.isArray(parent.children)) return;

  applyInlineSpoilerSpans(parent, source);

  for (
    let childIndex = 0;
    childIndex < parent.children.length;
    childIndex += 1
  ) {
    const child = parent.children[childIndex];

    if (child.type === "paragraph") {
      const video = parseVideoDirective(child, source, file);
      if (video) {
        parent.children[childIndex] = createVideoFigure(video);
        continue;
      }
    }

    if (child.type === "containerDirective" && child.name === "fold") {
      applyFoldData(child);
      transformChildren(child, source, file);
      continue;
    }

    if (child.type === "textDirective" && child.name === "spoiler") {
      applySpoilerData(child);
      continue;
    }

    transformChildren(child, source, file);
  }
}

const VIDEO_DIRECTIVE_PATTERN =
  /^:video\[(?<title>[^\]\n]*)\]\((?<url>[^\n]+)\)(?<attributes>\{[^\n]*\})?$/;
const VIDEO_ATTRIBUTE_PATTERN =
  /([A-Za-z][A-Za-z0-9-]*)(?:=(?:"([^"]*)"|'([^']*)'|([^\s}]+)))?/y;
const VIDEO_BOOLEAN_ATTRIBUTES = new Set(["loop", "muted", "playsinline"]);
const VIDEO_ATTRIBUTES = new Set([
  "loop",
  "muted",
  "playsinline",
  "poster",
  "preload",
]);
const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
  "youtu.be",
  "www.youtu.be",
]);
const BILIBILI_HOSTS = new Set([
  "bilibili.com",
  "www.bilibili.com",
  "m.bilibili.com",
  "player.bilibili.com",
]);

function getNodeSource(node, source) {
  const start = node.position?.start?.offset;
  const end = node.position?.end?.offset;
  return typeof start === "number" && typeof end === "number"
    ? source.slice(start, end).trim()
    : "";
}

function failVideoDirective(file, message, node) {
  if (typeof file?.fail === "function") {
    file.fail(message, node?.position);
  }

  throw new Error(message);
}

function parseVideoDirective(node, source, file) {
  const raw = getNodeSource(node, source);
  if (raw !== ":video" && !raw.startsWith(":video[")) return undefined;

  const match = raw.match(VIDEO_DIRECTIVE_PATTERN);
  if (!match?.groups) {
    failVideoDirective(
      file,
      "video directive must occupy its own line and use :video[title](url)",
      node,
    );
  }

  const title = match.groups.title.trim();
  const attributes = parseVideoAttributes(match.groups.attributes, file, node);
  const sourceURL = normalizeVideoURL(match.groups.url.trim(), file, node);
  const sourceType = getVideoSourceType(sourceURL, file, node);

  if (sourceType.kind === "iframe" && attributes.poster) {
    failVideoDirective(
      file,
      "poster is only supported for direct video URLs",
      node,
    );
  }

  return {
    title,
    sourceURL,
    sourceType,
    attributes,
  };
}

function parseVideoAttributes(rawAttributes, file, node) {
  if (!rawAttributes) return {};

  const raw = rawAttributes.slice(1, -1).trim();
  if (!raw) return {};

  const attributes = {};
  let offset = 0;

  while (offset < raw.length) {
    while (/\s/.test(raw[offset] ?? "")) offset += 1;
    if (offset >= raw.length) break;

    VIDEO_ATTRIBUTE_PATTERN.lastIndex = offset;
    const match = VIDEO_ATTRIBUTE_PATTERN.exec(raw);
    if (!match || match.index !== offset) {
      failVideoDirective(file, `invalid video attribute syntax: ${raw}`, node);
    }

    const name = match[1].toLowerCase();
    if (!VIDEO_ATTRIBUTES.has(name)) {
      failVideoDirective(file, `unsupported video attribute: ${name}`, node);
    }
    if (Object.hasOwn(attributes, name)) {
      failVideoDirective(file, `duplicate video attribute: ${name}`, node);
    }

    const value = match[2] ?? match[3] ?? match[4];
    if (VIDEO_BOOLEAN_ATTRIBUTES.has(name)) {
      if (value !== undefined && value !== "true" && value !== "false") {
        failVideoDirective(
          file,
          `video attribute ${name} must be boolean`,
          node,
        );
      }
      if (value !== "false") attributes[name] = true;
    } else if (name === "preload") {
      if (value !== "none") {
        failVideoDirective(file, "video preload must be none", node);
      }
      attributes[name] = value;
    } else {
      if (!value) {
        failVideoDirective(file, `video attribute ${name} needs a value`, node);
      }
      attributes[name] = value;
    }

    offset = VIDEO_ATTRIBUTE_PATTERN.lastIndex;
  }

  if (attributes.poster) {
    validateSafeURL(attributes.poster, file, node, "poster");
  }

  return attributes;
}

function normalizeVideoURL(value, file, node) {
  if (!value) failVideoDirective(file, "video URL is required", node);
  validateSafeURL(value, file, node, "video URL");
  return value;
}

function validateSafeURL(value, file, node, label) {
  if (/^(?:data|javascript|vbscript):/i.test(value)) {
    failVideoDirective(file, `${label} must use a safe protocol`, node);
  }

  if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(value) && !/^https?:/i.test(value)) {
    failVideoDirective(file, `${label} must use a safe protocol`, node);
  }

  try {
    new URL(value, "https://astro-star.invalid");
  } catch {
    failVideoDirective(file, `${label} is not a valid URL`, node);
  }
}

function getVideoSourceType(sourceURL, file, node) {
  let url;
  try {
    url = new URL(sourceURL, "https://astro-star.invalid");
  } catch {
    failVideoDirective(file, "video URL is not valid", node);
  }

  const hostname = url.hostname.toLowerCase();
  if (YOUTUBE_HOSTS.has(hostname)) {
    const videoId = getYouTubeVideoId(url);
    if (!videoId || !/^[A-Za-z0-9_-]+$/.test(videoId)) {
      failVideoDirective(file, "YouTube video URL is missing a video ID", node);
    }
    return {
      kind: "iframe",
      embedURL: `https://www.youtube-nocookie.com/embed/${videoId}`,
    };
  }

  if (BILIBILI_HOSTS.has(hostname)) {
    const bvid = getBilibiliVideoId(url);
    if (!bvid || !/^BV[A-Za-z0-9]+$/.test(bvid)) {
      failVideoDirective(file, "Bilibili video URL is missing a BV ID", node);
    }

    const embedURL = new URL("https://player.bilibili.com/player.html");
    embedURL.searchParams.set("bvid", bvid);
    const page = url.searchParams.get("p");
    if (page && /^\d+$/.test(page)) embedURL.searchParams.set("p", page);

    return { kind: "iframe", embedURL: embedURL.href };
  }

  return { kind: "video", embedURL: sourceURL };
}

function getYouTubeVideoId(url) {
  if (url.hostname.toLowerCase().endsWith("youtu.be")) {
    const pathSegments = url.pathname.split("/").filter(Boolean);
    return pathSegments.length === 1 ? pathSegments[0] : "";
  }

  const normalizedPath = url.pathname.replace(/\/$/, "") || "/";
  if (normalizedPath === "/watch") return url.searchParams.get("v") || "";

  const embedMatch = normalizedPath.match(/^\/embed\/([^/]+)$/);
  return embedMatch?.[1] || "";
}

function getBilibiliVideoId(url) {
  if (url.pathname.startsWith("/video/")) {
    return url.pathname.match(/^\/video\/(BV[a-zA-Z0-9]+)\/?$/)?.[1] || "";
  }

  return url.searchParams.get("bvid") || "";
}

function createVideoElement(tagName, properties, children = []) {
  return {
    type: "paragraph",
    data: {
      hName: tagName,
      hProperties: properties,
    },
    children,
  };
}

function createVideoFigure({ title, sourceURL, sourceType, attributes }) {
  const mediaProperties =
    sourceType.kind === "iframe"
      ? {
          "data-video-src": sourceType.embedURL,
          loading: "lazy",
          title: title || "Embedded video",
          allow: "fullscreen; picture-in-picture",
          allowfullscreen: true,
          sandbox: "allow-scripts allow-same-origin allow-presentation",
        }
      : {
          "data-video-src": sourceURL,
          controls: true,
          playsinline: true,
          preload: "none",
          ...attributes,
        };
  const frameChildren = [
    createVideoElement(
      sourceType.kind === "iframe" ? "iframe" : "video",
      mediaProperties,
    ),
    createVideoElement(
      "button",
      {
        type: "button",
        class: "content-video-play",
        "data-video-play": "true",
        "aria-label": title ? `Play video: ${title}` : "Play video",
      },
      [
        createVideoElement("span", {
          class: "content-video-play-icon",
          "aria-hidden": true,
        }),
        createVideoElement("span", { class: "content-video-play-label" }, [
          { type: "text", value: "Play video" },
        ]),
      ],
    ),
    createVideoElement(
      "a",
      {
        class: "content-video-source",
        href: sourceURL,
        target: "_blank",
        rel: "noopener noreferrer",
        "data-video-source-link": "true",
      },
      [{ type: "text", value: "Open video source" }],
    ),
    createVideoElement(
      "p",
      {
        class: "content-video-error",
        role: "alert",
        hidden: true,
        "data-video-error": "true",
      },
      [{ type: "text", value: "The video could not be loaded." }],
    ),
  ];

  const children = [
    createVideoElement(
      "div",
      {
        class: "content-video-frame",
        "data-video-player": "true",
        "data-video-kind": sourceType.kind,
      },
      frameChildren,
    ),
  ];

  if (title) {
    children.push(
      createVideoElement("figcaption", { class: "content-video-caption" }, [
        { type: "text", value: title },
      ]),
    );
  }

  return {
    type: "paragraph",
    data: {
      hName: "figure",
      hProperties: {
        class: "content-video-figure",
      },
    },
    children,
  };
}

// Character escapes collapse "\\|" into "|" inside a single mdast text node,
// so the escape can only be recovered by re-reading the raw source at the
// node's position. Entities and other constructs stop the mapping early and
// leave the remaining characters treated as unescaped.
function getEscapedIndexes(child, source) {
  const escaped = new Set();
  const start = child.position?.start?.offset;
  const end = child.position?.end?.offset;

  if (typeof start !== "number" || typeof end !== "number" || !source) {
    return escaped;
  }

  const raw = source.slice(start, end);
  if (raw === child.value) return escaped;

  let rawIndex = 0;

  for (let valueIndex = 0; valueIndex < child.value.length; valueIndex += 1) {
    const character = child.value[valueIndex];

    if (raw[rawIndex] === character) {
      rawIndex += 1;
      continue;
    }

    if (raw[rawIndex] === "\\" && raw[rawIndex + 1] === character) {
      escaped.add(valueIndex);
      rawIndex += 2;
      continue;
    }

    break;
  }

  return escaped;
}

function findSpoilerDelimiter(
  children,
  startNodeIndex,
  startCharIndex,
  source,
) {
  for (
    let nodeIndex = startNodeIndex;
    nodeIndex < children.length;
    nodeIndex += 1
  ) {
    const child = children[nodeIndex];
    if (child.type !== "text" || typeof child.value !== "string") continue;

    const fromIndex = nodeIndex === startNodeIndex ? startCharIndex : 0;
    const escaped = getEscapedIndexes(child, source);

    for (
      let charIndex = child.value.indexOf("||", fromIndex);
      charIndex !== -1;
      charIndex = child.value.indexOf("||", charIndex + 1)
    ) {
      if (escaped.has(charIndex) || escaped.has(charIndex + 1)) continue;
      return { nodeIndex, charIndex };
    }
  }

  return undefined;
}

function applyInlineSpoilerSpans(parent, source) {
  const children = parent.children;

  if (
    !children.some(
      (child) => child.type === "text" && child.value?.includes("||"),
    )
  ) {
    return;
  }

  let nodeIndex = 0;
  let charIndex = 0;

  while (nodeIndex < children.length) {
    const opener = findSpoilerDelimiter(children, nodeIndex, charIndex, source);
    if (!opener) return;

    const closer = findSpoilerDelimiter(
      children,
      opener.nodeIndex,
      opener.charIndex + 2,
      source,
    );
    if (!closer) return;

    // "||||" has no content: keep the first delimiter literal and let the
    // second one try to pair with a later delimiter instead.
    if (
      closer.nodeIndex === opener.nodeIndex &&
      closer.charIndex === opener.charIndex + 2
    ) {
      nodeIndex = closer.nodeIndex;
      charIndex = closer.charIndex;
      continue;
    }

    const openerNode = children[opener.nodeIndex];
    const closerNode = children[closer.nodeIndex];
    const spoilerChildren = [];

    if (opener.nodeIndex === closer.nodeIndex) {
      spoilerChildren.push({
        type: "text",
        value: openerNode.value.slice(opener.charIndex + 2, closer.charIndex),
      });
    } else {
      const leadingText = openerNode.value.slice(opener.charIndex + 2);
      if (leadingText)
        spoilerChildren.push({ type: "text", value: leadingText });

      spoilerChildren.push(
        ...children.slice(opener.nodeIndex + 1, closer.nodeIndex),
      );

      const trailingText = closerNode.value.slice(0, closer.charIndex);
      if (trailingText)
        spoilerChildren.push({ type: "text", value: trailingText });
    }

    const replacement = [];
    const preText = openerNode.value.slice(0, opener.charIndex);
    if (preText) replacement.push({ type: "text", value: preText });

    replacement.push(createSpoilerNode(spoilerChildren));

    const postText = closerNode.value.slice(closer.charIndex + 2);
    if (postText) replacement.push({ type: "text", value: postText });

    children.splice(
      opener.nodeIndex,
      closer.nodeIndex - opener.nodeIndex + 1,
      ...replacement,
    );

    nodeIndex = opener.nodeIndex + replacement.length - (postText ? 1 : 0);
    charIndex = 0;
  }
}

function createSpoilerNode(children) {
  const node = {
    type: "textDirective",
    name: "spoiler",
    attributes: {},
    children,
  };

  applySpoilerData(node);

  return node;
}

function applyFoldData(node) {
  const data = node.data || (node.data = {});
  data.hName = "details";
  data.hProperties = {
    class: "content-fold",
    open: isOpenFold(node.attributes),
  };

  const label = node.children?.[0];

  if (label?.data?.directiveLabel) {
    label.data.hName = "summary";
    label.data.hProperties = {
      class: "content-fold-summary",
    };
    node.children = [label, createFoldBodyNode(node.children.slice(1))];
    return;
  }

  node.children = [
    createFoldSummaryNode(),
    createFoldBodyNode(node.children || []),
  ];
}

function createFoldSummaryNode() {
  return {
    type: "paragraph",
    data: {
      hName: "summary",
      hProperties: {
        class: "content-fold-summary",
      },
    },
    children: [{ type: "text", value: "Fold" }],
  };
}

function createFoldBodyNode(children) {
  return {
    type: "containerDirective",
    name: "foldBody",
    attributes: {},
    data: {
      hName: "div",
      hProperties: {
        class: "content-fold-body",
      },
    },
    children,
  };
}

function isOpenFold(attributes) {
  if (!attributes || !Object.hasOwn(attributes, "open")) return undefined;

  return attributes.open !== "false";
}

function applySpoilerData(node) {
  const data = node.data || (node.data = {});
  data.hName = "span";
  data.hProperties = {
    class: "content-spoiler",
    tabindex: "0",
  };
}
