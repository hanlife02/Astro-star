const VOID_HTML_TAG_PATTERN =
  /<(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)(\s[^<>]*?)?>/gi;

function normalizeVoidHtmlTags(line) {
  let output = "";
  let cursor = 0;
  let inlineCodeFenceLength = 0;

  while (cursor < line.length) {
    if (line[cursor] === "`") {
      let fenceEnd = cursor;

      while (line[fenceEnd] === "`") {
        fenceEnd += 1;
      }

      const fence = line.slice(cursor, fenceEnd);
      output += fence;

      if (inlineCodeFenceLength === 0) {
        inlineCodeFenceLength = fence.length;
      } else if (inlineCodeFenceLength === fence.length) {
        inlineCodeFenceLength = 0;
      }

      cursor = fenceEnd;
      continue;
    }

    let nextFence = line.indexOf("`", cursor);
    if (nextFence === -1) nextFence = line.length;

    const chunk = line.slice(cursor, nextFence);
    output += inlineCodeFenceLength
      ? chunk
      : chunk.replace(VOID_HTML_TAG_PATTERN, (match) =>
          match.endsWith("/>") ? match : `${match.slice(0, -1)} />`,
        );
    cursor = nextFence;
  }

  return output;
}

function normalizeMdxVoidHtml(source) {
  const lines = source.split(/\r?\n/);
  const normalizedLines = [];
  let inFrontmatter = false;
  let frontmatterResolved = false;
  let fencedCodeMarker = "";

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmedLine = line.trim();

    if (!frontmatterResolved && index === 0 && trimmedLine === "---") {
      inFrontmatter = true;
      normalizedLines.push(line);
      continue;
    }

    if (inFrontmatter) {
      normalizedLines.push(line);

      if (trimmedLine === "---") {
        inFrontmatter = false;
        frontmatterResolved = true;
      }

      continue;
    }

    const fenceMatch = line.match(/^(\s*)(`{3,}|~{3,})/);

    if (fenceMatch) {
      normalizedLines.push(line);

      if (!fencedCodeMarker) {
        fencedCodeMarker = fenceMatch[2];
      } else if (
        fenceMatch[2][0] === fencedCodeMarker[0] &&
        fenceMatch[2].length >= fencedCodeMarker.length
      ) {
        fencedCodeMarker = "";
      }

      continue;
    }

    if (fencedCodeMarker) {
      normalizedLines.push(line);
      continue;
    }

    normalizedLines.push(normalizeVoidHtmlTags(line));
  }

  return normalizedLines.join("\n");
}

/** @returns {import("vite").Plugin} */
export function mdxVoidHtmlPlugin() {
  return /** @type {import("vite").Plugin} */ ({
    name: "mdx-void-html-plugin",
    enforce: "pre",
    transform(code, id) {
      const filename = id.split("?", 1)[0];

      if (!filename || !/\.mdx$/i.test(filename)) {
        return null;
      }

      const normalizedCode = normalizeMdxVoidHtml(code);

      if (normalizedCode === code) {
        return null;
      }

      return {
        code: normalizedCode,
        map: null,
      };
    },
  });
}
