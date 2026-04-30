import type { APIRoute } from 'astro';

const getRobotsTxt = (sitemapURL: URL) =>
  `# Algolia-Crawler-Verif: 4DD129FBB60A97E4
User-agent: *
Allow: /

Sitemap: ${sitemapURL.href}
`;

export const GET: APIRoute = ({ site }) => {
  const sitemapURL = new URL('sitemap-index.xml', site);
  return new Response(getRobotsTxt(sitemapURL));
};
