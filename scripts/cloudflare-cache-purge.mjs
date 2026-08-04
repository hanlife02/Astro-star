import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

const PURGEABLE_EXTENSIONS = new Set([".html", ".txt", ".xml"]);
const RUNTIME_PURGE_PATHS = ["/favicon.ico", "/robots.txt", "/rss.xml"];
const MAX_URLS_PER_REQUEST = 100;

async function walkPurgeableFiles(directory) {
  const files = [];

  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await walkPurgeableFiles(path)));
    } else if (PURGEABLE_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
      files.push(path);
    }
  }

  return files;
}

function getSiteOrigin(indexHtml) {
  const canonicalTag = indexHtml.match(
    /<link\b[^>]*\brel=["']canonical["'][^>]*>/i,
  )?.[0];
  const canonicalHref = canonicalTag?.match(/\bhref=["']([^"']+)["']/i)?.[1];

  if (!canonicalHref) {
    throw new Error("Unable to find the homepage canonical URL.");
  }

  return new URL(canonicalHref).origin;
}

function toPublicPath(filePath, clientDirectory) {
  const relativePath = relative(clientDirectory, filePath).split(sep).join("/");

  if (relativePath === "index.html") return "/";
  if (relativePath.endsWith("/index.html")) {
    return `/${relativePath.slice(0, -"index.html".length)}`;
  }

  return `/${relativePath}`;
}

export async function collectPurgeUrls(clientDirectory) {
  const indexHtml = await readFile(join(clientDirectory, "index.html"), "utf8");
  const origin = getSiteOrigin(indexHtml);
  const files = await walkPurgeableFiles(clientDirectory);
  const publicPaths = new Set([
    ...files.map((filePath) => toPublicPath(filePath, clientDirectory)),
    ...RUNTIME_PURGE_PATHS,
  ]);

  return [...publicPaths]
    .map((publicPath) => new URL(publicPath, origin).toString())
    .sort();
}

export function chunkUrls(urls, size = MAX_URLS_PER_REQUEST) {
  const batches = [];

  for (let index = 0; index < urls.length; index += size) {
    batches.push(urls.slice(index, index + size));
  }

  return batches;
}

async function purgeUrlBatch(zoneId, apiToken, files) {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`,
    {
      body: JSON.stringify({ files }),
      headers: {
        authorization: `Bearer ${apiToken}`,
        "content-type": "application/json",
      },
      method: "POST",
    },
  );
  const result = await response.json().catch(() => null);

  if (!response.ok || result?.success !== true) {
    throw new Error(
      `Cloudflare cache purge failed (${response.status}): ${JSON.stringify(result)}`,
    );
  }
}

async function main() {
  const clientDirectory = resolve(process.argv[2] ?? "dist/client");
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;

  if (!apiToken || !zoneId) {
    console.log(
      "Cloudflare credentials not configured - skipping cache purge.",
    );
    return;
  }

  const urls = await collectPurgeUrls(clientDirectory);

  for (const batch of chunkUrls(urls)) {
    await purgeUrlBatch(zoneId, apiToken, batch);
  }

  console.log(`Purged ${urls.length} page URLs from Cloudflare.`);
}

const entryPath = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : "";
if (import.meta.url === entryPath) {
  await main();
}
