// Rehype plugin: adds srcset/sizes/lazy-loading to every <img> in the
// markdown case-study bodies whose src has variants in the manifest
// (generated at prebuild by optimize-images.mjs), and width/height to
// every one the manifest knows, so the browser reserves each image's
// box before it loads and the page doesn't shift as they arrive. The
// bodies use raw HTML for the layout kit, so this handles both shapes the tree can
// take: parsed `element` nodes and unparsed `raw` nodes.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { visit } from 'unist-util-visit';

const MANIFEST = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  '../src/generated/image-manifest.json'
);

/* Content images render at up to --page-max minus padding on desktop
   (~1120px) and near-viewport width on phones. Also used by src/lib/img.ts. */
export const SIZES = '(max-width: 880px) 100vw, 1120px';

const load = () => {
  try {
    return JSON.parse(readFileSync(MANIFEST, 'utf8'));
  } catch {
    return {};
  }
};

const variantUrl = (src, w) => src.replace(/\.(jpe?g|png)$/i, `.w${w}.webp`);

export const srcsetFor = (manifest, src) => {
  const entry = manifest[src];
  if (!entry || !entry.variants?.length) return undefined;
  return entry.variants
    .map((w) => `${variantUrl(src, w)} ${w}w`)
    .concat(`${src} ${entry.width}w`)
    .join(', ');
};

export default function rehypeSrcset() {
  const manifest = load();
  return (tree) => {
    visit(tree, (node) => {
      if (node.type === 'element' && node.tagName === 'img') {
        const src = node.properties?.src;
        if (typeof src !== 'string') return;
        const entry = manifest[src];
        if (entry?.height && node.properties.width == null) {
          node.properties.width = entry.width;
          node.properties.height = entry.height;
        }
        if (node.properties.srcset) return;
        const srcset = srcsetFor(manifest, src);
        if (!srcset) return;
        node.properties.srcset = srcset;
        node.properties.sizes = SIZES;
        node.properties.loading ??= 'lazy';
        node.properties.decoding ??= 'async';
      } else if (node.type === 'raw' && node.value.includes('<img')) {
        node.value = node.value.replace(
          /<img\b[^>]*>/g,
          (tag) => {
            const m = tag.match(/\bsrc="([^"]+)"/);
            if (!m) return tag;
            const entry = manifest[m[1]];
            if (entry?.height && !/\bwidth=/.test(tag)) {
              tag = tag.replace(/<img\b/, `<img width="${entry.width}" height="${entry.height}"`);
            }
            if (/\bsrcset=/.test(tag)) return tag;
            const srcset = srcsetFor(manifest, m[1]);
            if (!srcset) return tag;
            let out = tag.replace(
              /\bsrc="[^"]+"/,
              `$& srcset="${srcset}" sizes="${SIZES}"`
            );
            if (!/\bloading=/.test(out)) out = out.replace(/<img\b/, '<img loading="lazy"');
            if (!/\bdecoding=/.test(out)) out = out.replace(/<img\b/, '<img decoding="async"');
            return out;
          }
        );
      }
    });
  };
}
