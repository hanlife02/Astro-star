import type { APIRoute } from "astro";

export const GET: APIRoute = ({ redirect }) => {
  return redirect("/site-icon.svg?v=20260521", 302);
};
