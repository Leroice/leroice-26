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

/** Selector for everything that participates in the reveal system. A
 *  [data-reveal] element reveals as one block; the direct children of a
 *  [data-reveal-children] element reveal individually (per-paragraph). */
const REVEAL_SELECTOR = '[data-reveal], [data-reveal-children] > *';

export function revealItems(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR));
}

const clearReveal = (el: HTMLElement) => {
  el.style.transition = '';
  el.style.willChange = '';
  el.style.opacity = '';
  el.style.filter = '';
};

/* ── Scroll-linked reveal ──────────────────────────────────
   Case studies are long. Revealing everything on load means the
   whole page below the fold has already appeared before you reach
   it — you scroll through content that never moves. These helpers
   hold below-the-fold blocks hidden and fade+blur them in as they
   come into view, so the same motion language carries down the page
   instead of stopping at the fold.

   Grids (the case-study layout kit) reveal their images in sequence
   rather than as one slab — the load cascade in miniature. */

const GRID_SELECTOR = '.cs-mocks, .cs-3, .cs-2, .cs-rows';

/** Is the element close enough to the fold to belong to the load cascade? */
export function nearViewport(el: HTMLElement, slack = 0.9): boolean {
  return el.getBoundingClientRect().top < window.innerHeight * slack;
}

const hide = (el: HTMLElement, blur: number) => {
  el.style.transition = 'none';
  el.style.opacity = '0';
  el.style.filter = `blur(${blur}px)`;
  el.style.willChange = 'opacity, filter';
};

const show = (el: HTMLElement, duration: number, easing: string, delay: number) => {
  el.style.transition =
    `opacity ${duration}ms ${easing} ${delay}ms, filter ${duration}ms ${easing} ${delay}ms`;
  el.style.opacity = '1';
  el.style.filter = 'blur(0px)';
  window.setTimeout(() => clearReveal(el), delay + duration + 60);
};

/**
 * Hold `els` hidden and fade+blur each in as it scrolls into view. Grid
 * blocks stagger their own children. Reveals once, then stops watching.
 * Under reduced motion (or without IntersectionObserver) everything is
 * simply shown.
 */
export function revealOnScroll(els: HTMLElement[], opts: StaggerOptions = {}): () => void {
  const noop = () => {};
  if (!els.length) return noop;
  const { duration = 620, step = 90, blur = 6, easing = IN_EASE } = opts;

  if (reduced() || typeof IntersectionObserver === 'undefined') {
    for (const el of els) clearReveal(el);
    return noop;
  }

  // Hide the unit: a grid hides its children (so they can sequence),
  // anything else hides itself.
  const childrenOf = (el: HTMLElement) =>
    el.matches(GRID_SELECTOR)
      ? (Array.from(el.children) as HTMLElement[])
      : [el];

  for (const el of els) for (const part of childrenOf(el)) hide(part, blur);

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target as HTMLElement;
        io.unobserve(el);
        childrenOf(el).forEach((part, i) => show(part, duration, easing, i * step));
      }
    },
    // Start the fade a little before the block's top edge arrives, so it's
    // settling as it enters rather than animating in the middle of the screen.
    { rootMargin: '0px 0px -12% 0px', threshold: 0.01 }
  );

  for (const el of els) io.observe(el);

  /** Stop watching and return every part to its resting style. Callers that
   *  tear the content down (the inline detail's close) MUST call this —
   *  grid children are hidden individually, so without it they'd stay
   *  invisible when the same detail is reopened. */
  const cancel = () => {
    io.disconnect();
    for (const el of els) for (const part of childrenOf(el)) clearReveal(part);
  };

  // Failsafe: never let content stay hidden if the observer misbehaves.
  window.setTimeout(cancel, 10000);
  return cancel;
}

/**
 * Site-wide load-in: fade + blur every reveal item in, top-down. Items start
 * hidden via CSS (html.is-js:not(.revealed) ...) so there's no no-JS flash;
 * once revealed, the root gets `.revealed` (CSS stops hiding) and inline
 * styles are cleared so elements rest naturally — the markers persist so the
 * same items can fade back out on navigation. Robust: a failsafe always
 * reveals so content can never stick hidden.
 */
export function revealOnLoad(opts: StaggerOptions = {}): void {
  const root = document.documentElement;
  const reveal = () => root.classList.add('revealed');
  const all = revealItems();
  if (!all.length) { reveal(); return; }

  // Only what's on (or near) screen joins the load cascade. Everything
  // below the fold is handed to the scroll observer, so a long case study
  // keeps revealing as you move down it instead of arriving pre-revealed.
  let els = all;
  let deferred: HTMLElement[] = [];

  const finishAll = () => { reveal(); for (const el of els) clearReveal(el); };
  window.setTimeout(finishAll, 4000); // failsafe — nothing stays hidden

  try {
    all.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
    if (reduced()) { els = all; finishAll(); return; }

    els = all.filter((el) => nearViewport(el));
    deferred = all.filter((el) => !nearViewport(el));

    // Hide the deferred set inline BEFORE `.revealed` drops the CSS gate,
    // otherwise they'd flash visible for a frame on the way past.
    revealOnScroll(deferred, opts);

    const { duration = 520, step = 60, baseDelay = 40, blur = 6, easing = IN_EASE } = opts;
    els.forEach((el, i) => {
      const d = baseDelay + i * step;
      el.style.willChange = 'opacity, filter';
      el.style.transition = `opacity ${duration}ms ${easing} ${d}ms, filter ${duration}ms ${easing} ${d}ms`;
    });
    requestAnimationFrame(() => requestAnimationFrame(() => {
      for (const el of els) { el.style.opacity = '1'; el.style.filter = 'blur(0px)'; }
    }));
    window.setTimeout(finishAll, baseDelay + (els.length - 1) * step + duration + 60);
  } catch {
    els = all;
    finishAll();
  }
}

/**
 * Site-wide exit: fade + blur the page's content out (rippling from `origin`),
 * then navigate to `href`. Honours reduced motion and always navigates even if
 * the animation is interrupted.
 */
export function pageExit(href: string, origin?: StaggerOptions['origin'], opts: StaggerOptions = {}): void {
  let navigated = false;
  const go = () => { if (!navigated) { navigated = true; window.location.href = href; } };
  if (reduced()) { go(); return; }
  const els = revealItems();
  if (!els.length) { go(); return; }

  // Keep the exit quick regardless of page size: cap the TOTAL stagger spread,
  // so a content-heavy page (CV) doesn't drag the navigation out.
  const n = els.length;
  const maxSpread = 160; // ms across all items
  const step = n > 1 ? Math.min(opts.step ?? 14, maxSpread / (n - 1)) : 0;
  const duration = opts.duration ?? 260;
  staggerOut(els, { origin, step, blur: opts.blur ?? 6, duration }).then(go);
  // Safety matched to the actual animation length (+ buffer) — never blocks long.
  window.setTimeout(go, (n - 1) * step + duration + 150);
}
