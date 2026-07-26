export function remarkContentFormatDirectives() {
  return function remarkContentFormatDirectivesTransformer(tree, file) {
    const source =
      typeof file?.value === "string"
        ? file.value
        : String(file?.value ?? "") || "";
    transformChildren(tree, source);
  };
}

function transformChildren(parent, source) {
  if (!Array.isArray(parent.children)) return;

  applyInlineSpoilerSpans(parent, source);

  for (const child of parent.children) {
    if (child.type === "containerDirective" && child.name === "fold") {
      applyFoldData(child);
      transformChildren(child, source);
      continue;
    }

    if (child.type === "textDirective" && child.name === "spoiler") {
      applySpoilerData(child);
      continue;
    }

    transformChildren(child, source);
  }
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
