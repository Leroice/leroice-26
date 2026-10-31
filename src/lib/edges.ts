/* ───────────────────────────────────────────────────────────
   edges — keeps mobile Safari's status bar and bottom toolbar the same
   colour as the page beside them. Each frame that something moves, it
   samples the background just inside the top and bottom strips and
   writes one pair of values to everything that tints the browser
   chrome: the two fixed strips, the html and body backgrounds and the
   theme-color meta. start() returns a stop() that removes every
   listener and puts the shared styles back.
   ─────────────────────────────────────────────────────────── */

type RGBA = [number, number, number, number];

/** Parses a computed colour: rgb(), rgba() or color(srgb …). */
function parse(value: string): RGBA | null {
  const nums = value.match(/-?[\d.]+(e-?\d+)?/g)?.map(Number);
  if (!nums || nums.length < 3) return null;
  const scale = value.startsWith('color(') ? 255 : 1;
  return [nums[0] * scale, nums[1] * scale, nums[2] * scale, nums[3] ?? 1];
}

const css = ([r, g, b]: RGBA) =>
  `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;

/** The painted background at a point: every translucent layer above the
 *  first opaque one, composited down onto it. html and body are skipped
 *  (this script owns their backgrounds) in favour of the page's --bg. */
function backgroundAt(x: number, y: number, base: RGBA): RGBA {
  const root = document.documentElement;
  const layers: RGBA[] = [];
  for (const el of document.elementsFromPoint(x, y)) {
    if (el === root || el === document.body) continue;
    const c = parse(getComputedStyle(el).backgroundColor);
    if (!c || c[3] <= 0) continue;
    layers.push(c);
    if (c[3] >= 0.99) break;
  }
  let out: RGBA = [...base];
  for (let i = layers.length - 1; i >= 0; i--) {
    const [r, g, b, a] = layers[i];
    out = [r * a + out[0] * (1 - a), g * a + out[1] * (1 - a), b * a + out[2] * (1 - a), 1];
  }
  return out;
}

export function start(): () => void {
  const root = document.documentElement;
  const body = document.body;
  const top = document.querySelector<HTMLElement>('.edge-top');
  const bottom = document.querySelector<HTMLElement>('.edge-bottom');
  const metas = [...document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')];
  if (!top || !bottom) return () => {};

  // Saved so stop() can hand the document back untouched.
  const saved = {
    html: root.style.background,
    body: body.style.background,
    metas: metas.map((m) => m.content),
  };

  let last = '';
  let raf = 0;

  const sync = () => {
    raf = 0;
    // The strips carry `color: var(--bg)`, so this is the page colour
    // for the current theme without parsing custom properties.
    const base = parse(getComputedStyle(top).color) ?? [255, 255, 255, 1];
    const x = Math.min(2, window.innerWidth - 1);
    const topY = top.getBoundingClientRect().bottom + 1;
    const bottomY = bottom.getBoundingClientRect().top - 1;
    const t = css(backgroundAt(x, topY, base));
    const b = css(backgroundAt(x, bottomY, base));
    if (t + b === last) return;
    last = t + b;
    root.style.setProperty('--edge-top-background', t);
    root.style.setProperty('--edge-bottom-background', b);
    root.style.background = t;
    body.style.background = b;
    for (const m of metas) m.content = t;
  };

  const schedule = () => { if (!raf) raf = requestAnimationFrame(sync); };

  const scheme = window.matchMedia('(prefers-color-scheme: dark)');
  const vv = window.visualViewport;
  const opts = { passive: true } as const;
  window.addEventListener('scroll', schedule, opts);
  window.addEventListener('resize', schedule, opts);
  vv?.addEventListener('resize', schedule, opts);
  vv?.addEventListener('scroll', schedule, opts);
  scheme.addEventListener('change', schedule);
  // Content that grows or shrinks without a scroll (the inline detail
  // opening, late images) can change what sits under either strip.
  const resize = new ResizeObserver(schedule);
  resize.observe(body);
  sync();

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', schedule);
    vv?.removeEventListener('resize', schedule);
    vv?.removeEventListener('scroll', schedule);
    scheme.removeEventListener('change', schedule);
    resize.disconnect();
    root.style.removeProperty('--edge-top-background');
    root.style.removeProperty('--edge-bottom-background');
    root.style.background = saved.html;
    body.style.background = saved.body;
    metas.forEach((m, i) => { m.content = saved.metas[i]; });
  };
}
