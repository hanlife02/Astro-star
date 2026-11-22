import type { APIRoute } from "astro";

// Keep previously delivered confirmation and unsubscribe links usable.
export const GET: APIRoute = ({ url }) => {
  const token = url.searchParams.get("token");
  return new Response(null, {
    status: 302,
    headers: {
      Location: token
        ? `/#subscribe=${encodeURIComponent(token)}`
        : "/#subscribe",
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
};
