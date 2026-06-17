import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC_FIGURES_DIR = join(ROOT, "public", "figures");
const SCAN_DIRS = ["src", "public"].map((dir) => join(ROOT, dir));
const LARGE_ASSET_LIMIT_BYTES = Number(
  process.env.ASSET_AUDIT_LIMIT_BYTES ?? 800 * 1024,
);
const REPORT_LIMIT = Number(process.env.ASSET_AUDIT_REPORT_LIMIT ?? 30);
const IMAGE_EXTENSIONS = new Set([
  ".avif",
  ".gif",
  ".jpeg",
  ".jpg",
  ".png",
  ".webp",
]);

type Asset = {
  path: string;
  size: number;
};

function walk(dir: string, predicate: (path: string) => boolean) {
  const files: string[] = [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...walk(fullPath, predicate));
    } else if (predicate(fullPath)) {
      files.push(fullPath);
    }
  }

  return files;
}

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

function getExtension(path: string) {
  const match = basename(path).match(/\.[^.]+$/);
  return match?.[0].toLowerCase() ?? "";
}

function collectFigureAssets() {
  if (!existsSync(PUBLIC_FIGURES_DIR)) {
    return [];
  }

  return walk(PUBLIC_FIGURES_DIR, (path) =>
    IMAGE_EXTENSIONS.has(getExtension(path)),
  )
    .map((path): Asset => {
      const relativePath = relative(ROOT, path).replace(/\\/g, "/");
      return {
        path: relativePath,
        size: statSync(path).size,
      };
    })
    .sort((a, b) => b.size - a.size);
}

function collectReferencedFigurePaths() {
  const referenced = new Set<string>();
  const textFiles = SCAN_DIRS.flatMap((dir) =>
    walk(dir, (path) => {
      if (path.startsWith(PUBLIC_FIGURES_DIR)) return false;
      return /\.(astro|css|html|js|json|md|mdx|mjs|ts|tsx)$/i.test(path);
    }),
  );

  for (const filePath of textFiles) {
    const content = readFileSync(filePath, "utf8");
    for (const match of content.matchAll(/\/figures\/[^"')\]\s<]+/g)) {
      try {
        const pathname = decodeURIComponent(match[0].split(/[?#]/, 1)[0]);
        referenced.add(`public${pathname}`);
      } catch {
        referenced.add(`public${match[0].split(/[?#]/, 1)[0]}`);
      }
    }
  }

  return referenced;
}

function main() {
  const assets = collectFigureAssets();
  const referenced = collectReferencedFigurePaths();
  const largeAssets = assets.filter(
    (asset) => asset.size > LARGE_ASSET_LIMIT_BYTES,
  );
  const unreferencedAssets = assets.filter(
    (asset) => !referenced.has(asset.path),
  );
  const totalSize = assets.reduce((sum, asset) => sum + asset.size, 0);

  console.log(
    `Asset audit: ${assets.length} figure images, ${formatBytes(totalSize)} total.`,
  );
  console.log(
    `Large image threshold: ${formatBytes(LARGE_ASSET_LIMIT_BYTES)}. Found ${largeAssets.length}.`,
  );

  largeAssets.slice(0, REPORT_LIMIT).forEach((asset) => {
    console.log(`large ${formatBytes(asset.size).padStart(8)}  ${asset.path}`);
  });

  if (largeAssets.length > REPORT_LIMIT) {
    console.log(`... ${largeAssets.length - REPORT_LIMIT} more large images.`);
  }

  console.log(`Unreferenced figure images: ${unreferencedAssets.length}.`);
  unreferencedAssets.slice(0, REPORT_LIMIT).forEach((asset) => {
    console.log(`unused ${formatBytes(asset.size).padStart(7)}  ${asset.path}`);
  });

  if (unreferencedAssets.length > REPORT_LIMIT) {
    console.log(
      `... ${unreferencedAssets.length - REPORT_LIMIT} more unreferenced images.`,
    );
  }
}

main();
