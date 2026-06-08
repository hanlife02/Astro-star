import type { APIRoute } from "astro";
import { CODETIME_TOKEN } from "astro:env/server";

interface CodeTimeUserSelfResponse {
  id?: number;
}

interface CachedUserId {
  expiresAt: number;
  userId: number;
}

const CODETIME_API_BASE = "https://api.codetime.dev/v3";
const CODETIME_FETCH_TIMEOUT = 3500;
const USER_ID_CACHE_TTL = 1000 * 60 * 60 * 24;
let cachedUserId: CachedUserId | null = null;

function emptyResponse() {
  return new Response(null, {
    status: 204,
    headers: {
      "cache-control": "no-store",
    },
  });
}

function badgeRedirect(userId: number) {
  const codetimeShield = new URL(`${CODETIME_API_BASE}/users/shield`);
  codetimeShield.searchParams.set("uid", String(userId));

  const badge = new URL("https://shields.jannchie.com/endpoint");
  badge.searchParams.set("style", "social");
  badge.searchParams.set("color", "222");
  badge.searchParams.set("url", codetimeShield.toString());

  return new Response(null, {
    status: 302,
    headers: {
      location: badge.toString(),
      "cache-control": "public, max-age=300, s-maxage=900",
    },
  });
}

async function fetchCodeTime<T>(
  path: string,
  token: string,
  searchParams?: URLSearchParams,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, CODETIME_FETCH_TIMEOUT);

  const url = new URL(`${CODETIME_API_BASE}${path}`);
  searchParams?.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  try {
    const response = await fetch(url, {
      headers: {
        accept: "application/json",
        authorization: `Bearer ${token}`,
        "user-agent": "Astro-star",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`CodeTime request failed with ${response.status}.`);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

export const GET: APIRoute = async () => {
  const token = CODETIME_TOKEN?.trim();

  if (!token) {
    return emptyResponse();
  }

  if (cachedUserId && cachedUserId.expiresAt > Date.now()) {
    return badgeRedirect(cachedUserId.userId);
  }

  try {
    const user = await fetchCodeTime<CodeTimeUserSelfResponse>(
      "/users/self",
      token,
    );
    const userId = typeof user.id === "number" ? user.id : null;

    if (!userId) {
      throw new Error("CodeTime user id unavailable.");
    }

    cachedUserId = {
      expiresAt: Date.now() + USER_ID_CACHE_TTL,
      userId,
    };

    return badgeRedirect(userId);
  } catch {
    return emptyResponse();
  }
};
