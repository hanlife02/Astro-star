// @ts-check
import { defineConfig, envField } from "astro/config";
import mdx from "@astrojs/mdx";
import { unified } from "@astrojs/markdown-remark";
import sitemap from "@astrojs/sitemap";
import node from "@astrojs/node";
import rehypeKatex from "rehype-katex";
import remarkDirective from "remark-directive";
import remarkMath from "remark-math";
import { remarkContentFormatDirectives } from "./src/utils/remark-content-format-directives.js";
import { rehypeFigureCaptions } from "./src/utils/rehype-figure-captions.js";
import { mdxVoidHtmlPlugin } from "./src/utils/mdx-void-html.js";
import { createSitemapLastmodSerializer } from "./src/utils/sitemap-lastmod.ts";
import { site } from "./src/config/site.ts";

// https://astro.build/config
export default defineConfig({
  site: site.site.url,
  output: "server",
  // Astro 7 changed the default to 'jsx', which strips whitespace between inline
  // elements and collapses e.g. nav links into "AboutBlogNote". Pinned to the
  // pre-7 HTML-aware behaviour so the upgrade carries no rendering change.
  compressHTML: true,
  adapter: node({
    mode: "standalone",
  }),
  env: {
    schema: {
      WALINE_SERVER_URL: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      PUBLIC_WALINE_SERVER_URL: envField.string({
        context: "server",
        access: "public",
        optional: true,
      }),
      GH_TOKEN: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      GITHUB_TOKEN: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      CODETIME_TOKEN: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
    },
  },
  image: {
    // Emit a srcset so phones stop downloading desktop-sized images. `src`
    // still points at the full-size variant, which is what the lightbox opens.
    layout: "constrained",
    // The article column tops out at 36rem, so anything past ~1668w only ever
    // serves the lightbox. Trimmed from Astro's default ladder to keep the
    // generated-file count down.
    breakpoints: [640, 828, 1080, 1280, 1668],
  },
  integrations: [
    mdx(),
    sitemap({
      serialize: createSitemapLastmodSerializer(site.site.url),
    }),
  ],
  markdown: {
    shikiConfig: {
      themes: {
        light: "github-light",
        dark: "github-dark",
      },
      defaultColor: false,
    },
    processor: unified({
      remarkPlugins: [
        remarkMath,
        remarkDirective,
        remarkContentFormatDirectives,
      ],
      rehypePlugins: [rehypeKatex, rehypeFigureCaptions],
    }),
  },
  vite: {
    plugins: [mdxVoidHtmlPlugin()],
    build: {
      // Vite 8 switched the default CSS minifier to lightningcss, which folds a
      // prefixed and unprefixed property into one and keeps only the last —
      // silently dropping one of the backdrop-filter pair. It only re-derives
      // prefixes when given browser targets, and routing CSS through its
      // transformer breaks our @import graph. esbuild (the Vite 7 default) keeps
      // both declarations, so pin it and keep the glass working on Safari < 18.
      cssMinify: "esbuild",
      rollupOptions: {
        onwarn(warning, warn) {
          if (
            warning.code === "INVALID_ANNOTATION" &&
            warning.id?.includes("@vueuse/core")
          ) {
            return;
          }

          warn(warning);
        },
      },
    },
  },
});
