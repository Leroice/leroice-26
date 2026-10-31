/* Surface detail for the live tape, drawn in code so nothing extra downloads.

   Shell maps follow the shell's face-on UVs (build_cassette.py add_planar_uv): u runs across
   the 100.4 mm width, v down the 63.8 mm height, top of the tape at v = 0 (glTF). Pack maps
   follow the unit-radius pack UVs added by scripts/export-playback-models.py. */

import type { ShellStyle } from './content';

const W = 100.4, H = 63.8;
/** The raised section along the bottom, where the knurled panel is moulded. */
const RAISED = { h: 15.2, top: 62.5, bottom: 67.7 };
/** Smooth border around the knurl, as on real shells. */
const KNURL_INSET = 1.4;
const KNURL_PITCH = 0.7;
const RIB_PITCH = 0.6;
/** Ejector-pin marks: centres in mm from the middle of the face, z up. */
const PIN_MARKS = [[-30, 21], [30, 21], [0, 24.5], [-38, -6], [38, -6]];
const PX_PER_MM = 10;

export interface SurfaceMaps {
  /** Tangent-space normals. */
  normal: HTMLCanvasElement;
  /** Roughness in the green channel, absolute (material roughness stays 1). */
  roughness: HTMLCanvasElement;
}

/** A small deterministic random, so the still render and the live tape match. */
function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
}

const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.min(Math.max((x - e0) / (e1 - e0), 0), 1);
  return t * t * (3 - 2 * t);
};

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/** How far inside the knurled panel a point is, in mm (negative outside). */
function knurlDepth(x: number, z: number) {
  const bottom = -H / 2 + KNURL_INSET, top = -H / 2 + RAISED.h - KNURL_INSET;
  // Half-width of the trapezoid at height z, less the border.
  const t = (z + H / 2) / RAISED.h;
  const half = (RAISED.bottom + (RAISED.top - RAISED.bottom) * t) / 2 - KNURL_INSET;
  return Math.min(z - bottom, top - z, half - Math.abs(x));
}

export function shellMaps(style: ShellStyle): SurfaceMaps {
  const w = Math.round(W * PX_PER_MM), h = Math.round(H * PX_PER_MM);
  const normal = canvas(w, h), roughness = canvas(w, h);
  const n = normal.getContext('2d')!.createImageData(w, h);
  const r = roughness.getContext('2d')!.createImageData(w, h);
  const clear = style === 'clear';
  const base = clear ? 0.05 : 0.38, knurled = clear ? 0.42 : 0.55;

  for (let py = 0; py < h; py++) {
    const z = H / 2 - (py + 0.5) / PX_PER_MM;
    for (let px = 0; px < w; px++) {
      const x = (px + 0.5) / PX_PER_MM - W / 2;
      let nx = 0, ny = 0, rough = base;

      // Knurl: rows of small pyramids, each facet tilted toward its edge of the cell.
      const k = smooth(0, 0.3, knurlDepth(x, z));
      if (k > 0) {
        const dx = ((x / KNURL_PITCH) % 1 + 1) % 1 - 0.5;
        const dy = ((z / KNURL_PITCH) % 1 + 1) % 1 - 0.5;
        const s = 0.4 * k;
        if (Math.abs(dx) > Math.abs(dy)) nx = Math.sign(dx) * s;
        else ny = Math.sign(dy) * s;
        rough = base + (knurled - base) * k;
      } else if (!clear) {
        // Fine horizontal ribbing moulded into solid shells (CassetteArt.ribNormalMap in the app).
        ny = Math.cos((2 * Math.PI * z) / RIB_PITCH) * 0.15;
      }

      // Ejector-pin marks: a shallow ring groove.
      for (const [cx, cz] of PIN_MARKS) {
        const ox = x - cx, oz = z - cz, d = Math.hypot(ox, oz);
        if (d > 0.01 && d < 1.8) {
          const slope = -Math.sin(((d - 1.1) / 0.35) * Math.PI) * (Math.abs(d - 1.1) < 0.35 ? 0.08 : 0);
          nx += (ox / d) * slope;
          ny += (oz / d) * slope;
        }
      }

      const len = Math.hypot(nx, ny, 1), i = (py * w + px) * 4;
      n.data[i] = (nx / len * 0.5 + 0.5) * 255;
      n.data[i + 1] = (ny / len * 0.5 + 0.5) * 255;
      n.data[i + 2] = (1 / len * 0.5 + 0.5) * 255;
      n.data[i + 3] = 255;
      r.data[i + 1] = rough * 255;
      r.data[i + 3] = 255;
    }
  }

  // Light wear: a few fine scratches, a little rougher than the plastic around them.
  const rc = roughness.getContext('2d')!;
  rc.putImageData(r, 0, 0);
  const rand = seeded(clear ? 7 : 11);
  rc.strokeStyle = `rgb(0 ${Math.round((base + 0.12) * 255)} 0)`;
  rc.lineWidth = 1;
  rc.globalAlpha = 0.5;
  for (let i = 0; i < 36; i++) {
    const x0 = rand() * w, y0 = rand() * h * 0.75, len = (2 + rand() * 7) * PX_PER_MM, a = rand() * Math.PI;
    rc.beginPath();
    rc.moveTo(x0, y0);
    rc.lineTo(x0 + Math.cos(a) * len, y0 + Math.sin(a) * len);
    rc.stroke();
  }
  normal.getContext('2d')!.putImageData(n, 0, 0);
  return { normal, roughness };
}

export interface PackMaps extends SurfaceMaps {
  /** Brushing direction in red and green, strength in blue: round the pack, like wound tape. */
  anisotropy: HTMLCanvasElement;
}

export function packMaps(): PackMaps {
  const size = 1024;
  const normal = canvas(size, size), roughness = canvas(size, size), anisotropy = canvas(size, size);
  const n = normal.getContext('2d')!.createImageData(size, size);
  const r = roughness.getContext('2d')!.createImageData(size, size);
  const a = anisotropy.getContext('2d')!.createImageData(size, size);
  // Each wind of tape sits a little proud or shy of its neighbours.
  const rings = 180, rand = seeded(3);
  const heights = Array.from({ length: rings + 2 }, () => rand() * 2 - 1);

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const ux = (px + 0.5) / size * 2 - 1, uy = 1 - (py + 0.5) / size * 2;
      const d = Math.hypot(ux, uy) || 1e-6, ring = d * rings, f = ring % 1;
      const k = Math.floor(ring);
      // Slope across a ring boundary, toward the higher wind.
      // Fades out toward the middle, which only shows through the hub's drive opening.
      const step = (heights[k + 1] - heights[k]) * (f > 0.85 ? 1 : 0) * 0.6 * smooth(0.4, 0.5, d);
      const nx = (ux / d) * step, ny = (uy / d) * step;
      const len = Math.hypot(nx, ny, 1), i = (py * size + px) * 4;
      n.data[i] = (nx / len * 0.5 + 0.5) * 255;
      n.data[i + 1] = (ny / len * 0.5 + 0.5) * 255;
      n.data[i + 2] = (1 / len * 0.5 + 0.5) * 255;
      n.data[i + 3] = 255;
      r.data[i + 1] = (0.3 + heights[k] * 0.06) * 255;
      r.data[i + 3] = 255;
      a.data[i] = (-uy / d * 0.5 + 0.5) * 255;
      a.data[i + 1] = (ux / d * 0.5 + 0.5) * 255;
      a.data[i + 2] = 255;
      a.data[i + 3] = 255;
    }
  }
  normal.getContext('2d')!.putImageData(n, 0, 0);
  roughness.getContext('2d')!.putImageData(r, 0, 0);
  anisotropy.getContext('2d')!.putImageData(a, 0, 0);
  return { normal, roughness, anisotropy };
}
