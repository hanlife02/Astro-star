function transformNode(node) {
  if (!node || typeof node !== "object") return;

  if (node.type === "element" && /^h[1-5]$/.test(node.tagName)) {
    const depth = Number(node.tagName.slice(1));
    node.tagName = `h${depth + 1}`;
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
