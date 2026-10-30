/* ───────────────────────────────────────────────────────────
   spring-flip — a FLIP move along one fixed arc, timed by a spring.
   The element is laid out at its final box and starts transformed back
   to `from`. A single damped spring drives progress p from 0 to 1, and
   position, dip and scale are all read off p, so the path is always the
   same smooth curve: it sinks by up to `dip` px early on (as if its
   weight just dropped) and rises into the landing. reverse() springs p
   back to 0, retracing the same arc from wherever it is.
   ─────────────────────────────────────────────────────────── */

export interface Spring { stiffness: number; damping: number; mass: number }

export interface SpringFlip {
  /** Resolves true when it settles, false if cancelled. */
  finished: Promise<boolean>;
  /** Spring back to the start along the same arc. */
  reverse(): void;
  /** Whether it is still moving. */
  readonly running: boolean;
  cancel(): void;
}

const SUBSTEP = 1 / 240; // fixed integration step keeps the spring stable

export function springFlip(
  el: HTMLElement,
  from: DOMRect,
  opts: { spring: Spring; dip?: number },
): SpringFlip {
  const last = el.getBoundingClientRect();
  const { stiffness, damping, mass } = opts.spring;
  const dip = opts.dip ?? 0;

  const x0 = from.left - last.left;
  const y0 = from.top - last.top;
  const sx0 = last.width ? from.width / last.width : 1;
  const sy0 = last.height ? from.height / last.height : 1;

  let p = 0, v = 0, target = 1;
  let running = true;
  let raf = 0;
  let prev = 0;
  let resolve!: (v: boolean) => void;
  const finished = new Promise<boolean>((r) => { resolve = r; });

  const paint = () => {
    const q = Math.min(1, Math.max(0, p));
    const sag = dip * Math.sin(Math.PI * Math.pow(q, 0.7)); // peaks early, gone at both ends
    const x = x0 * (1 - p);
    const y = y0 * (1 - p) + sag;
    const sx = sx0 + (1 - sx0) * p;
    const sy = sy0 + (1 - sy0) * p;
    el.style.transform =
      `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`;
  };
  const clear = () => {
    el.style.transform = '';
    el.style.transformOrigin = '';
    el.style.willChange = '';
  };

  const frame = (ts: number) => {
    let dt = prev ? Math.min((ts - prev) / 1000, 1 / 20) : 1 / 60;
    prev = ts;
    while (dt > 0) {
      const h = Math.min(SUBSTEP, dt);
      v += ((-stiffness * (p - target) - damping * v) / mass) * h;
      p += v * h;
      dt -= h;
    }
    if (Math.abs(p - target) < 0.0005 && Math.abs(v) < 0.005) {
      p = target;
      running = false;
      // Home: drop the inline transform. Reversed: hold the start pose so
      // the caller can hand off to whatever sits there without a flash.
      if (target === 1) clear(); else paint();
      resolve(true);
      return;
    }
    paint();
    raf = requestAnimationFrame(frame);
  };

  el.style.transformOrigin = 'top left';
  el.style.willChange = 'transform';
  paint(); // start pose applied synchronously: no first-frame flash
  raf = requestAnimationFrame(frame);

  return {
    finished,
    get running() { return running; },
    reverse() {
      target = 0;
      if (!running) { running = true; prev = 0; raf = requestAnimationFrame(frame); }
    },
    cancel() {
      if (!running) return;
      running = false;
      cancelAnimationFrame(raf);
      clear();
      resolve(false);
    },
  };
}
