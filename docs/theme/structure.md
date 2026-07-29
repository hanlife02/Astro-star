---
order: 20
---

# Project Structure

A clear structure saves you time getting oriented.

## Directory Map

```text
/
├── public/                 # Static assets, avatars, site icons, article images
├── scripts/                # Config migration, index sync, and build helper scripts
├── src/
│   ├── components/         # Reusable components
│   ├── config/             # Site, about, friend links, and search configs
│   ├── content/            # Blog / note / project content collections
│   ├── layouts/            # Page layouts
│   ├── pages/              # Route pages and APIs
│   ├── scripts/            # Client-side interaction scripts
│   ├── style/              # Global styles, component styles, and design tokens
│   └── utils/              # Markdown, MDX, and general utilities
├── astro.config.mjs
├── ecosystem.config.cjs
└── package.json
```

## Fixed Routes

| Path       | Description |
| ---------- | ----------- |
| `/`        | Home        |
| `/about`   | About       |
| `/blog`    | Blog        |
| `/note`    | Notes       |
| `/project` | Projects    |
| `/links`   | Friends     |
