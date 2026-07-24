// Generates responsive width variants for every raster image under
// public/images, plus a manifest the templates and the markdown image
// plugin read to build srcset attributes. Runs as `prebuild` (so plain
// `npm run build` — locally or on Vercel — always has fresh variants)
// and is incremental: a variant is only re-encoded when the source is
// newer. Originals are never touched; they stay the largest fallback.
//
//   foo.jpg → foo.w660.webp, foo.w1320.webp   (only widths < source width)
//   manifest: src/generated/image-manifest.json
//     { "/images/work/x/foo.jpg": { "width": 1600, "variants": [660, 1320] } }

import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const IMAGES_DIR = path.join(ROOT, 'public', 'images');
const MANIFEST = path.join(ROOT, 'src', 'generated', 'image-manifest.json');
const WIDTHS = [660, 1320];
const RASTER = new Set(['.jpg', '.jpeg', '.png']);

async function* walk(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

const variantPath = (file, w) => {
  const { dir, name } = path.parse(file);
  return path.join(dir, `${name}.w${w}.webp`);
};

const manifest = {};
let encoded = 0;
let skipped = 0;

for await (const file of walk(IMAGES_DIR)) {
  const ext = path.extname(file).toLowerCase();
  if (!RASTER.has(ext)) continue;
  if (/\.w\d+\.webp$/.test(file)) continue; // a variant, not a source

  const meta = await sharp(file).metadata();
  const srcStat = await fs.stat(file);
  const usable = WIDTHS.filter((w) => w < meta.width);
  const publicPath = '/' + path.relative(path.join(ROOT, 'public'), file).split(path.sep).join('/');
  manifest[publicPath] = { width: meta.width, variants: usable };

  for (const w of usable) {
    const out = variantPath(file, w);
    try {
      const outStat = await fs.stat(out);
      if (outStat.mtimeMs >= srcStat.mtimeMs) { skipped++; continue; }
    } catch { /* doesn't exist yet */ }
    await sharp(file).resize({ width: w }).webp({ quality: 80 }).toFile(out);
    encoded++;
  }
}

await fs.mkdir(path.dirname(MANIFEST), { recursive: true });
await fs.writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
console.log(`[images] ${Object.keys(manifest).length} sources · ${encoded} variants encoded · ${skipped} up to date`);
