// srcset helpers for templates, backed by the manifest scripts/optimize-images.mjs
// writes at prebuild. The rule itself lives in scripts/rehype-srcset.mjs, so
// templates and markdown bodies can't drift apart. srcsetFor() returns
// undefined when there's nothing to gain (SVGs, small images, files outside
// the manifest).

import manifest from '../generated/image-manifest.json';
import { srcsetFor as build, SIZES } from '../../scripts/rehype-srcset.mjs';

export const srcsetFor = (src: string): string | undefined => build(manifest, src);

export const CONTENT_SIZES = SIZES;
