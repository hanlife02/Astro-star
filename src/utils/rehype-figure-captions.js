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

function getGitHubRepository(href) {
  if (typeof href !== "string") {
    return null;
  }

  let url;

  try {
    url = new URL(href);
  } catch {
    return null;
  }

  if (url.hostname !== "github.com" && url.hostname !== "www.github.com") {
    return null;
  }

  const [owner, repo, ...rest] = url.pathname.split("/").filter(Boolean);

  if (!owner || !repo || rest.length > 0) {
    return null;
  }

  return {
    owner,
    repo: repo.replace(/\.git$/, ""),
    href: url.href,
  };
}

function createGitHubRepositoryCard(linkNode, repository) {
  const avatarSrc = `https://github.com/${repository.owner}.png?size=96`;

  return {
    type: "element",
    tagName: "a",
    properties: {
      className: ["content-repo-card"],
      href: repository.href,
      dataGithubRepoCard: "true",
      dataGithubOwner: repository.owner,
      dataGithubRepo: repository.repo,
      ariaLabel: `Open GitHub repository ${repository.owner}/${repository.repo}`,
    },
    children: [
      {
        type: "element",
        tagName: "span",
        properties: {
          className: ["content-repo-card-body"],
        },
        children: [
          {
            type: "element",
            tagName: "span",
            properties: {
              className: ["content-repo-card-header"],
            },
            children: [
              {
                type: "element",
                tagName: "span",
                properties: {
                  className: ["content-repo-card-title"],
                },
                children: [
                  {
                    type: "element",
                    tagName: "svg",
                    properties: {
                      className: ["content-repo-card-title-icon"],
                      xmlns: "http://www.w3.org/2000/svg",
                      viewBox: "0 0 24 24",
                      width: "24",
                      height: "24",
                      fill: "none",
                      stroke: "currentColor",
                      strokeWidth: "2",
                      strokeLinecap: "round",
                      strokeLinejoin: "round",
                      ariaHidden: "true",
                      focusable: "false",
                    },
                    children: [
                      {
                        type: "element",
                        tagName: "path",
                        properties: {
                          d: "M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4",
                        },
                        children: [],
                      },
                      {
                        type: "element",
                        tagName: "path",
                        properties: {
                          d: "M9 18c-4.51 2-5-2-7-2",
                        },
                        children: [],
                      },
                    ],
                  },
                  {
                    type: "element",
                    tagName: "span",
                    properties: {
                      className: ["content-repo-card-title-text"],
                    },
                    children: [
                      {
                        type: "text",
                        value: repository.repo,
                      },
                    ],
                  },
                ],
              },
              {
                type: "element",
                tagName: "span",
                properties: {
                  className: ["content-repo-card-stars"],
                  dataGithubRepoStars: "true",
                  hidden: true,
                },
                children: [
                  {
                    type: "element",
                    tagName: "svg",
                    properties: {
                      className: ["content-repo-card-star-icon"],
                      viewBox: "0 0 16 16",
                      width: "16",
                      height: "16",
                      ariaHidden: "true",
                      focusable: "false",
                    },
                    children: [
                      {
                        type: "element",
                        tagName: "path",
                        properties: {
                          d: "M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194-3.047-2.97a.75.75 0 0 1 .416-1.278l4.21-.612L7.327.668A.75.75 0 0 1 8 .25Z",
                        },
                        children: [],
                      },
                    ],
                  },
                  {
                    type: "element",
                    tagName: "span",
                    properties: {
                      dataGithubRepoStarCount: "true",
                    },
                    children: [],
                  },
                ],
              },
            ],
          },
          {
            type: "element",
            tagName: "span",
            properties: {
              className: ["content-repo-card-description"],
              dataGithubRepoDescription: "true",
            },
            children: [],
          },
        ],
      },
      {
        type: "element",
        tagName: "span",
        properties: {
          className: ["content-repo-card-side"],
        },
        children: [
          {
            type: "element",
            tagName: "img",
            properties: {
              className: ["content-repo-card-avatar"],
              src: avatarSrc,
              alt: "",
              loading: "lazy",
              decoding: "async",
              referrerPolicy: "no-referrer",
            },
            children: [],
          },
        ],
      },
    ],
  };
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

      if (meaningfulChildren.length === 1 && isElement(meaningfulChildren[0], "a")) {
        const repository = getGitHubRepository(meaningfulChildren[0].properties?.href);

        if (repository) {
          return [createGitHubRepositoryCard(meaningfulChildren[0], repository)];
        }
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
