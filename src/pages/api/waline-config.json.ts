import type { APIRoute } from "astro";
import { getWalineServerURL } from "../../utils/waline-server-url";

export const GET: APIRoute = () => {
  return new Response(
    JSON.stringify({
      serverURL: getWalineServerURL(),
    }),
    {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    },
  );
};
