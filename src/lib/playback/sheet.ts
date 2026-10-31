/* The shared print sheet for the live tape, ported from CassetteCanvas and CassetteArt in the
   Playback app (CassetteMaterials.swift). One A4 sheet in millimetres holds every printed
   surface; the model's label, print and J-card UVs already point at their own rectangles. */

import { PRINT, type Plastic, type TapeLength } from './content';

const SHEET_MM = { w: 210, h: 297 };
/** The artwork below is laid out at 10 px per mm, as in the app. */
const DESIGN_PX_PER_MM = 10;

const REGIONS: Record<string, [x: number, y: number, w: number, h: number]> = {
  LabelTopA: [15, 20, 88, 13.5],
  LabelBottomA: [15, 38, 88, 6.9],
  LabelTopB: [107, 20, 88, 13.5],
  LabelBottomB: [107, 38, 88, 6.9],
  PrintA: [15, 55, 96.4, 45.6],
  PrintB: [15, 105, 96.4, 45.6],
  JCardFront: [15, 160, 101.6, 65.1],
  JCardSpine: [15, 225.1, 101.6, 12.7],
  JCardBack: [15, 237.8, 101.6, 15.9],
};

const PAPER = 'rgb(237 232 217)';
const FOIL = 'rgb(204 181 120)';
const GREEN = 'rgb(77 148 51)';
const FONT = 'system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';

const grey = (white: number, alpha = 1) => `rgb(${Math.round(white * 255)} ${Math.round(white * 255)} ${Math.round(white * 255)} / ${alpha})`;

/** Light plastics take dark ink so the print stays readable. Returns the ink's grey level. */
export function printInk(plastic: Plastic) {
  const [r, g, b] = plastic.rgb;
  return (r + g + b) / 3 > 0.35 ? 0.1 : 0.94;
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

function topLabel(ctx: Ctx, side: string, w: number, h: number) {
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = grey(0.1);
  ctx.beginPath();
  ctx.roundRect(44, 50, 170, 170, 10);
  ctx.fill();
  text(ctx, side, 84, 54, 140, 800, grey(0.95));
  ctx.fillStyle = grey(0.45);
  ctx.fillRect(260, 128, 1440, 3);
  ctx.fillRect(260, 222, 1440, 3);
  fitted(ctx, PRINT.title, 264, 40, 1430, 70, 700, grey(0.1));
}

function bottomStrip(ctx: Ctx, length: TapeLength, w: number, h: number) {
  ctx.fillStyle = FOIL;
  ctx.fillRect(0, 0, w, h);
  const ink = grey(0.08);
  text(ctx, PRINT.brand, 150, 28, 68, 900, ink, 4);
  text(ctx, PRINT.type, 700, 46, 40, 600, ink);
  text(ctx, length.name, 1640, 20, 82, 800, GREEN, 0, true);
}

function shellPrint(ctx: Ctx, side: string, length: TapeLength, ink: string, w: number) {
  fitted(ctx, PRINT.title.toUpperCase(), 96, 44, 1380, 84, 900, ink, 4);
  fitted(ctx, PRINT.subtitle, 96, 142, 1380, 60, 600, ink);
  text(ctx, length.label, w - 96, 30, 170, 800, ink, 0, true);
  text(ctx, PRINT.typeCaps, w - 96, 820, 40, 600, ink, 3, true);
  // Side marker
  ctx.strokeStyle = ink;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(138, 832, 42, 0, Math.PI * 2);
  ctx.stroke();
  text(ctx, side, 119, 798, 58, 800, ink);
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
  const ink = grey(printInk(plastic), 0.95);

  paint(ctx, 'JCardFront', [2032, 1302], PAPER, (w, h) => cardFront(ctx, length, w, h));
  paint(ctx, 'JCardSpine', [2032, 254], grey(0.08), (w, h) => cardSpine(ctx, length, w, h));
  paint(ctx, 'JCardBack', [2032, 318], PAPER, (w, h) => cardBack(ctx, w, h));
  for (const side of ['A', 'B']) {
    paint(ctx, 'LabelTop' + side, [1760, 270], PAPER, (w, h) => topLabel(ctx, side, w, h));
    paint(ctx, 'LabelBottom' + side, [1760, 138], FOIL, (w, h) => bottomStrip(ctx, length, w, h));
    paint(ctx, 'Print' + side, [1928, 912], null, (w) => shellPrint(ctx, side, length, ink, w));
  }
}
