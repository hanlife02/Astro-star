<div align="center">

<img src="figures/Astro-star.png" alt="Astro-star" width="128" />

# Astro-star

**An open-source Astro theme that brings blogs, notes, projects, comments, and friend links into one personal site.**

[![Astro](https://img.shields.io/badge/Astro-6.x-ff5d01?style=flat-square&logo=astro&logoColor=white)](https://astro.build)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![pnpm](https://img.shields.io/badge/pnpm-10.30.x-f69220?style=flat-square&logo=pnpm&logoColor=white)](https://pnpm.io)
[![License](https://img.shields.io/badge/License-Apache--2.0-blue?style=flat-square)](./LICENSE)
[![PRs](https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square)](./CONTRIBUTING.md)

English · [简体中文](./README-zh-CN.md)

<a href="./CONTRIBUTING.md">🤝 Contributing</a> &nbsp;·&nbsp;
<a href="https://github.com/hanlife02/Astro-star/issues">🐛 Issues</a> &nbsp;·&nbsp;
<a href="https://hanlife02.com/project/astro-star">📖 Docs</a>

</div>

---

## Table of Contents

- [Astro-star](#astro-star)
  - [Table of Contents](#table-of-contents)
  - [Project Map](#project-map)
  - [Introduction and Deployment](#introduction-and-deployment)
  - [Build Together](#build-together)
  - [Tech Stack](#tech-stack)
  - [Sites Using This Theme](#sites-using-this-theme)
  - [Discussion and Exchange](#discussion-and-exchange)
  - [License](#license)

## Project Map

```text
/
├── public/                 # Static assets, avatars, site icon, article images
├── scripts/                # Config migration, index sync, and build helpers
├── src/
│   ├── components/         # Reusable components
│   ├── config/             # Site, social links, friend links, and search config
│   ├── content/            # blog / note / project / page content collections
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

## Introduction and Deployment

See [Introduction and Deployment of Astro-star](https://hanlife02.com/project/astro-star/).

## Build Together

Small contributions are welcome. A clear Issue, a mobile screenshot, a reproducible bug, a more ergonomic component, or a short setup note can all make this theme easier to maintain and reuse.

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
[![Waline](https://img.shields.io/badge/Waline-24292e?style=for-the-badge&logo=github&logoColor=white)](https://waline.js.org)
[![Algolia](https://img.shields.io/badge/Algolia-5468FF?style=for-the-badge&logo=algolia&logoColor=white)](https://www.algolia.com)

</div>

## Sites Using This Theme

Welcome to use this theme for your personal site! Submit a PR to add your site to the list.

| Avatar                                                    | Site                           | Description                    |
| --------------------------------------------------------- | ------------------------------ | ------------------------------ |
| <img src="https://github.com/hanlife02.png" width="50" /> | [Ethan](https://hanlife02.com) | Don't stay awake for too long. |

## Discussion and Exchange

Welcome to participate in discussions, feedback issues, and feature suggestions in the [LINUX DO](https://linux.do) community.

## License

Astro-star is open-source under the [Apache License 2.0](./LICENSE).

<a href="https://www.star-history.com/?repos=hanlife02%2FAstro-star&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=hanlife02/Astro-star&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=hanlife02/Astro-star&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=hanlife02/Astro-star&type=date&legend=top-left" />
 </picture>
</a>

---

<div align="center">

If you find this project helpful, consider giving it a ⭐ to show your support!

</div>
