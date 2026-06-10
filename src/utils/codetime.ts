interface CodeTimeUserSelfResponse {
  id?: number;
}

interface CachedUserId {
  expiresAt: number;
  userId: number;
}

export const CODETIME_API_BASE = "https://api.codetime.dev/v3";
export const CODETIME_SITE_BASE = "https://codetime.dev";

const CODETIME_FETCH_TIMEOUT = 3500;
const USER_ID_CACHE_TTL = 1000 * 60 * 60 * 24;

let cachedUserId: CachedUserId | null = null;

export function emptyCodeTimeResponse() {
  return new Response(null, {
    status: 204,
    headers: {
      "cache-control": "no-store",
    },
  });
}

export async function fetchCodeTime<T>(
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

export async function getCodeTimeUserId(token: string) {
  if (cachedUserId && cachedUserId.expiresAt > Date.now()) {
    return cachedUserId.userId;
  }

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

  return userId;
}
