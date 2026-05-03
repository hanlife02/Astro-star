<div align="center">

<img src="figures/Astro-star.png" alt="Astro-star" width="144" />

# Astro-star

An Astro theme community that brings blogs, notes, projects, comments, and friend links into one personal website.

English · [简体中文](./README-zh-CN.md)

[Live Demo](https://hanlife02.com) · [Contributing](./CONTRIBUTING.md) · [Issues](https://github.com/hanlife02/Astro-star/issues) · [License](./LICENSE)

![Astro](https://img.shields.io/badge/Astro-5.x-ff5d01?style=flat-square&logo=astro&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22-339933?style=flat-square&logo=node.js&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-10.30.x-f69220?style=flat-square&logo=pnpm&logoColor=white)
![License](https://img.shields.io/badge/License-Apache--2.0-blue?style=flat-square)
![PRs](https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square)

</div>

## What Is This

Astro-star started as a personal blog and is now moving toward a community-shaped personal site theme. You can fork it as your own homepage, or bring back your fixes, components, migration notes, deployment experience, and design ideas so the next person has an easier path.

The project focuses on a small but important kind of community: independent websites that are connected by writing, notes, projects, RSS, comments, friend links, and open-source collaboration.

## What You Can Do Here

| If you are             | Start here                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------ |
| Building your own site | Fork the repository, replace the personal configuration and content, then deploy your blog |
| Customizing a theme    | Reuse the layouts, routes, content collections, and design tokens                          |
| Contributing           | Fix bugs, improve docs, polish mobile views, or add reusable components                    |
| Looking for discussion | Open an Issue with ideas, screenshots, design feedback, or usage questions                 |

## Highlights

| Feature              | Description                                                                        |
| -------------------- | ---------------------------------------------------------------------------------- |
| Astro SSR            | Uses `@astrojs/node` standalone output, suitable for deployment on your own server |
| Content collections  | `blog`, `note`, and `project` are powered by Astro Content Collections             |
| Fixed site routes    | Home, About, Blog, Note, Project, and Links are built in                           |
| Theme switching      | Supports light, dark, and system modes with cookies for stable first paint         |
| MDX writing          | Supports MDX, math, KaTeX, figure captions, and custom content components          |
| Comments and links   | Includes Waline comments and a friend links page with application notes            |
| Search and feeds     | Optional Algolia site search, RSS, Sitemap, and robots.txt are included            |
| GitHub repo cards    | Content pages can display GitHub repository metadata and star counts               |
| Config migration     | Extract and restore site config, content, avatars, and article images              |
| Automated deployment | GitHub Actions builds, rsync + SSH deploys, and PM2 manages the process            |

## Quick Start

```bash
git clone https://github.com/hanlife02/Astro-star.git
cd Astro-star

pnpm install
pnpm dev
```

The development server runs at <http://localhost:4321> by default.

To turn it into your own site, these are the usual places to edit:

| Goal                                           | Location               |
| ---------------------------------------------- | ---------------------- |
| Site name, avatar, navigation, social accounts | `src/config/site.ts`   |
| About page content                             | `src/config/about.ts`  |
| Links page and friend links                    | `src/config/links.ts`  |
| Public Algolia search settings                 | `src/config/search.ts` |
| Blog posts                                     | `src/content/blog/`    |
| Short notes                                    | `src/content/note/`    |
| Project pages                                  | `src/content/project/` |
| Avatar, site icon, and article images          | `public/`              |

## Writing Content

Blog posts and notes use `.md` or `.mdx` files in their matching content directories.

```md
---
routeSlug: my-first-post
title: My First Post
description: A short description for this post
createdAt: "2026-05-03 20:00:00"
type: Essay
archiveSlug: writing
---

Write your content here...
```

Project pages live in `src/content/project/` and require more complete project metadata.

```md
---
routeSlug: my-project
title: Project Name
description: A short project description
createdAt: "2026-05-03 20:00:00"
type: Project
archiveSlug: project
projectUrl: https://example.com
docUrl: https://github.com/user/repo/blob/main/README.md
avatar: /images/project-avatar.svg
---

Write the project details here...
```

## Config And Content Migration

If you have already customized your local site, you can package your personal config and content:

```bash
pnpm run config:extract
```

This creates or updates:

| File                                | Purpose                                        |
| ----------------------------------- | ---------------------------------------------- |
| `src/data/user-config.json`         | Structured site configuration                  |
| `src/data/user-config.example.json` | Shareable configuration template               |
| `src/data/user-content.tar.gz`      | Blog, note, project, avatar, and image archive |

Restore those files in another copy of the repository:

```bash
pnpm run config:apply
```

This rewrites `src/config/site.ts`, `src/config/about.ts`, and `src/config/links.ts`, then restores content assets when an archive is available. Do not put secrets, private links, or non-public personal data into these configuration files.

## Project Map

```text
/
├── public/                 # Static assets, avatars, site icon, article images
├── scripts/                # Config migration, index sync, and build helpers
├── src/
│   ├── components/         # Reusable components
│   ├── config/             # Site, about, links, and search config
│   ├── content/            # blog / note / project content collections
│   ├── layouts/            # Page layouts
│   ├── pages/              # Routes and API endpoints
│   ├── scripts/            # Browser-side interaction scripts
│   ├── style/              # Global styles, component styles, design tokens
│   └── utils/              # Markdown, MDX, and shared utilities
├── astro.config.mjs
├── ecosystem.config.cjs
└── package.json
```

Top-level routes:

| Path       | Description  |
| ---------- | ------------ |
| `/`        | Home         |
| `/about`   | About        |
| `/blog`    | Blog         |
| `/note`    | Notes        |
| `/project` | Projects     |
| `/links`   | Friend links |

## Commands

```bash
pnpm dev              # Start the development server
pnpm build            # Build production output into ./dist/
pnpm preview          # Preview the production build locally
pnpm check            # Run Astro type checks
pnpm format           # Format with Prettier
pnpm format:check     # Check formatting
pnpm algolia:sync     # Sync src/content into the Algolia index
pnpm migrate:content  # Migrate legacy content structure
pnpm config:extract   # Extract user config and content
pnpm config:apply     # Apply user config and content
```

## Build Together

Small contributions are welcome. A clear Issue, a mobile screenshot, a reproducible bug, a more ergonomic component, or a short setup note can all make this theme easier to maintain and reuse.

| Type             | Good contributions                                                    |
| ---------------- | --------------------------------------------------------------------- |
| Bug              | Build failures, layout glitches, route issues, dark-mode problems     |
| UX polish        | Mobile layout, accessibility, interaction details, loading states     |
| Theme capability | New components, content cards, archive views, link display patterns   |
| Documentation    | Setup guides, deployment notes, configuration docs, migration stories |
| Integrations     | Search, comments, feeds, analytics, and more deployment platforms     |

Before opening a PR, it is recommended to run:

```bash
pnpm check
pnpm format:check
pnpm build
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the core rules. The most important ones are: do not hard-code business content in components, keep styles in `src/style/`, build mobile-first, and never commit secrets.

## Deployment

The repository includes a GitHub Actions workflow. Pushes to `main` compute a source hash and skip builds when nothing changed. Otherwise, the workflow installs dependencies, runs `pnpm build`, syncs files to the server with rsync + SSH, and starts `dist/server/entry.mjs` with PM2.

Server requirements:

| Tool    | Requirement                      |
| ------- | -------------------------------- |
| Node.js | `>= 22`                          |
| pnpm    | Match the `packageManager` field |
| PM2     | Process management               |
| rsync   | File synchronization             |

GitHub Secrets:

| Name                       | Default        | Description                                                                               |
| -------------------------- | -------------- | ----------------------------------------------------------------------------------------- |
| `SSH_PRIVATE_KEY`          | None           | SSH private key for deployment                                                            |
| `SSH_HOST`                 | None           | Server IP or domain                                                                       |
| `SSH_USER`                 | `ubuntu`       | SSH username                                                                              |
| `SSH_PORT`                 | `22`           | SSH port                                                                                  |
| `DEPLOY_PATH`              | `~/Astro-star` | Target directory on the server                                                            |
| `PM2_APP_NAME`             | `Astro-star`   | PM2 application name                                                                      |
| `APP_PORT`                 | `4321`         | Astro server port                                                                         |
| `PUBLIC_WALINE_SERVER_URL` | None           | Waline comment server URL                                                                 |
| `ALGOLIA_WRITE_API_KEY`    | Optional       | Algolia indexing key                                                                      |
| `ALGOLIA_ADMIN_API_KEY`    | Optional       | Clears the old index before syncing; old records are not automatically removed without it |

For local development, you can create a `.env` file:

```env
WALINE_SERVER_URL=https://your-waline-server.com
GITHUB_TOKEN=your_github_token
```

`.env` is ignored by Git. `GITHUB_TOKEN` is optional and only improves the reliability of GitHub repository card API requests.

## License

Astro-star is open-source under the [Apache License 2.0](./LICENSE).
