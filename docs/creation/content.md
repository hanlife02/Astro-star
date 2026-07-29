---
order: 10
---

# Creating Content

## Directory Structure

```text
src/content/
├── blog/
├── note/
├── project/
└── page/
```

`blog` is for blog posts, `note` is for notes, `project` is for projects, and `page` is for fixed pages (e.g. about, links).

## Categories

Create a new directory under `blog/` or `note/`. The directory name becomes the category `routeSlug`. Using Chinese characters is not recommended.

The `type` field can use Chinese as the category name. Within the same directory, the `type` value must remain consistent; otherwise, one of the values will be randomly selected as the category name.

If articles are placed directly under `blog/` or `note/`, they will be classified as `uncategorized`.

## Articles

Files in `md` or `mdx` format are supported.

Recommended frontmatter for `blog` and `note`:

```md
---
routeSlug: 'deploy-astro-star'
title: 'Astro-star Deployment Log'
description: 'A record of the process from build to server launch.'
createdAt: '2026-05-03 20:30'
updatedAt: '2026-05-03 20:30'
type: 'Building'
---
```

| Variables   | Description                                                                     |
| ----------- | ------------------------------------------------------------------------------- |
| routeSlug   | Defines the end of the article URL                                              |
| title       | Article title                                                                   |
| description | Article description                                                             |
| createdAt   | Creation date. Auto-generated from git if absent; generally not needed          |
| updatedAt   | Update date. Same as `createdAt`; generally not needed                          |
| type        | Article category (`project` does not currently support `type`-based categories) |

## Project Page Frontmatter

```md
---
routeSlug: 'my-project'
title: 'My Project'
description: 'A short project description.'
createdAt: '2026-06-15 23:05:26'
projectUrl: 'https://github.com/your-name/my-project'
docUrl: 'https://example.com/docs'
published: true
---
```

| Field      | Description                                   |
| ---------- | --------------------------------------------- |
| projectUrl | Project URL (only shown on project page)      |
| docUrl     | Project docs URL (only shown on project page) |
| published  | Set to `false` to hide as draft               |

## Fixed Page Frontmatter

For pages under `src/content/page/` (e.g. about, links):

```md
---
title: About Me
heading: About
description: This page introduces me and this site.
background: code-rain
---
```

`background` options: `code-rain`, `snow`, `constellation`.

## Common Fields Reference

| Field       | Description                                                 |
| ----------- | ----------------------------------------------------------- |
| routeSlug   | URL slug, recommended lowercase English with hyphens        |
| title       | Page title                                                  |
| description | Summary, used in list pages and SEO                         |
| createdAt   | Creation time, falls back to Git record or file system time |
| updatedAt   | Update time, same fallback as `createdAt`                   |
| type        | Article category/display tag                                |
| projectUrl  | Project URL (only shown on project page)                    |
| docUrl      | Project docs URL (only shown on project page)               |
| image       | Social share image / SEO image                              |
| published   | Set to `false` to hide as draft                             |

All frontmatter fields are optional. When omitted, the system falls back to file path, filename, content, or Git timestamps.

## Special Syntax Rendering

### Fold

Use `:::fold` syntax to create collapsible content blocks, supporting default collapsed or expanded state:

```md
:::fold[Click to expand]
Hidden content can include paragraphs, lists, and code blocks.
:::

:::fold[Open by default]{open=true}
This fold starts open.
:::
```

### Blur Text

Use `||text||` syntax to create a blur effect -- readers need to hover over the text to reveal the hidden content.

### Strikethrough

Use `~~text~~` syntax to render strikethrough text in a muted style.

### GitHub Repo Card

A GitHub repository link on its own line in article content is automatically rendered as a card with icons.

## Static Resources

Local assets are placed under `public/` and referenced from the root path:

- Avatar: place at `public/avatar.svg`, reference as `/avatar.svg` in config
- Article images: place under `public/figures/`, reference as `/figures/xxx.png`
- Site icon: place at `public/site-icon.svg`, reference as `/site-icon.svg` in config
- Reward QR codes: place under `public/reward/`, reference as `/reward/wechat.png` in config
