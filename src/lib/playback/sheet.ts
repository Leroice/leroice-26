/* The shared print sheet for the live tape, ported from CassetteCanvas and CassetteArt in the
   Playback app (CassetteMaterials.swift). One A4 sheet in millimetres holds every printed
   surface; the model's sticker and J-card UVs already point at their own rectangles. */

import { PRINT, STICKER, type Plastic, type TapeLength } from './content';

const SHEET_MM = { w: 210, h: 297 };
/** The artwork below is laid out at 10 px per mm, as in the app. */
const DESIGN_PX_PER_MM = 10;

const REGIONS: Record<string, [x: number, y: number, w: number, h: number]> = {
  JCardFront: [15, 160, 101.6, 65.1],
  JCardSpine: [15, 225.1, 101.6, 12.7],
  JCardBack: [15, 237.8, 101.6, 15.9],
  // The full-face stickers (scripts/export-playback-models.py).
  StickerA: [115, 55, 88, 38.6],
  StickerB: [115, 100, 88, 38.6],
};

const PAPER = 'rgb(237 232 217)';
const GREEN = 'rgb(77 148 51)';
const FONT = 'system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';
/** The sticker's faces. Apple devices have both; elsewhere stage.ts loads Inter and Jost. */
export const STICKER_FONTS = { grotesk: '"Helvetica Neue", Inter, Arial, sans-serif', geometric: 'Futura, Jost, sans-serif' };

const grey = (white: number, alpha = 1) => `rgb(${Math.round(white * 255)} ${Math.round(white * 255)} ${Math.round(white * 255)} / ${alpha})`;

/** Ink for the gauge lines printed on the clear shell: dark on light plastic, unless the page
    behind it is dark. Returns the ink's grey level. */
export function printInk(plastic: Plastic, darkBehind = false) {
  const [r, g, b] = plastic.rgb;
  const light = (r + g + b) / 3 > 0.35 && !(plastic.opacity < 1 && darkBehind);
  return light ? 0.1 : 0.94;
}

type Ctx = CanvasRenderingContext2D;

function text(ctx: Ctx, s: string, x: number, y: number, size: number, weight: number, color: string,
              kern = 0, alignRight = false) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.letterSpacing = `${kern}px`;
  ctx.fillStyle = color;
  ctx.textAlign = alignRight ? 'right' : 'left';
  ctx.fillText(s, x, y);
}

/** Text that must stay inside a box: it shrinks to fit, then cuts off with an ellipsis. */
function fitted(ctx: Ctx, s: string, x: number, y: number, w: number, size: number, weight: number,
                color: string, kern = 0) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.letterSpacing = `${kern}px`;
  const width = ctx.measureText(s).width;
  const fit = width > w ? Math.max((size * w) / width, size * 0.6) : size;
  ctx.font = `${weight} ${fit}px ${FONT}`;
  let out = s;
  while (out.length > 1 && ctx.measureText(out).width > w) out = out.slice(0, -2) + '…';
  text(ctx, out, x, y, fit, weight, color, kern);
}

function cardFront(ctx: Ctx, length: TapeLength, w: number, h: number) {
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, w, h);
  const ink = grey(0.08);
  ctx.fillStyle = ink;
  ctx.fillRect(110, 120, w - 220, 96);
  text(ctx, PRINT.cardBand, 150, 138, 52, 700, grey(0.95), 6);
  fitted(ctx, PRINT.title.toUpperCase(), 110, 330, w - 220 - 460, 190, 900, ink, 2);
  text(ctx, length.name, w - 110, 330, 190, 900, GREEN, 0, true);
  // Three bands across the lower half
  [700, 880, 1060].forEach((y, i) => {
    ctx.fillStyle = i === 1 ? grey(0.72) : 'rgb(33 56 158)';
    ctx.fillRect(0, y, w, 130);
  });
  text(ctx, PRINT.type, 110, 922, 50, 600, ink);
}

function cardSpine(ctx: Ctx, length: TapeLength, w: number, h: number) {
  ctx.fillStyle = grey(0.08);
  ctx.fillRect(0, 0, w, h);
  const ink = grey(0.95);
  fitted(ctx, PRINT.title.toUpperCase(), 110, 58, w - 220 - 300, 110, 900, ink, 4);
  text(ctx, length.name, w - 110, 58, 110, 800, ink, 0, true);
}

function cardBack(ctx: Ctx, w: number, h: number) {
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, w, h);
  const ink = grey(0.1);
  text(ctx, PRINT.brand, 110, 110, 84, 900, ink, 6);
  text(ctx, PRINT.cardBack, w - 110, 130, 50, 500, ink, 0, true);
}

/** The Figma sticker: paper with a window, INDEX rules, the highlight band and the length. */
function sticker(ctx: Ctx, side: string, length: TapeLength, highlight: string) {
  const S = STICKER, win = S.window;
  const shape = new Path2D();
  shape.roundRect(0, 0, S.w, S.h, S.radius);
  shape.roundRect(win.x, win.y, win.w, win.h, win.radius);
  ctx.fillStyle = S.paper;
  ctx.fill(shape, 'evenodd');
  ctx.save();
  ctx.clip(shape, 'evenodd');

  // Highlight band and arrow, with the Figma grain: a few dark specks, fewer light ones.
  const band = new Path2D();
  band.rect(0, S.band.y, S.w, S.band.h);
  const arrow = new Path2D();
  arrow.addPath(new Path2D(S.arrow.path), new DOMMatrix().translate(S.arrow.x, S.arrow.y));
  let seed = 8965;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (const [area, [x, y, w, h]] of [[band, [0, S.band.y, S.w, S.band.h]], [arrow, [S.arrow.x, S.arrow.y, 37.125, 27.75]]] as const) {
    ctx.save();
    ctx.clip(area);
    ctx.fillStyle = highlight;
    ctx.fillRect(x, y, w, h);
    for (let i = 0; i < w * h * 0.35; i++) {
      ctx.fillStyle = rand() < 0.8 ? 'rgb(0 0 0 / 0.12)' : 'rgb(255 255 255 / 0.1)';
      ctx.fillRect(x + rand() * w, y + rand() * h, 0.7, 0.7);
    }
    ctx.restore();
  }
  // Side letter, knocked out of the band to the left of the spindle.
  ctx.fillStyle = S.paper;
  ctx.font = `500 ${S.side.size}px ${STICKER_FONTS.grotesk}`;
  ctx.letterSpacing = '0px';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(side, S.side.x, S.side.y);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  // INDEX and its two rules.
  ctx.fillStyle = S.ink;
  ctx.globalAlpha = S.index.opacity;
  ctx.font = `500 ${S.index.size}px ${STICKER_FONTS.grotesk}`;
  ctx.fillText(S.index.text, S.index.x, S.index.y);
  ctx.globalAlpha = S.rules.opacity;
  // At least a pixel wide, or the rules vanish at texture resolution.
  const px = 1 / ctx.getTransform().a;
  for (const y of S.rules.y) ctx.fillRect(0, y - Math.max(S.rules.width, px) / 2, S.w, Math.max(S.rules.width, px));
  ctx.globalAlpha = 1;

  ctx.font = `500 ${S.type.size}px ${STICKER_FONTS.grotesk}`;
  ctx.fillText(S.type.text, S.type.x, S.type.y);

  // PLB in the highlight, then the length in Futura, set side by side like the Figma frame.
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = highlight;
  ctx.font = `500 ${S.brand.size}px ${STICKER_FONTS.grotesk}`;
  ctx.fillText(S.brand.text, S.brand.x, S.brand.baseline);
  const after = S.brand.x + ctx.measureText(S.brand.text).width;
  ctx.fillStyle = S.ink;
  ctx.font = `500 ${S.number.size}px ${STICKER_FONTS.geometric}`;
  ctx.letterSpacing = `${S.number.tracking}px`;
  ctx.fillText(length.label, after, S.brand.baseline);
  ctx.letterSpacing = '0px';
  ctx.textBaseline = 'top';
  ctx.restore();
}

/** Draws one surface into its rectangle, in the artwork's own design coordinates. */
function paint(ctx: Ctx, name: string, design: [number, number], bleed: string | null,
               body: (w: number, h: number) => void) {
  const [x, y, w, h] = REGIONS[name].map((v) => v * DESIGN_PX_PER_MM);
  if (bleed) {
    // A little extra colour past the edge keeps edges clean when the picture is shrunk on screen.
    ctx.fillStyle = bleed;
    ctx.fillRect(x - 12, y - 12, w + 24, h + 24);
  }
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.translate(x, y);
  ctx.scale(w / design[0], h / design[1]);
  ctx.textBaseline = 'top';
  body(design[0], design[1]);
  ctx.restore();
}

/** Redraws the sheet for a plastic and length. `pxPerMM` sets the texture's resolution. */
export function drawSheet(canvas: HTMLCanvasElement, plastic: Plastic, length: TapeLength, pxPerMM: number) {
  canvas.width = Math.round(SHEET_MM.w * pxPerMM);
  canvas.height = Math.round(SHEET_MM.h * pxPerMM);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(pxPerMM / DESIGN_PX_PER_MM, pxPerMM / DESIGN_PX_PER_MM);

  paint(ctx, 'JCardFront', [2032, 1302], PAPER, (w, h) => cardFront(ctx, length, w, h));
  paint(ctx, 'JCardSpine', [2032, 254], grey(0.08), (w, h) => cardSpine(ctx, length, w, h));
  paint(ctx, 'JCardBack', [2032, 318], PAPER, (w, h) => cardBack(ctx, w, h));
  for (const side of ['A', 'B']) {
    paint(ctx, 'Sticker' + side, [STICKER.w, STICKER.h], null, () => sticker(ctx, side, length, plastic.highlight));
  }
}

/** A faint raised edge round each sticker, as tangent-space normals in the sheet's UV space. */
export function stickerNormals(pxPerMM: number) {
  const w = Math.round(SHEET_MM.w * pxPerMM), h = Math.round(SHEET_MM.h * pxPerMM);
  const mask = document.createElement('canvas');
  mask.width = w;
  mask.height = h;
  const m = mask.getContext('2d')!;
  m.filter = `blur(${pxPerMM * 0.15}px)`;
  m.fillStyle = '#fff';
  for (const name of ['StickerA', 'StickerB']) {
    const [x, y, rw, rh] = REGIONS[name], k = (rw * pxPerMM) / STICKER.w, win = STICKER.window;
    m.setTransform(k, 0, 0, k, x * pxPerMM, y * pxPerMM);
    const shape = new Path2D();
    shape.roundRect(0, 0, STICKER.w, STICKER.h, STICKER.radius);
    shape.roundRect(win.x, win.y, win.w, win.h, win.radius);
    m.fill(shape, 'evenodd');
  }
  const a = m.getImageData(0, 0, w, h).data;
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const o = out.getContext('2d')!, img = o.createImageData(w, h);
  const at = (x: number, y: number) => a[(Math.min(Math.max(y, 0), h - 1) * w + Math.min(Math.max(x, 0), w - 1)) * 4] / 255;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // The paper edge slopes up from the plastic: the normal tips away from the sticker.
      const nx = (at(x - 1, y) - at(x + 1, y)) * 0.8, ny = (at(x, y + 1) - at(x, y - 1)) * 0.8;
      const len = Math.hypot(nx, ny, 1), i = (y * w + x) * 4;
      img.data[i] = (nx / len * 0.5 + 0.5) * 255;
      img.data[i + 1] = (ny / len * 0.5 + 0.5) * 255;
      img.data[i + 2] = (1 / len * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  o.putImageData(img, 0, 0);
  return out;
}
