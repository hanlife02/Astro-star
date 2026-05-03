import type { APIRoute } from "astro";
import { GITHUB_TOKEN } from "astro:env/server";

interface GitHubRepositoryApiResponse {
  description?: string | null;
  stargazers_count?: number;
  owner?: {
    avatar_url?: string;
  };
}

interface GitHubRepositoryCardPayload {
  description: string;
  stars: number;
  avatarUrl: string;
}

interface CachedPayload {
  expiresAt: number;
  payload: GitHubRepositoryCardPayload;
}

const CACHE_TTL = 1000 * 60 * 60 * 6;
const repositoryCache = new Map<string, CachedPayload>();
const REPOSITORY_PART_PATTERN = /^[A-Za-z0-9_.-]+$/;

function jsonResponse(payload: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(payload), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=900, s-maxage=21600",
      ...init?.headers,
    },
  });
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&#(\d+);/g, (_, codePoint: string) => String.fromCodePoint(Number(codePoint)))
    .replace(/&#x([0-9a-f]+);/gi, (_, codePoint: string) =>
      String.fromCodePoint(Number.parseInt(codePoint, 16)),
    )
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function normalizeText(value: string) {
  return decodeHtmlEntities(value.replace(/<[^>]*>/g, ""))
    .replace(/\s+/g, " ")
    .trim();
}

function parseStars(value: string | undefined) {
  if (!value) return 0;

  const normalized = value.replace(/,/g, "").trim().toLowerCase();
  const match = normalized.match(/^([\d.]+)\s*([km])?$/);
  if (!match) return 0;

  const amount = Number(match[1]);
  if (!Number.isFinite(amount)) return 0;

  if (match[2] === "m") return Math.round(amount * 1_000_000);
  if (match[2] === "k") return Math.round(amount * 1_000);
  return Math.round(amount);
}

function extractAboutDescription(html: string) {
  const aboutIndex = html.search(/<h2[^>]*>\s*About\s*<\/h2>/i);
  if (aboutIndex >= 0) {
    const aboutSection = html.slice(aboutIndex, aboutIndex + 5000);
    const aboutDescription = aboutSection.match(/<p[^>]*class="[^"]*\bf4\b[^"]*"[^>]*>([\s\S]*?)<\/p>/i);

    if (aboutDescription?.[1]) {
      return normalizeText(aboutDescription[1]);
    }
  }

  const metaDescription = html.match(/<meta\s+(?:name="description"|property="og:description")\s+content="([^"]*)"/i);
  if (!metaDescription?.[1]) return "";

  return normalizeText(metaDescription[1]).replace(/\s+-\s+[^/\s]+\/[^/\s]+$/, "");
}

function extractStars(html: string) {
  const counterTitle = html.match(/id="repo-stars-counter-star"[^>]*title="([^"]*)"/i);
  if (counterTitle?.[1]) {
    return parseStars(decodeHtmlEntities(counterTitle[1]));
  }

  const sidebarStars = html.match(/<strong>\s*([^<]+)\s*<\/strong>\s*stars/i);
  return parseStars(sidebarStars?.[1]);
}

async function fetchFromGitHubApi(owner: string, repo: string) {
  const headers: Record<string, string> = {
    accept: "application/vnd.github+json",
    "user-agent": "Astro-star",
  };

  if (GITHUB_TOKEN) {
    headers.authorization = `Bearer ${GITHUB_TOKEN}`;
  }

  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers,
  });

  if (!response.ok) return null;

  const data = (await response.json()) as GitHubRepositoryApiResponse;

  return {
    description: data.description?.trim() ?? "",
    stars: typeof data.stargazers_count === "number" ? data.stargazers_count : 0,
    avatarUrl: data.owner?.avatar_url ?? `https://github.com/${owner}.png?size=96`,
  };
}

async function fetchFromGitHubHtml(owner: string, repo: string) {
  const response = await fetch(`https://github.com/${owner}/${repo}`, {
    headers: {
      "user-agent": "Astro-star",
    },
  });

  if (!response.ok) return null;

  const html = await response.text();

  return {
    description: extractAboutDescription(html),
    stars: extractStars(html),
    avatarUrl: `https://github.com/${owner}.png?size=96`,
  };
}

export const GET: APIRoute = async ({ url }) => {
  const owner = url.searchParams.get("owner")?.trim();
  const repo = url.searchParams.get("repo")?.trim();

  if (
    !owner ||
    !repo ||
    !REPOSITORY_PART_PATTERN.test(owner) ||
    !REPOSITORY_PART_PATTERN.test(repo)
  ) {
    return jsonResponse({ error: "Invalid GitHub repository." }, { status: 400 });
  }

  const cacheKey = `${owner}/${repo}`;
  const cachedPayload = repositoryCache.get(cacheKey);

  if (cachedPayload && cachedPayload.expiresAt > Date.now()) {
    return jsonResponse(cachedPayload.payload);
  }

  const htmlPayload = await fetchFromGitHubHtml(owner, repo);
  const apiPayload =
    !htmlPayload || !htmlPayload.description || htmlPayload.stars === 0
      ? await fetchFromGitHubApi(owner, repo)
      : null;
  const payload = {
    description: htmlPayload?.description || apiPayload?.description || "",
    stars: htmlPayload?.stars || apiPayload?.stars || 0,
    avatarUrl:
      apiPayload?.avatarUrl || htmlPayload?.avatarUrl || `https://github.com/${owner}.png?size=96`,
  };

  repositoryCache.set(cacheKey, {
    expiresAt: Date.now() + CACHE_TTL,
    payload,
  });

  return jsonResponse(payload);
};
