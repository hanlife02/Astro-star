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
