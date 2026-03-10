// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import node from '@astrojs/node';
import { mdxVoidHtmlPlugin } from './src/utils/mdx-void-html.js';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
  integrations: [mdx()],
  vite: {
    plugins: [mdxVoidHtmlPlugin()],
  },
});
