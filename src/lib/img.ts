// srcset helpers backed by the manifest scripts/optimize-images.mjs
// writes at prebuild. Give any /images/... path to srcsetFor() and it
// returns the srcset string (variants + the original as the largest
// candidate) or undefined when there's nothing to gain (SVGs, small
// images, files outside the manifest).

import manifest from '../generated/image-manifest.json';

type Entry = { width: number; variants: number[] };
const entries: Record<string, Entry> = manifest as Record<string, Entry>;

const variantUrl = (src: string, w: number) =>
  src.replace(/\.(jpe?g|png)$/i, `.w${w}.webp`);

export function srcsetFor(src: string): string | undefined {
  const entry = entries[src];
  if (!entry || entry.variants.length === 0) return undefined;
  const parts = entry.variants.map((w) => `${variantUrl(src, w)} ${w}w`);
  parts.push(`${src} ${entry.width}w`);
  return parts.join(', ');
}

/* Content images render at up to --page-max minus padding on desktop
   (~1120px) and near-viewport width on phones. */
export const CONTENT_SIZES = '(max-width: 880px) 100vw, 1120px';
