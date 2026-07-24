import { defineConfig } from 'astro/config';
import rehypeSrcset from './scripts/rehype-srcset.mjs';

export default defineConfig({
  site: 'https://leroice.com',
  build: {
    inlineStylesheets: 'auto',
  },
  markdown: {
    // Adds srcset (from the prebuild image manifest) to case-study body
    // images so phones stop downloading full-resolution originals.
    rehypePlugins: [rehypeSrcset],
  },
});
