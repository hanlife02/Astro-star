import type { APIRoute } from "astro";
import { CODETIME_TOKEN } from "astro:env/server";
import {
  emptyCodeTimeResponse,
  fetchCodeTime,
  getCodeTimeUserId,
} from "../../utils/codetime";

const VALID_THEMES = new Set(["light", "dark"]);
const ACTIVE_COLOR = "#0ea5e9";

interface CodeTimePublicStatusResponse {
  username?: string;
  language?: string | null;
  editor?: string | null;
  lastActiveAt?: number | null;
  todayMinutes?: number;
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  return remainder > 0 ? `${hours}h ${remainder}m` : `${hours}h`;
}

function formatLastSeen(timestamp?: number | null) {
  if (!timestamp) return "last seen unavailable";

  const elapsedSeconds = Math.max(
    0,
    Math.floor((Date.now() - timestamp * 1000) / 1000),
  );

  if (elapsedSeconds < 60) return "last seen just now";

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  if (elapsedMinutes < 60) return `last seen ${elapsedMinutes}m ago`;

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `last seen ${elapsedHours}h ago`;

  const elapsedDays = Math.floor(elapsedHours / 24);
  return `last seen ${elapsedDays}d ago`;
}

function getStatusLabel(lastActiveAt?: number | null) {
  if (!lastActiveAt) return "IDLE";

  const elapsedSeconds = Math.max(
    0,
    Math.floor((Date.now() - lastActiveAt * 1000) / 1000),
  );

  return elapsedSeconds <= 300 ? "CURRENTLY CODING" : "IDLE";
}

function renderStatusSvg(data: CodeTimePublicStatusResponse, theme: string) {
  const isDark = theme === "dark";
  const statusLabel = getStatusLabel(data.lastActiveAt);
  const statusColor =
    statusLabel === "CURRENTLY CODING" ? ACTIVE_COLOR : "#94a3b8";
  const background = isDark ? "#0b0d10" : "#ffffff";
  const border = isDark ? "#262b33" : "#e5e7eb";
  const text = isDark ? "#f3f4f6" : "#111827";
  const muted = isDark ? "#94a3b8" : "#6b7280";
  const secondary = isDark ? "#cbd5e1" : "#374151";
  const username = escapeXml(data.username ? `@${data.username}` : "@codetime");
  const language = escapeXml(data.language || "Unknown language");
  const editor = escapeXml(data.editor || "Unknown editor");
  const today = formatMinutes(Math.max(0, data.todayMinutes ?? 0));
  const lastSeen = escapeXml(formatLastSeen(data.lastActiveAt));

  return `<svg xmlns="http://www.w3.org/2000/svg" width="380" height="116" viewBox="0 0 380 116" role="img" aria-label="CodeTime status for ${username}">
  <rect width="380" height="116" rx="10" fill="${background}" stroke="${border}"/>
  ${
    statusLabel === "CURRENTLY CODING"
      ? `<circle cx="18" cy="20" r="5" fill="${ACTIVE_COLOR}" opacity="0.45">
    <animate attributeName="r" values="4;9;4" dur="1.6s" repeatCount="indefinite"/>
    <animate attributeName="opacity" values="0.6;0;0.6" dur="1.6s" repeatCount="indefinite"/>
  </circle>`
      : ""
  }
  <circle cx="18" cy="20" r="3.2" fill="${statusColor}"/>
  <text x="30" y="20" dominant-baseline="central" font-family="ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" font-size="10" letter-spacing="0.12em" font-weight="600" fill="${statusColor}">${statusLabel}</text>
  <text x="366" y="20" dominant-baseline="central" text-anchor="end" font-family="ui-monospace, SFMono-Regular, Menlo, 'JetBrains Mono', Consolas, monospace" font-size="10" fill="${muted}">${username}</text>
  <text x="14" y="50" dominant-baseline="central" font-family="ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" font-size="10" letter-spacing="0.1em" font-weight="600" fill="${muted}">LANGUAGE</text>
  <text x="94" y="50" dominant-baseline="central" font-family="ui-monospace, SFMono-Regular, Menlo, 'JetBrains Mono', Consolas, monospace" font-size="12.5" font-weight="600" fill="${text}">${language}</text>
  <text x="14" y="68" dominant-baseline="central" font-family="ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" font-size="10" letter-spacing="0.1em" font-weight="600" fill="${muted}">EDITOR</text>
  <text x="94" y="68" dominant-baseline="central" font-family="ui-monospace, SFMono-Regular, Menlo, 'JetBrains Mono', Consolas, monospace" font-size="12.5" fill="${secondary}">${editor}</text>
  <line x1="14" x2="366" y1="82" y2="82" stroke="${border}"/>
  <text x="14" y="98" dominant-baseline="central" font-family="ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" font-size="10" fill="${muted}">today</text>
  <text x="60" y="98" dominant-baseline="central" font-family="ui-monospace, SFMono-Regular, Menlo, 'JetBrains Mono', Consolas, monospace" font-size="11.5" font-weight="600" fill="${text}">${today}</text>
  <text x="366" y="98" dominant-baseline="central" text-anchor="end" font-family="ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" font-size="10" fill="${muted}">${lastSeen}</text>
</svg>`;
}

async function statusResponse(userId: number, token: string, theme: string) {
  const searchParams = new URLSearchParams({
    show: "language,editor",
  });
  const data = await fetchCodeTime<CodeTimePublicStatusResponse>(
    `/users/${userId}/public/status`,
    token,
    searchParams,
  );

  return new Response(renderStatusSvg(data, theme), {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=120, s-maxage=300",
    },
  });
}

export const GET: APIRoute = async ({ url }) => {
  const token = CODETIME_TOKEN?.trim();

  if (!token) {
    return emptyCodeTimeResponse();
  }

  try {
    const theme = url.searchParams.get("theme") ?? "light";
    const normalizedTheme = VALID_THEMES.has(theme) ? theme : "light";

    return statusResponse(
      await getCodeTimeUserId(token),
      token,
      normalizedTheme,
    );
  } catch {
    return emptyCodeTimeResponse();
  }
};
