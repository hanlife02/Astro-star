import { PUBLIC_WALINE_SERVER_URL, WALINE_SERVER_URL } from "astro:env/server";

export const WALINE_SERVER_URL_ENV_LABEL =
  "WALINE_SERVER_URL or PUBLIC_WALINE_SERVER_URL";

export function getWalineServerURL() {
  return WALINE_SERVER_URL?.trim() || PUBLIC_WALINE_SERVER_URL?.trim() || "";
}
