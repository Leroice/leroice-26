import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const work = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/work' }),
  schema: z.object({
    title: z.string(),
    year: z.string(), // string so we can do "2019—2024"
    context: z.string(), // e.g. "ANZ, iOS, Android, Web"
    summary: z.string(), // shown on the index page
    order: z.number(), // sort key — lower = more recent (1 = top)
    detail: z.boolean().default(false), // true = has its own /work/[slug] page
    external: z.string().url().optional(), // optional external link instead of detail page
    cover: z.string().optional(), // path to /public image for the index
    coverAlt: z.string().optional(),
    coverPhone: z.string().optional(), // portrait crop for the phone hero
    heroSquare: z.boolean().default(false), // square phone hero instead of the tall one
    // Gated case studies: the row shows a padlock and opens a code-entry
    // dialog. The body ships encrypted with the code in LOCK_CODE_<SLUG>.
    locked: z.boolean().default(false),
  }),
});

export const collections = { work };
