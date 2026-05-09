import type { APIRoute } from "astro";
import { algoliaCrawlerVerification } from "../config/search";

const getRobotsTxt = (sitemapURL: URL) =>
  `${algoliaCrawlerVerification ? `# Algolia-Crawler-Verif: ${algoliaCrawlerVerification}\n` : ""}User-agent: *
Allow: /

Sitemap: ${sitemapURL.href}
`;

export const GET: APIRoute = ({ site }) => {
  const sitemapURL = new URL("sitemap-index.xml", site);
  return new Response(getRobotsTxt(sitemapURL), {
    headers: {
      "cache-control": "public, max-age=3600, s-maxage=86400",
      "content-type": "text/plain; charset=utf-8",
    },
  });
};
