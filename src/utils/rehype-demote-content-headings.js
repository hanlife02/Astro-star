function transformNode(node) {
  if (!node || typeof node !== "object") return;

  if (node.type === "element" && node.tagName === "h1") {
    node.tagName = "h2";
    node.properties = node.properties ?? {};
    const classNames = Array.isArray(node.properties.className)
      ? node.properties.className
      : typeof node.properties.className === "string"
        ? node.properties.className.split(/\s+/).filter(Boolean)
        : [];

    if (!classNames.includes("content-heading-original-h1")) {
      classNames.push("content-heading-original-h1");
    }

    node.properties.className = classNames;
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
