function isElement(node, tagName) {
  return node?.type === "element" && node.tagName === tagName;
}

function isIgnorableParagraphNode(node) {
  return (node.type === "text" && !node.value.trim()) || isElement(node, "br");
}

function isImageMediaNode(node) {
  if (isElement(node, "img") || isElement(node, "picture")) {
    return true;
  }

  if (isElement(node, "a") && Array.isArray(node.children)) {
    const meaningfulChildren = node.children.filter((item) => !isIgnorableParagraphNode(item));

    return (
      meaningfulChildren.length === 1 &&
      (isElement(meaningfulChildren[0], "img") || isElement(meaningfulChildren[0], "picture"))
    );
  }

  return false;
}

function getCaptionSource(node) {
  if (isElement(node, "img")) {
    return typeof node.properties?.alt === "string" ? node.properties.alt.trim() : "";
  }

  if (isElement(node, "a") && Array.isArray(node.children)) {
    const meaningfulChildren = node.children.filter((item) => !isIgnorableParagraphNode(item));

    if (meaningfulChildren.length !== 1 || !isElement(meaningfulChildren[0], "img")) {
      return "";
    }

    const image = meaningfulChildren[0];
    return typeof image.properties?.alt === "string" ? image.properties.alt.trim() : "";
  }

  return "";
}

function createImageFigure(mediaNode) {
  const caption = getCaptionSource(mediaNode);
  const children = [mediaNode];

  if (caption) {
    children.push({
      type: "element",
      tagName: "figcaption",
      properties: {
        className: ["content-image-caption"],
      },
      children: [
        {
          type: "text",
          value: caption,
        },
      ],
    });
  }

  return {
    type: "element",
    tagName: "figure",
    properties: {
      className: ["content-image-figure"],
    },
    children,
  };
}

function transformNode(node) {
  if (!node || typeof node !== "object") return;

  if (Array.isArray(node.children)) {
    node.children = node.children.flatMap((child) => {
      transformNode(child);

      if (!isElement(child, "p") || !Array.isArray(child.children)) {
        return [child];
      }

      const meaningfulChildren = child.children.filter((item) => !isIgnorableParagraphNode(item));
      const isImageOnlyParagraph =
        meaningfulChildren.length > 0 && meaningfulChildren.every(isImageMediaNode);

      if (isImageOnlyParagraph) {
        return meaningfulChildren.map(createImageFigure);
      }

      return [child];
    });
  }
}

export function rehypeFigureCaptions() {
  return function rehypeFigureCaptionsTransformer(tree) {
    transformNode(tree);
  };
}
