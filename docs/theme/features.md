---
order: 40
---

# Why Use This Theme

Here is why you might want to give this theme a try.

## Aesthetics

If you have browsed the [page previews](./preview) and feel the author's taste does not match yours, this may not be the right theme for you.

If you think the author's taste is decent enough to suit your needs, give this theme a try -- you probably won't regret it.

## What the Author Considers Clever About This Theme

Likely self-indulgent -- criticism welcome.

### 1. SSR Dynamic Serving

Most Astro blogs use `output: 'static'`. This project uses `output: 'server'` + the Node adapter + PM2 process management. This enables features that static blogs cannot achieve, such as cookie-based theme detection and server-side API endpoints.

### 2. "Desktop App Shell" Architecture

The entire site runs inside a persistent shell framework -- similar to a desktop application window experience. Page content is projected into different shell slots (signature area, side navigation, main content area, sidebar, footer, etc.) via slots, rather than the traditional "each page has its own layout" approach.

### 3. Git-based Article Timestamps

Article creation and modification times are not manually maintained. They are automatically derived from the first and last commit time of each file via `git log --follow`.

### 4. Deployment Workflow

After making local changes, a `git push` to GitHub triggers an Action that automatically deploys to the server -- very convenient.

### 5. Waline Comments

Integrated comment system, not limited to static pages.

### 6. Algolia Search

Integrated search for easier content discovery.

### 7. Theme Design

#### Smooth Animations

Many animations have been added for page transitions and element hover effects -- buttery smooth.

#### Navigation Bar

Tired of horizontal nav bars, the author opted for a sidebar that expands and collapses on hover.

#### Home Page Design

The home page has been redesigned -- left half for personal info, right half for latest articles -- maximizing readability.

#### Signature Design

The home page link is embedded in the signature SVG in the top-left corner for a more personal touch.

#### Three Backgrounds

Snowflake background, code rain background, and constellation connection background.

#### Pure Handwritten CSS

Zero CSS framework dependency -- all styles are handwritten. Design variables are consolidated, and theme switching is done with a single `data-theme` attribute -- no Tailwind class name pollution.

#### GitHub Repo Rendering

A repo URL on its own line in article content is automatically rendered as a card.
