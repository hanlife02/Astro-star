const markdownImagePattern =
  /!\[[^\]]*\]\(\s*(<[^>]+>|[^\s)]+)(?:\s+["'][^"']*["'])?\s*\)/u;
const htmlImagePattern = /<img\b[^>]*\bsrc=(?:"([^"]+)"|'([^']+)'|([^\s>]+))/iu;

function normalizeImageSrc(value?: string) {
  const src = value
    ?.trim()
    .replace(/^<(.+)>$/u, "$1")
    .trim();
  if (!src || /^(?:data|blob|javascript):/iu.test(src)) return "";

  return src;
}

export function resolveContentImage(
  source: string,
  image?: string,
  fallback = "",
) {
  const frontmatterImage = normalizeImageSrc(image);
  if (frontmatterImage) return frontmatterImage;

  const body = source.replace(/```[\s\S]*?```/g, " ");
  const markdownImage = normalizeImageSrc(
    body.match(markdownImagePattern)?.[1],
  );
  if (markdownImage) return markdownImage;

  const htmlImageMatch = body.match(htmlImagePattern);
  const htmlImage = normalizeImageSrc(
    htmlImageMatch?.[1] ?? htmlImageMatch?.[2] ?? htmlImageMatch?.[3],
  );
  if (htmlImage) return htmlImage;

  return fallback.trim();
}
