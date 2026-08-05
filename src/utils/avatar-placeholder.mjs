import { resolve, sep } from "node:path";
import sharp from "sharp";

const publicRoot = resolve("public");
const publicRootPrefix = `${publicRoot}${sep}`;

function resolveLocalAvatarPath(avatarSrc) {
  if (!avatarSrc.startsWith("/") || avatarSrc.startsWith("//")) return;

  try {
    const { pathname } = new URL(avatarSrc, "https://local.invalid");
    const relativePath = decodeURIComponent(pathname).replace(/^\/+/, "");
    const assetPath = resolve(publicRoot, relativePath);

    if (!assetPath.startsWith(publicRootPrefix)) return;
    return assetPath;
  } catch {
    return;
  }
}

export async function createAvatarPlaceholderDataUrl(avatarSrc) {
  const assetPath = resolveLocalAvatarPath(avatarSrc);
  if (!assetPath) return;

  try {
    const preview = await sharp(assetPath)
      .resize(16, 16, { fit: "cover" })
      .webp({ quality: 35, effort: 6 })
      .toBuffer();

    return `data:image/webp;base64,${preview.toString("base64")}`;
  } catch {
    return;
  }
}
