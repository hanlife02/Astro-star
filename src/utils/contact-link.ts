export function getContactLink(href: string) {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }

  if (url.protocol === "mailto:") {
    let address: string;
    try {
      address = decodeURIComponent(url.pathname);
    } catch {
      return null;
    }
    if (!/^[^\s@,;<>]+@[^\s@,;<>]+$/.test(address)) return null;
    return { kind: "mail" as const, label: address };
  }

  if (
    !["https:", "http:"].includes(url.protocol) ||
    url.hostname !== "github.com" ||
    url.port ||
    url.username ||
    url.password
  ) {
    return null;
  }

  const match = url.pathname.match(
    /^\/([a-z\d](?:[a-z\d-]{0,37}[a-z\d])?)\/?$/i,
  );
  if (!match || match[1].includes("--")) return null;

  // These single-segment GitHub routes are site pages, not profiles.
  const siteRoutes = new Set([
    "about",
    "apps",
    "blog",
    "collections",
    "contact",
    "customer-stories",
    "enterprise",
    "events",
    "explore",
    "features",
    "issues",
    "join",
    "login",
    "logout",
    "marketplace",
    "new",
    "notifications",
    "organizations",
    "orgs",
    "pricing",
    "pulls",
    "readme",
    "search",
    "security",
    "sessions",
    "settings",
    "signup",
    "site",
    "solutions",
    "sponsors",
    "topics",
    "trending",
  ]);
  if (siteRoutes.has(match[1].toLowerCase())) return null;
  return { kind: "github" as const, label: match[1] };
}
