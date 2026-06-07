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

/** Easing curves, expressed as position-along-path functions of time t∈[0,1]. */
export const easings: Record<string, EasingFn> = {
  // Quick launch, long decelerating glide to rest — the premium "expo" feel.
  expoOut: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  expoInOut: (t) => {
    if (t === 0 || t === 1) return t;
    return t < 0.5
      ? Math.pow(2, 20 * t - 10) / 2
      : (2 - Math.pow(2, -20 * t + 10)) / 2;
  },
  // Matches the soft cubic ease-out used elsewhere on the site.
  softOut: (t) => 1 - Math.pow(1 - t, 3),
};

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
    const y = dy * (1 - e) + yieldPx * Math.sin(Math.PI * p); // +Y = downward dip
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
