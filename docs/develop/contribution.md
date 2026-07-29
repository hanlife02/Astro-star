---
order: 10
---

# Custom Development & Contribution

The Development chapter documents how to customize and contribute to Astro-star. Before modifying the theme, first confirm whether your needs are better met through configuration, content, or source code.

## Pre-Development Assessment

| Goal                      | Preferred Location              |
| ------------------------- | ------------------------------- |
| Modify site information   | `src/config/`                   |
| Add or adjust articles    | `src/content/`                  |
| Adjust page structure     | `src/pages/` and `src/layouts/` |
| Extend display components | `src/components/`               |
| Modify visual styles      | `src/style/`                    |

Only move into component, layout, and style layers when configuration and content alone cannot meet your needs.

## Local Development Workflow

```bash
git clone https://github.com/hanlife02/Astro-star.git
cd Astro-star
pnpm install
pnpm dev
```

Before submitting, it is recommended to run at least:

```bash
pnpm check
pnpm build
```

## Contribution Guidelines

- Keep changes focused; avoid hardcoding personal site content into shared components.
- When adding new pages or components, also verify mobile layout and dark mode.
- When changes involve configuration, deployment, or content format, update the documentation accordingly.
- Do not commit secrets, private keys, or real production environment credentials.

Astro-star is open-sourced under the [Apache License 2.0](https://github.com/hanlife02/Astro-star/blob/main/LICENSE).
