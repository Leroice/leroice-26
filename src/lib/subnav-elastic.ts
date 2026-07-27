/* ───────────────────────────────────────────────────────────
   subnav-elastic — detail-page subnav entrance choreography.

   Ported from Figma (node 132:140, "title + credits · elastic"): the back
   badge, title block, subtitle, and credits row spring in as a staggered
   sequence rather than a flat fade. Figma's export loops the animation
   forever (a prototype-preview setting) — here it plays once, when the
   detail page is presented, matching how reveal.ts drives every other
   page-transition on the site.

   Values (times/eases/durations) are taken verbatim from Figma's motion
   export. Curves are baked into sampled keyframe positions (same approach
   as arc-flip.ts's arcFlip()) so a WAAPI Animation can run with a flat
   linear timing function while still tracing the original easing.
   ─────────────────────────────────────────────────────────── */

import { cubicBezier, type EasingFn } from './arc-flip';

interface Track {
  times: number[];           // normalised 0–1 breakpoints
  values: number[];          // value at each breakpoint
  eases: (EasingFn | null)[]; // per-segment easing (i → i+1); null = hold, no interpolation
}

interface NodeTracks {
  opacity?: Track;
  scale?: Track;
  x?: Track;
  gap?: Track; // column-gap, px
}

const DURATION = 1409.864; // ms — Figma's cohort duration (132:140), verbatim
const SAMPLES = 90;

// Figma's literal spring response curve (back-badge track) — a closed-form
// damped harmonic oscillator, not an approximation.
const spring: EasingFn = (t) =>
  1 - Math.exp(-t * 7.5318) * (Math.cos(t * 8.6922) + 0.8665 * Math.sin(t * 8.6922));

const overshoot = cubicBezier(0.528, -0.008, 0, 0.999);
const easeInOut = cubicBezier(0.5, 0, 0.5, 1);
const symmetric = cubicBezier(1, 0, 0, 1);

function sample(track: Track, t: number): number {
  const { times, values, eases } = track;
  if (t <= times[0]) return values[0];
  const last = times.length - 1;
  if (t >= times[last]) return values[last];
  for (let i = 0; i < last; i++) {
    if (t >= times[i] && t <= times[i + 1]) {
      const span = times[i + 1] - times[i];
      const p = span === 0 ? 1 : (t - times[i]) / span;
      const ease = eases[i];
      const e = ease ? ease(p) : p;
      return values[i] + (values[i + 1] - values[i]) * e;
    }
  }
  return values[last];
}

// ── Per-element tracks, taken from get_motion_context on node 132:140 ──

const badge: NodeTracks = {
  opacity: { times: [0, 0.1558, 0.3869, 1], values: [0, 0, 1, 1], eases: [null, spring, null] },
  scale: { times: [0, 0.2094, 0.5674, 1], values: [0.75, 0.75, 1, 1], eases: [null, spring, null] },
  x: { times: [0, 0.1558, 0.5674, 1], values: [13.75, 13.75, 0, 0], eases: [null, spring, null] },
};

const title: NodeTracks = {
  opacity: { times: [0, 0.1952, 0.6796, 1], values: [0, 0, 1, 1], eases: [null, symmetric, null] },
  scale: { times: [0, 0.1121, 0.6796, 1], values: [0.75, 0.75, 1, 1], eases: [null, overshoot, null] },
  x: { times: [0, 0.1121, 0.6796, 1], values: [-28.624, -28.624, 0, 0], eases: [null, overshoot, null] },
};

const subtitle: NodeTracks = {
  opacity: { times: [0, 0.4022, 0.7642, 1], values: [0, 0, 1, 1], eases: [null, easeInOut, null] },
};

const credits: NodeTracks = {
  opacity: { times: [0, 0.311, 0.8437, 1], values: [0, 0, 1, 1], eases: [null, overshoot, null] },
  scale: { times: [0, 0.2094, 0.9655, 1], values: [0.75, 0.75, 1, 1], eases: [null, overshoot, null] },
  x: { times: [0, 0.2094, 0.9655, 1], values: [-48, -48, 0, 0], eases: [null, overshoot, null] },
  gap: { times: [0, 0.2094, 0.8437, 1], values: [12, 12, 16, 16], eases: [null, easeInOut, null] },
};

function buildFrames(tracks: NodeTracks): Keyframe[] {
  const frames: Keyframe[] = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const t = i / SAMPLES;
    const kf: Keyframe = { offset: t };
    if (tracks.opacity) kf.opacity = sample(tracks.opacity, t);
    if (tracks.scale || tracks.x) {
      const s = tracks.scale ? sample(tracks.scale, t) : 1;
      const x = tracks.x ? sample(tracks.x, t) : 0;
      kf.transform = `translateX(${x.toFixed(3)}px) scale(${s.toFixed(4)})`;
    }
    if (tracks.gap) kf.columnGap = `${sample(tracks.gap, t).toFixed(3)}px`;
    frames.push(kf);
  }
  return frames;
}

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Clear every inline style the entrance may have left on the subnav's
 *  elastic elements — used both after a normal finish and on bfcache restore. */
export function clearSubnavElastic(root: ParentNode = document): void {
  for (const el of root.querySelectorAll<HTMLElement>('[data-elastic]')) {
    // Cancel any entrance animation too — a fill:forwards animation keeps
    // overriding the stylesheet even after inline styles are cleared.
    for (const anim of el.getAnimations()) anim.cancel();
    el.style.willChange = '';
    el.style.transform = '';
    el.style.opacity = '';
    el.style.removeProperty('column-gap');
  }
}

export interface SubnavElasticOptions {
  /** Total motion duration in ms. Defaults to Figma's verbatim export value. */
  duration?: number;
  /** Delay in ms before the whole cohort starts (lets a partner motion lead). */
  delay?: number;
  /** Track keys to skip — e.g. ['title'] when a partner (arc-flip) already
   *  owns the title element's motion and this should only drive badge/
   *  subtitle/credits. */
  skip?: string[];
}

/** Run the subnav's springing entrance once. No-ops if the page has no
 *  [data-elastic-nav] section, or under reduced motion (elements just
 *  render at rest via the reduced-motion CSS fallback). */
export function subnavElasticEnter(
  root: ParentNode = document,
  opts: SubnavElasticOptions = {}
): void {
  const section = root.querySelector<HTMLElement>('[data-elastic-nav]');
  if (!section || reduced()) return;
  // The home page carries a hidden inline subnav per project. A blanket
  // call (Base's startReveal) would animate the first of those instead of
  // a real one, leaving a spent animation on an element whose genuine
  // entrance plays later when that project opens — the two collide and
  // can strand the title/tabs at their start offsets. Only animate a
  // subnav that's actually on screen.
  if (section.closest('[hidden]')) return;

  const { duration = DURATION, delay = 0, skip = [] } = opts;

  const jobs: [string, NodeTracks][] = [
    ['badge', badge],
    ['title', title],
    ['subtitle', subtitle],
    ['credits', credits],
  ].filter(([key]) => !skip.includes(key)) as [string, NodeTracks][];

  for (const [key, tracks] of jobs) {
    const el = section.querySelector<HTMLElement>(`[data-elastic="${key}"]`);
    if (!el) continue;

    // The Figma tracks end at opacity 1 / gap 16, but an element's resting
    // values belong to the stylesheet (the lockup meta rests at Tertiary,
    // the tabs at a 12px gap). Scale the opacity track and shift the gap
    // track so the entrance lands EXACTLY on the stylesheet values — any
    // mismatch here shows up as a snap/flicker the instant the fill is
    // dropped at the end. (Rest values are read with the pre-reveal gate
    // bypassed — the synchronous class flip never paints.)
    const html = document.documentElement;
    const hadRevealed = html.classList.contains('revealed');
    if (!hadRevealed) html.classList.add('revealed');
    const rest = getComputedStyle(el);
    const restOpacity = parseFloat(rest.opacity) || 1;
    const restGap = parseFloat(rest.columnGap);
    if (!hadRevealed) html.classList.remove('revealed');

    const raw = buildFrames(tracks);
    const lastGap = raw[raw.length - 1].columnGap;
    const gapDelta =
      typeof lastGap === 'string' && !Number.isNaN(restGap)
        ? restGap - parseFloat(lastGap)
        : 0;
    const frames = raw.map((f) => {
      const kf = { ...f };
      if (typeof kf.opacity === 'number') kf.opacity = kf.opacity * restOpacity;
      if (typeof kf.columnGap === 'string' && gapDelta !== 0) {
        kf.columnGap = `${(parseFloat(kf.columnGap) + gapDelta).toFixed(3)}px`;
      }
      return kf;
    });
    el.style.willChange = 'transform, opacity';
    const first = frames[0];
    if (first.opacity !== undefined) el.style.opacity = String(first.opacity);
    if (first.transform) el.style.transform = first.transform as string;
    const anim = el.animate(frames, { duration, delay, easing: 'linear', fill: 'forwards' });
    anim.finished.then(() => {
      // Clear the inline first-frame styles FIRST — the forwards fill is
      // still overriding, so this is invisible — THEN cancel. The element
      // falls from the fill's final frame straight to identical stylesheet
      // values, with no ordering window where the inline opacity:0 could
      // paint. (Clearing after cancel risks exactly that one-frame flash.)
      el.style.willChange = '';
      el.style.transform = '';
      el.style.opacity = '';
      el.style.removeProperty('column-gap');
      anim.cancel();
    }).catch(() => {});
  }
}
