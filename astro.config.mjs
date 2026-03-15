// @ts-check
import { defineConfig, envField } from 'astro/config';
import mdx from '@astrojs/mdx';
import node from '@astrojs/node';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import { rehypeFigureCaptions } from './src/utils/rehype-figure-captions.js';
import { mdxVoidHtmlPlugin } from './src/utils/mdx-void-html.js';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
  env: {
    schema: {
      WALINE_SERVER_URL: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),
    },
  },
  integrations: [mdx()],
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex, rehypeFigureCaptions],
  },
  vite: {
    plugins: [mdxVoidHtmlPlugin()],
  },
});
