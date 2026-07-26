import { getImage } from "astro:assets";

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

// Article images live beside their article and are referenced relatively, so
// the scraped value is meaningless as a site URL until it is mapped onto the
// asset Astro emits for it.
const contentImageModules = import.meta.glob<{ default: ImageMetadata }>(
  "/src/content/**/*.{png,jpg,jpeg,gif,webp,avif}",
);

// Social crawlers cap preview images and several still choke on webp, so the
// card gets a bounded jpeg rather than the article's optimized webp.
const SOCIAL_IMAGE_MAX_WIDTH = 1200;

function toContentModuleKey(contentPath: string, relativeSrc: string) {
  const articleDir = contentPath
    .replace(/^\/*/, "/")
    .split("/")
    .slice(0, -1)
    .join("/");

  try {
    const resolved = new URL(relativeSrc, `file://${encodeURI(articleDir)}/`);
    return decodeURIComponent(resolved.pathname);
  } catch {
    return "";
  }
}

export async function resolveSocialImageSrc(
  imageSrc: string,
  contentPath: string,
) {
  if (!imageSrc.startsWith("./") && !imageSrc.startsWith("../")) {
    return imageSrc;
  }

  const loadModule =
    contentImageModules[toContentModuleKey(contentPath, imageSrc)];
  if (!loadModule) return "";

  try {
    const { default: metadata } = await loadModule();
    const { src } = await getImage({
      src: metadata,
      format: "jpeg",
      width: Math.min(SOCIAL_IMAGE_MAX_WIDTH, metadata.width),
    });

    return src;
  } catch {
    return "";
  }
}
