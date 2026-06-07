/* ───────────────────────────────────────────────────────────
   reveal — site-wide "nothing appears or vanishes instantly" motion.

   The rule: objects never pop in or out. They fade with a slight blur,
   and the effect propagates:
     • on interaction → by PROXIMITY (nearest to the trigger goes first,
       rippling outward) — staggerOut / staggerIn with an `origin`.
     • on load → in SEQUENCE (top-down) — revealOnLoad over [data-reveal].

   Pure opacity + blur (no transform), so element layout/measurements are
   never disturbed (the pill spring + FLIP keep reading correct rects).
   ─────────────────────────────────────────────────────────── */

export interface StaggerOptions {
  /** Order source. An element/point → nearest-first ripple. Omit → DOM order. */
  origin?: HTMLElement | { x: number; y: number } | null;
  duration?: number;  // per-element fade duration (ms)
  step?: number;      // delay between successive elements (ms)
  baseDelay?: number; // delay before the first element (ms)
  blur?: number;      // blur (px) at the hidden end
  easing?: string;    // CSS easing
}

const OUT_EASE = 'cubic-bezier(0.4, 0, 0.2, 1)';
const IN_EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const wait = (ms: number) => new Promise<void>((res) => window.setTimeout(res, ms));
const center = (el: HTMLElement) => {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};

function orderByProximity(els: HTMLElement[], origin?: StaggerOptions['origin']): HTMLElement[] {
  if (!origin) return els.slice();
  const o = origin instanceof HTMLElement ? center(origin) : origin;
  return els.slice().sort((a, b) => {
    const ca = center(a);
    const cb = center(b);
    return ((ca.x - o.x) ** 2 + (ca.y - o.y) ** 2) - ((cb.x - o.x) ** 2 + (cb.y - o.y) ** 2);
  });
}

/** Fade + blur OUT, nearest-to-origin first. Resolves when the last finishes. */
export function staggerOut(els: HTMLElement[], opts: StaggerOptions = {}): Promise<void> {
  const { duration = 380, step = 45, baseDelay = 0, blur = 6, easing = OUT_EASE } = opts;
  if (!els.length) return Promise.resolve();
  if (reduced()) { for (const el of els) el.style.opacity = '0'; return Promise.resolve(); }

  const ordered = orderByProximity(els, opts.origin);
  ordered.forEach((el, i) => {
    const d = baseDelay + i * step;
    el.style.willChange = 'opacity, filter';
    el.style.transition = `opacity ${duration}ms ${easing} ${d}ms, filter ${duration}ms ${easing} ${d}ms`;
  });
  requestAnimationFrame(() => {
    for (const el of ordered) {
      el.style.opacity = '0';
      el.style.filter = `blur(${blur}px)`;
    }
  });
  return wait(baseDelay + (ordered.length - 1) * step + duration);
}

/** Fade + blur IN from hidden, in sequence (or nearest-first). Clears inline styles when done. */
export function staggerIn(els: HTMLElement[], opts: StaggerOptions = {}): Promise<void> {
  const { duration = 480, step = 45, baseDelay = 0, blur = 6, easing = IN_EASE } = opts;
  if (!els.length) return Promise.resolve();

  for (const el of els) {
    el.style.transition = 'none';
    el.style.opacity = '0';
    el.style.filter = `blur(${blur}px)`;
    el.style.willChange = 'opacity, filter';
  }
  const clear = () => {
    for (const el of els) {
      el.style.transition = '';
      el.style.willChange = '';
      el.style.opacity = '';
      el.style.filter = '';
    }
  };
  if (reduced()) { clear(); return Promise.resolve(); }

  const ordered = opts.origin ? orderByProximity(els, opts.origin) : els.slice();
  requestAnimationFrame(() => requestAnimationFrame(() => {
    ordered.forEach((el, i) => {
      const d = baseDelay + i * step;
      el.style.transition = `opacity ${duration}ms ${easing} ${d}ms, filter ${duration}ms ${easing} ${d}ms`;
      el.style.opacity = '1';
      el.style.filter = 'blur(0px)';
    });
  }));
  return wait(baseDelay + (ordered.length - 1) * step + duration + 40).then(clear);
}

/**
 * Site-wide load-in: reveal every [data-reveal] element in top-down order.
 * They start hidden via CSS (html.is-js [data-reveal]); this fades+blurs them
 * in, then strips the attribute + inline styles so they rest naturally.
 * Robust: always clears (finally + safety sweep) so content can never stick
 * hidden if something throws.
 */
export function revealOnLoad(opts: StaggerOptions = {}): void {
  const els = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
  if (!els.length) return;

  const finish = (el: HTMLElement) => {
    el.removeAttribute('data-reveal');
    el.style.transition = '';
    el.style.willChange = '';
    el.style.opacity = '';
    el.style.filter = '';
  };
  // Safety sweep: whatever happens, nothing stays hidden.
  window.setTimeout(() => {
    for (const el of document.querySelectorAll<HTMLElement>('[data-reveal]')) finish(el);
  }, 4000);

  try {
    els.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
    if (reduced()) { els.forEach(finish); return; }

    const { duration = 520, step = 60, baseDelay = 40, blur = 6, easing = IN_EASE } = opts;
    els.forEach((el, i) => {
      const d = baseDelay + i * step;
      el.style.willChange = 'opacity, filter';
      el.style.transition = `opacity ${duration}ms ${easing} ${d}ms, filter ${duration}ms ${easing} ${d}ms`;
    });
    requestAnimationFrame(() => requestAnimationFrame(() => {
      for (const el of els) { el.style.opacity = '1'; el.style.filter = 'blur(0px)'; }
    }));
    window.setTimeout(
      () => els.forEach(finish),
      baseDelay + (els.length - 1) * step + duration + 60,
    );
  } catch {
    els.forEach(finish);
  }
}
