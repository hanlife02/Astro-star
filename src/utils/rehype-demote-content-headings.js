function transformNode(node) {
  if (!node || typeof node !== "object") return;

  if (node.type === "element" && node.tagName === "h1") {
    node.tagName = "h2";
  }

  if (Array.isArray(node.children)) {
    node.children.forEach(transformNode);
  }
}

export function rehypeDemoteContentHeadings() {
  return function rehypeDemoteContentHeadingsTransformer(tree) {
    transformNode(tree);
  };
}
