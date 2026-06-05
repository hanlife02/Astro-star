export function remarkContentFormatDirectives() {
  return function remarkContentFormatDirectivesTransformer(tree) {
    transformChildren(tree);
  };
}

function transformChildren(parent) {
  if (!Array.isArray(parent.children)) return;

  for (let index = 0; index < parent.children.length; index += 1) {
    const child = parent.children[index];

    if (child.type === "containerDirective" && child.name === "fold") {
      applyFoldData(child);
      transformChildren(child);
      continue;
    }

    if (child.type === "textDirective" && child.name === "spoiler") {
      applySpoilerData(child);
      continue;
    }

    if (child.type === "text" && typeof child.value === "string") {
      const replacement = splitSpoilerText(child.value);

      if (replacement) {
        parent.children.splice(index, 1, ...replacement);
        index += replacement.length - 1;
      }

      continue;
    }

    transformChildren(child);
  }
}

function splitSpoilerText(value) {
  const nodes = [];
  let cursor = 0;
  let changed = false;

  while (cursor < value.length) {
    const start = value.indexOf("||", cursor);

    if (start === -1) {
      appendTextNode(nodes, value.slice(cursor));
      break;
    }

    const end = value.indexOf("||", start + 2);

    if (end === -1) {
      appendTextNode(nodes, value.slice(cursor));
      break;
    }

    if (end === start + 2) {
      appendTextNode(nodes, value.slice(cursor, start + 2));
      cursor = start + 2;
      continue;
    }

    appendTextNode(nodes, value.slice(cursor, start));
    nodes.push(createSpoilerNode(value.slice(start + 2, end)));
    changed = true;
    cursor = end + 2;
  }

  return changed ? nodes : undefined;
}

function createSpoilerNode(value) {
  const node = {
    type: "textDirective",
    name: "spoiler",
    attributes: {},
    children: [{ type: "text", value }],
  };

  applySpoilerData(node);

  return node;
}

function appendTextNode(nodes, value) {
  if (value) {
    nodes.push({ type: "text", value });
  }
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
