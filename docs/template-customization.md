# Template Customization

This document lists the main files to edit after forking Astro-star.

## Site Profile

- `src/config/site.ts`: site name, domain, author profile, navigation, social IDs, and optional registration links.
- `public/avatar.svg`: default profile avatar.
- `public/site-icon.svg`: default site icon and Open Graph fallback image.

## Pages

- `src/content/page/about.mdx`: About page content.
- `src/content/page/links.mdx`: Links page intro and application copy.
- `src/config/links.ts`: friend links, owner card, and application rules.
- `src/config/search.ts`: optional Algolia SiteSearch configuration.

## Content

- `src/content/blog`: long-form posts.
- `src/content/note`: short notes and lightweight records.
- `src/content/project`: project pages.
- `public/figures`: optional local images referenced by content. Create this directory in your personal site branch when you need local assets.

The layout renders the page title as the article `h1`, so start article body headings at `##`.

## Deployment

The default deploy workflow builds `main` for forked repositories. In the upstream repository, deployment is scoped to the `Ethan` branch and `main` is treated as the public template branch.
