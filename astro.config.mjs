import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';
import rehypeSrcset from './scripts/rehype-srcset.mjs';

// Access codes for locked case studies (src/lib/locked-body.ts): from .env
// locally, from the Vercel project's env vars on deploy.
Object.assign(process.env, { ...loadEnv('', process.cwd(), 'LOCK_CODE_'), ...process.env });

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
