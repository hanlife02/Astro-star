<div align="center">

<img src="figures/Astro-star.png" alt="Astro-star" width="128" />

# Astro-star

**An open-source Astro theme that brings blogs, notes, projects, comments, and friend links into one personal site.**

[![Astro](https://img.shields.io/badge/Astro-5.x-ff5d01?style=flat-square&logo=astro&logoColor=white)](https://astro.build)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![pnpm](https://img.shields.io/badge/pnpm-10.30.x-f69220?style=flat-square&logo=pnpm&logoColor=white)](https://pnpm.io)
[![License](https://img.shields.io/badge/License-Apache--2.0-blue?style=flat-square)](./LICENSE)
[![PRs](https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square)](./CONTRIBUTING.md)

English · [简体中文](./README-zh-CN.md)

<a href="https://hanlife02.com">🌐 Live Demo</a> &nbsp;·&nbsp;
<a href="./CONTRIBUTING.md">🤝 Contributing</a> &nbsp;·&nbsp;
<a href="https://github.com/hanlife02/Astro-star/issues">🐛 Issues</a> &nbsp;·&nbsp;
<a href="https://github.com/hanlife02/Astro-star/discussions">💬 Discussions</a>

</div>

---

## Table of Contents

- [What Is This](#what-is-this)
- [Highlights](#highlights)
- [Preview](#preview)
- [Customization](#customization)
- [Config Migration](#config-and-content-migration)
- [Project Structure](#project-map)
- [Commands](#commands)
- [Deployment](#deployment)
- [Contributing](#build-together)
- [License](#license)

## What Is This

Astro-star started as a personal blog and is now moving toward a community-shaped personal site theme. You can fork it as your own homepage, or bring back your fixes, components, migration notes, deployment experience, and design ideas so the next person has an easier path.

The project focuses on a small but important kind of community: independent websites that are connected by writing, notes, projects, RSS, comments, friend links, and open-source collaboration.

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

## Preview

> 🌐 Live site: **<https://hanlife02.com>**

| Home (Dark) | Home (Light) |
|:---:|:---:|
| ![Home Dark](figures/Home.png) | ![Home Light](figures/Home-light.png) |

| Blog | Blog Categories |
|:---:|:---:|
| ![Blog](figures/Blog.png) | ![Blog Categories](figures/Blog-Categories.png) |

| Content | Friend Links |
|:---:|:---:|
| ![Content](figures/Content.png) | ![Links](figures/Links.png) |

## Customization

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

## Deployment

The repository includes a GitHub Actions workflow. Pushes to `main` compute a source hash and skip builds when nothing changed. Otherwise, the workflow installs dependencies, runs `pnpm build`, syncs files to the server with rsync + SSH, and starts `dist/server/entry.mjs` with PM2.

<details>
<summary><strong>Server requirements</strong></summary>

| Tool    | Requirement                      |
| ------- | -------------------------------- |
| Node.js | `>= 22`                          |
| pnpm    | Match the `packageManager` field |
| PM2     | Process management               |
| rsync   | File synchronization             |

</details>

<details>
<summary><strong>GitHub Secrets</strong></summary>

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

</details>

<details>
<summary><strong>Local environment</strong></summary>

For local development, you can create a `.env` file:

```env
WALINE_SERVER_URL=https://your-waline-server.com
GITHUB_TOKEN=your_github_token
```

`.env` is ignored by Git. `GITHUB_TOKEN` is optional and only improves the reliability of GitHub repository card API requests.

</details>

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

## Tech Stack

<div align="center">

[![Astro](https://img.shields.io/badge/Astro-ff5d01?style=for-the-badge&logo=astro&logoColor=white)](https://astro.build)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![MDX](https://img.shields.io/badge/MDX-fb6200?style=for-the-badge&logo=mdx&logoColor=white)](https://mdxjs.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Waline](https://img.shields.io/badge/Waline-24292e?style=for-the-badge&logo=github&logoColor=white)](https://waline.js.org)
[![Algolia](https://img.shields.io/badge/Algolia-5468FF?style=for-the-badge&logo=algolia&logoColor=white)](https://www.algolia.com)

</div>

## Star History

<a href="https://star-history.com/#hanlife02/Astro-star&Date">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=hanlife02/Astro-star&type=Date&theme=dark" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=hanlife02/Astro-star&type=Date" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=hanlife02/Astro-star&type=Date" />
 </picture>
</a>

## License

Astro-star is open-source under the [Apache License 2.0](./LICENSE).

---

<div align="center">

If you find this project helpful, consider giving it a ⭐ to show your support!

</div>
