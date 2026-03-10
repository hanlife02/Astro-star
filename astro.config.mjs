// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import node from '@astrojs/node';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import { mdxVoidHtmlPlugin } from './src/utils/mdx-void-html.js';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
  integrations: [mdx()],
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
  },
  vite: {
    plugins: [mdxVoidHtmlPlugin()],
  },
});
