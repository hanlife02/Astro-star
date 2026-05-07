import type { APIRoute } from "astro";
import { WALINE_SERVER_URL } from "astro:env/server";

export const GET: APIRoute = () => {
  return new Response(
    JSON.stringify({
      serverURL: WALINE_SERVER_URL?.trim() || "",
    }),
    {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    },
  );
};
