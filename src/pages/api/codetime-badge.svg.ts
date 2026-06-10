import type { APIRoute } from "astro";
import { CODETIME_TOKEN } from "astro:env/server";
import {
  CODETIME_API_BASE,
  emptyCodeTimeResponse,
  getCodeTimeUserId,
} from "../../utils/codetime";

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

export const GET: APIRoute = async () => {
  const token = CODETIME_TOKEN?.trim();

  if (!token) {
    return emptyCodeTimeResponse();
  }

  try {
    return badgeRedirect(await getCodeTimeUserId(token));
  } catch {
    return emptyCodeTimeResponse();
  }
};
