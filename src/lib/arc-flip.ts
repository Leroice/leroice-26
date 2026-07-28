/* ───────────────────────────────────────────────────────────
   arc-flip — reusable choreographed FLIP transition.

   A shared-element move: an element appears to travel from a
   previously-measured rect (`from`) to its current laid-out box,
   optionally following a downward ARC with EXPO easing. The arc lets
   one element "yield" — dipping downward and trailing slightly — so a
   partner (e.g. a title rising into place) can cross above without
   their paths colliding.

   Everything is driven by ArcFlipOptions, so the same primitive powers
   every choreographed transition across the site. Tune per call.
   ─────────────────────────────────────────────────────────── */

export type EasingFn = (t: number) => number;

const C1 = 1.70158;          // back overshoot
const C2 = C1 * 1.525;
const C3 = C1 + 1;
const C4 = (2 * Math.PI) / 3; // elastic
const C5 = (2 * Math.PI) / 4.5;

const bounceOut: EasingFn = (t) => {
  const n1 = 7.5625, d1 = 2.75;
  if (t < 1 / d1) return n1 * t * t;
  if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
  if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
  return n1 * (t -= 2.625 / d1) * t + 0.984375;
};

/** CSS-style cubic-bezier(x1,y1,x2,y2) as an EasingFn (Newton + bisection). */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): EasingFn {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const sampleDX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  const solveX = (x: number) => {
    let t = x;
    for (let i = 0; i < 8; i++) {
      const d = sampleDX(t);
      if (Math.abs(d) < 1e-6) break;
      const e = sampleX(t) - x;
      if (Math.abs(e) < 1e-6) return t;
      t -= e / d;
    }
    let lo = 0, hi = 1;
    t = x;
    while (lo < hi) {
      const e = sampleX(t);
      if (Math.abs(e - x) < 1e-6) break;
      if (x > e) lo = t; else hi = t;
      t = (lo + hi) / 2;
    }
    return t;
  };
  return (t) => (t <= 0 ? 0 : t >= 1 ? 1 : sampleY(solveX(t)));
}

/** Easing curves, expressed as position-along-path functions of time t∈[0,1].
    The full Penner set — pick any of these by name in the tuner. */
export const easings: Record<string, EasingFn> = {
  linear: (t) => t,

  sineIn: (t) => 1 - Math.cos((t * Math.PI) / 2),
  sineOut: (t) => Math.sin((t * Math.PI) / 2),
  sineInOut: (t) => -(Math.cos(Math.PI * t) - 1) / 2,

  quadIn: (t) => t * t,
  quadOut: (t) => 1 - (1 - t) * (1 - t),
  quadInOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),

  cubicIn: (t) => t * t * t,
  cubicOut: (t) => 1 - Math.pow(1 - t, 3),
  cubicInOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),

  quartIn: (t) => t * t * t * t,
  quartOut: (t) => 1 - Math.pow(1 - t, 4),
  quartInOut: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2),

  quintIn: (t) => t ** 5,
  quintOut: (t) => 1 - Math.pow(1 - t, 5),
  quintInOut: (t) => (t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2),

  expoIn: (t) => (t === 0 ? 0 : Math.pow(2, 10 * t - 10)),
  expoOut: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  expoInOut: (t) =>
    t === 0 ? 0 : t === 1 ? 1
      : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2,

  circIn: (t) => 1 - Math.sqrt(1 - Math.pow(t, 2)),
  circOut: (t) => Math.sqrt(1 - Math.pow(t - 1, 2)),
  circInOut: (t) =>
    t < 0.5
      ? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2
      : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2,

  backIn: (t) => C3 * t * t * t - C1 * t * t,
  backOut: (t) => 1 + C3 * Math.pow(t - 1, 3) + C1 * Math.pow(t - 1, 2),
  backInOut: (t) =>
    t < 0.5
      ? (Math.pow(2 * t, 2) * ((C2 + 1) * 2 * t - C2)) / 2
      : (Math.pow(2 * t - 2, 2) * ((C2 + 1) * (t * 2 - 2) + C2) + 2) / 2,

  elasticIn: (t) =>
    t === 0 ? 0 : t === 1 ? 1 : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * C4),
  elasticOut: (t) =>
    t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * C4) + 1,
  elasticInOut: (t) =>
    t === 0 ? 0 : t === 1 ? 1
      : t < 0.5
        ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * C5)) / 2
        : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * C5)) / 2 + 1,

  bounceIn: (t) => 1 - bounceOut(1 - t),
  bounceOut,
  bounceInOut: (t) => (t < 0.5 ? (1 - bounceOut(1 - 2 * t)) / 2 : (1 + bounceOut(2 * t - 1)) / 2),

  // Legacy alias kept for back-compat.
  softOut: (t) => 1 - Math.pow(1 - t, 3),

  // Soft-landing curves — smooth in, very gentle settle at the very end
  // (the control point lands at y=1 with a low x, so the tail creeps in).
  glide: cubicBezier(0.4, 0.0, 0.0, 1.0),
  softLand: cubicBezier(0.25, 0.0, 0.0, 1.0),
  decelerate: cubicBezier(0.0, 0.0, 0.0, 1.0),
  gentle: cubicBezier(0.37, 0.0, 0.18, 1.0),
};

export interface SpringOptions {
  stiffness?: number;
  damping?: number;
  mass?: number;
  velocity?: number;
}

/**
 * Build an organic easing from a damped-spring simulation — the same physics
 * as the menu/pill rollover (defaults match its tokens: 410 / 84 / 3, a heavy
 * overdamped glide). Lower the damping for overshoot/bounce. The trajectory is
 * pre-sampled once and normalised into t∈[0,1], so it plugs in as an EasingFn
 * (the value can exceed 1 mid-flight when underdamped — that's the overshoot).
 */
export function makeSpring(opts: SpringOptions = {}): EasingFn {
  const stiffness = opts.stiffness ?? 410;
  const damping = opts.damping ?? 84;
  const mass = opts.mass ?? 3;
  const velocity = opts.velocity ?? 0;

  const dt = 1 / 240;
  const target = 1;
  const maxSteps = 240 * 8; // 8s safety cap
  const xs = [0];
  let x = 0;
  let v = velocity;
  for (let i = 0; i < maxSteps; i++) {
    const f = -stiffness * (x - target) - damping * v;
    v += (f / mass) * dt;
    x += v * dt;
    xs.push(x);
    if (Math.abs(target - x) < 0.0004 && Math.abs(v) < 0.0004) break;
  }
  const n = xs.length - 1;

  return (p) => {
    if (p <= 0) return 0;
    if (p >= 1) return 1;
    const fi = p * n;
    const i = Math.floor(fi);
    return xs[i] + (xs[i + 1] - xs[i]) * (fi - i);
  };
}

export interface ArcFlipOptions {
  /** Total motion duration in ms. */
  duration?: number;
  /** Stagger before this element starts moving — lets a partner lead. */
  delay?: number;
  /** Position easing along the path (default expoOut). */
  easing?: EasingFn;
  /**
   * The "yield": downward bow at mid-path, as a fraction of the vertical
   * travel. 0 = straight line. Positive values dip the element downward so a
   * partner can pass above it. Try 0.3–0.6.
   */
  arc?: number;
  /** Floor for the downward yield in px, so short travels still arc visibly. */
  minYield?: number;
  /** FLIP scale from `from`'s size to the element's current size (default true). */
  scale?: boolean;
  /** Keyframe sample count — higher = smoother arc (default 24). */
  samples?: number;
}

const DEFAULTS: Required<ArcFlipOptions> = {
  duration: 700,
  delay: 0,
  easing: easings.expoOut,
  arc: 0,
  minYield: 0,
  scale: true,
  samples: 24,
};

/**
 * FLIP `el` so it appears to travel from `from` to its current position.
 * Returns the WAAPI Animation; clears its own inline styles when it settles.
 * transform-origin is set to top-left, matching the rect math.
 */
export function arcFlip(el: HTMLElement, from: DOMRect, opts: ArcFlipOptions = {}): Animation {
  const o = { ...DEFAULTS, ...opts };
  const last = el.getBoundingClientRect();

  const dx = from.left - last.left;
  const dy = from.top - last.top;
  const sx = o.scale && last.width ? from.width / last.width : 1;
  const sy = o.scale && last.height ? from.height / last.height : 1;

  // Downward yield magnitude (px). Only applies when arc > 0.
  const yieldPx = o.arc > 0 ? Math.max(o.arc * Math.abs(dy), o.minYield) : 0;

  // Sample the eased path into keyframes. Easing is baked into the positions
  // (via `e`), so the WAAPI timing easing stays linear.
  const frames: Keyframe[] = [];
  for (let i = 0; i <= o.samples; i++) {
    const p = i / o.samples;          // linear time 0→1
    const e = o.easing(p);            // eased progress along the path
    const x = dx * (1 - e);
    // The downward yield rides the EASED progress (not linear time), so the
    // dip recovers with the easing's own soft, near-zero end velocity — it
    // settles in gently instead of still moving when it stops.
    const y = dy * (1 - e) + yieldPx * Math.sin(Math.PI * e);
    const scaleX = sx + (1 - sx) * e;
    const scaleY = sy + (1 - sy) * e;
    frames.push({
      offset: p,
      transform: `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${scaleX.toFixed(4)}, ${scaleY.toFixed(4)})`,
    });
  }

  el.style.transformOrigin = 'top left';
  el.style.willChange = 'transform';
  // Apply the inverted start synchronously so there's no first-frame flash
  // at the natural position before the animation takes over.
  el.style.transform = frames[0].transform as string;

  const anim = el.animate(frames, {
    duration: o.duration,
    delay: o.delay,
    easing: 'linear',
    fill: 'both',
  });

  const clear = () => {
    el.style.transform = '';
    el.style.transformOrigin = '';
    el.style.willChange = '';
  };
  // Clear inline styles whether the animation finishes OR is cancelled
  // (e.g. a close interrupts it mid-flight), so transform/will-change never leak.
  anim.finished
    .then(() => { clear(); try { anim.cancel(); } catch { /* already done */ } })
    .catch(clear);

  return anim;
}

/** Run several animations together; resolves when all have settled. */
export function concert(anims: Animation[]): Promise<void> {
  return Promise.all(anims.map((a) => a.finished.catch(() => {}))).then(() => {});
}
