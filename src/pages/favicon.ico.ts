import type { APIRoute } from "astro";
import { site } from "../config/site";

export const GET: APIRoute = ({ redirect }) => {
  const iconSrc = site.site.iconSrc.trim() || "/site-icon.svg";
  const iconHref = iconSrc.includes("?") ? iconSrc : `${iconSrc}?v=20260521`;

  return redirect(iconHref, 302);
};
