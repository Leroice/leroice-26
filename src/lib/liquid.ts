/* Liquid effects — vanilla port of the techniques in liquid-gooey (MIT,
   github.com/Jakubantalik/Libraries.dev). That library is React-only, so
   nothing here is installed or copied; this is the same physics and the same
   two-layer filter approach rewritten for this codebase's idiom (plain TS,
   WAAPI/rAF, no framework).

   The one structural idea worth taking verbatim: run the goo filter on an
   SVG silhouette layer, never as a CSS url() filter on HTML. Filters on SVG
   content render identically across Chrome/Firefox/Safari, whereas WebKit's
   HTML filter path is unreliable and destroys text and imagery. Real content
   stays crisp and interactive above; the liquid is only ever the surface.

   Contrast with .list__pill-wrap, which does filter HTML directly — that
   works today only because the pill is a solid block with nothing legible
   under it. Don't extend that pattern; extend this one. */

export interface SpringOpts {
  /** Restoring force. Higher = snappier. */
  stiffness?: number;
  /** Velocity damping. Higher = less overshoot. */
  damping?: number;
  mass?: number;
}

/**
 * Continuous damped-spring integrator.
 *
 * Distinct from makeSpring() in arc-flip.ts, which pre-samples a trajectory
 * into a fixed EasingFn for WAAPI. That one needs to know its endpoint up
 * front. This one is driven — the target can move every frame (a pointer, a
 * dragged element), which is exactly what trailing liquid requires.
 */
export class Spring {
  value: number;
  velocity = 0;
  target: number;
  private k: number;
  private c: number;
  private m: number;

  constructor(initial = 0, opts: SpringOpts = {}) {
    this.value = initial;
    this.target = initial;
    this.k = opts.stiffness ?? 180;
    this.c = opts.damping ?? 22;
    this.m = opts.mass ?? 1;
  }

  /** Advance by dt seconds. Substepped so a dropped frame can't explode it. */
  step(dt: number): number {
    // Long gaps (tab restored, GC pause) integrate to nonsense at one big
    // step, so clamp then substep at a fixed rate.
    const clamped = Math.min(dt, 0.064);
    const steps = Math.max(1, Math.ceil(clamped / (1 / 240)));
    const h = clamped / steps;
    for (let i = 0; i < steps; i++) {
      const f = -this.k * (this.value - this.target) - this.c * this.velocity;
      this.velocity += (f / this.m) * h;
      this.value += this.velocity * h;
    }
    return this.value;
  }

  /** True once the spring has effectively stopped — used to sleep the loop. */
  get settled(): boolean {
    return (
      Math.abs(this.target - this.value) < 0.01 && Math.abs(this.velocity) < 0.01
    );
  }

  /** Jump to a value with no motion. */
  snap(v: number): void {
    this.value = v;
    this.target = v;
    this.velocity = 0;
  }

  /** Change the physics in place, preserving current position and velocity. */
  retune(opts: SpringOpts): void {
    if (opts.stiffness !== undefined) this.k = opts.stiffness;
    if (opts.damping !== undefined) this.c = opts.damping;
    if (opts.mass !== undefined) this.m = opts.mass;
  }
}

/** 0..1 knobs, matching the library's naming so its docs stay readable here. */
export interface TrailOpts {
  /** 0..1 — how tightly the liquid chases. 0 = heavy syrup, 1 = near-instant. */
  springiness?: number;
  /** 0..1 — overshoot on arrival. */
  wobble?: number;
  /** 0..1 — velocity stretch of the drop. */
  stretch?: number;
  /** 0..1 — trailing droplet size. 0 disables the tail. */
  trail?: number;
  /** Radius of the leading blob, px. */
  radius?: number;
}

/* The knobs are 0..1 because that's the vocabulary the library exposes and
   it's what a designer actually wants to tune. Physics values are derived
   here so the mapping lives in one place. */
function springFromKnobs(springiness: number, wobble: number): SpringOpts {
  // springiness 0..1 -> stiffness 40..520, exponential so the low end has
  // usable resolution (the difference between 40 and 80 reads much more
  // strongly than between 400 and 440).
  const stiffness = 40 * Math.pow(13, springiness);
  // Critical damping for the given stiffness, scaled down by wobble to let
  // it overshoot. Deriving from stiffness keeps character constant as
  // springiness changes — otherwise raising speed also kills the bounce.
  const critical = 2 * Math.sqrt(stiffness);
  return { stiffness, damping: critical * (1 - wobble * 0.72), mass: 1 };
}

export interface TrailHandle {
  /** Point the liquid at a new position (page coords relative to the host). */
  moveTo(x: number, y: number): void;
  /** Retune without rebuilding. */
  setOpts(opts: TrailOpts): void;
  destroy(): void;
}

/**
 * Liquid trail — a blob that chases a point on a spring, with a lagging
 * droplet behind it. The two merge through the goo filter whenever they're
 * close, which is what produces the stretching-and-snapping-back read.
 *
 * `host` should be a positioned element; the SVG fills it.
 */
export function liquidTrail(
  host: HTMLElement,
  filterId: string,
  opts: TrailOpts = {}
): TrailHandle {
  let o: Required<TrailOpts> = {
    springiness: opts.springiness ?? 0.5,
    wobble: opts.wobble ?? 0.5,
    stretch: opts.stretch ?? 0.36,
    trail: opts.trail ?? 0.575,
    radius: opts.radius ?? 26,
  };

  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'liquid__layer');
  svg.setAttribute('aria-hidden', 'true');

  const g = document.createElementNS(NS, 'g');
  g.setAttribute('filter', `url(#${filterId})`);
  svg.appendChild(g);

  // Ellipse rather than circle: velocity stretch needs independent radii.
  const lead = document.createElementNS(NS, 'ellipse');
  const tail = document.createElementNS(NS, 'ellipse');
  for (const el of [tail, lead]) {
    el.setAttribute('fill', 'var(--liquid-fill, currentColor)');
    g.appendChild(el);
  }

  host.appendChild(svg);

  let sp = springFromKnobs(o.springiness, o.wobble);
  // The tail is the same spring, softened — a separate character would read
  // as two unrelated objects rather than one body being dragged.
  const tailSp = (): SpringOpts => ({
    stiffness: sp.stiffness! * 0.42,
    damping: sp.damping! * 0.92,
    mass: 1,
  });

  const x = new Spring(0, sp);
  const y = new Spring(0, sp);
  const tx = new Spring(0, tailSp());
  const ty = new Spring(0, tailSp());

  let raf = 0;
  let last = 0;
  let running = false;
  let primed = false;

  function frame(now: number) {
    const dt = last ? (now - last) / 1000 : 1 / 60;
    last = now;

    x.step(dt);
    y.step(dt);
    tx.step(dt);
    ty.step(dt);

    // Stretch along the direction of travel, proportional to speed. The
    // cap stops a fast flick from smearing the blob into a needle.
    const speed = Math.hypot(x.velocity, y.velocity);
    const s = Math.min(speed / 1400, 1) * o.stretch;
    const angle = (Math.atan2(y.velocity, x.velocity) * 180) / Math.PI;

    const r = o.radius;
    lead.setAttribute('cx', String(x.value));
    lead.setAttribute('cy', String(y.value));
    lead.setAttribute('rx', String(r * (1 + s)));
    lead.setAttribute('ry', String(r * (1 - s * 0.55)));
    lead.setAttribute('transform', `rotate(${angle} ${x.value} ${y.value})`);

    if (o.trail > 0) {
      // The droplet shrinks as it catches up, so it reads as reabsorbed
      // rather than parked. Distance drives it, not time.
      const gap = Math.hypot(tx.value - x.value, ty.value - y.value);
      const closeness = Math.min(gap / (r * 3), 1);
      const tr = r * o.trail * (0.35 + closeness * 0.65);
      tail.setAttribute('cx', String(tx.value));
      tail.setAttribute('cy', String(ty.value));
      tail.setAttribute('rx', String(tr));
      tail.setAttribute('ry', String(tr));
      tail.setAttribute('opacity', '1');
    } else {
      tail.setAttribute('opacity', '0');
    }

    // Sleep when nothing is moving — an always-on rAF is the single most
    // common reason effects like this tank battery on a laptop.
    if (x.settled && y.settled && tx.settled && ty.settled) {
      running = false;
      last = 0;
      return;
    }
    raf = requestAnimationFrame(frame);
  }

  function wake() {
    if (running) return;
    running = true;
    last = 0;
    raf = requestAnimationFrame(frame);
  }

  return {
    moveTo(nx: number, ny: number) {
      // First move places the blob rather than flying it in from 0,0.
      if (!primed) {
        primed = true;
        x.snap(nx);
        y.snap(ny);
        tx.snap(nx);
        ty.snap(ny);
      }
      x.target = nx;
      y.target = ny;
      tx.target = nx;
      ty.target = ny;
      wake();
    },
    setOpts(next: TrailOpts) {
      o = { ...o, ...next };
      sp = springFromKnobs(o.springiness, o.wobble);
      x.retune(sp);
      y.retune(sp);
      const t = tailSp();
      tx.retune(t);
      ty.retune(t);
      wake();
    },
    destroy() {
      cancelAnimationFrame(raf);
      running = false;
      svg.remove();
    },
  };
}

export interface HighlightOpts {
  /** 0..1 — how tightly the pill chases the hovered target. */
  springiness?: number;
  /** 0..1 — overshoot on arrival. */
  wobble?: number;
  /** 0..1 — trailing droplet size. 0 disables the tail. */
  trail?: number;
  /** Padding around the target's box, px. */
  padX?: number;
  padY?: number;
  /** Corner radius, px. */
  radius?: number;
}

export interface HighlightHandle {
  setOpts(opts: HighlightOpts): void;
  destroy(): void;
}

/**
 * Liquid highlight — a pill that springs between hovered targets, with a
 * droplet that lags and is reabsorbed. Distinct from liquidTrail: this
 * chases *element rects*, so it animates width as well as position, and a
 * long hop stretches into a bar before resolving back into a pill.
 *
 * `container` must be positioned; targets must be inside it.
 */
export function liquidHighlight(
  container: HTMLElement,
  targets: HTMLElement[],
  filterId: string,
  opts: HighlightOpts = {}
): HighlightHandle {
  let o: Required<HighlightOpts> = {
    springiness: opts.springiness ?? 0.55,
    wobble: opts.wobble ?? 0.45,
    trail: opts.trail ?? 0.5,
    padX: opts.padX ?? 10,
    padY: opts.padY ?? 6,
    radius: opts.radius ?? 10,
  };

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'liquid__layer');
  svg.setAttribute('aria-hidden', 'true');
  const g = document.createElementNS(NS, 'g');
  g.setAttribute('filter', `url(#${filterId})`);
  const tail = document.createElementNS(NS, 'rect');
  const lead = document.createElementNS(NS, 'rect');
  for (const el of [tail, lead]) {
    el.setAttribute('fill', 'var(--liquid-fill, currentColor)');
    g.appendChild(el);
  }
  svg.appendChild(g);
  container.appendChild(svg);

  let sp = springFromKnobs(o.springiness, o.wobble);
  const x = new Spring(0, sp);
  const w = new Spring(0, sp);
  const tailX = new Spring(0, { ...sp, stiffness: sp.stiffness! * 0.4 });
  const tailW = new Spring(0, { ...sp, stiffness: sp.stiffness! * 0.4 });

  // Opacity is a plain transition on the group, not a spring — fading is
  // not a physical motion and springing it just makes it feel uncertain.
  let visible = false;
  let boxY = 0;
  let boxH = 0;
  let primed = false;
  let raf = 0;
  let last = 0;
  let running = false;

  function rectFor(el: HTMLElement) {
    const c = container.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return {
      x: r.left - c.left - o.padX,
      y: r.top - c.top - o.padY,
      w: r.width + o.padX * 2,
      h: r.height + o.padY * 2,
    };
  }

  function frame(now: number) {
    const dt = last ? (now - last) / 1000 : 1 / 60;
    last = now;
    x.step(dt);
    w.step(dt);
    tailX.step(dt);
    tailW.step(dt);

    lead.setAttribute('x', String(x.value));
    lead.setAttribute('y', String(boxY));
    lead.setAttribute('width', String(Math.max(0, w.value)));
    lead.setAttribute('height', String(boxH));
    lead.setAttribute('rx', String(o.radius));

    if (o.trail > 0) {
      // The droplet is a vertically-inset slab: it reads as liquid left
      // behind rather than a second button. Height shrinks with distance
      // so it thins out as it's stretched, like a real bridge.
      const gap = Math.abs(tailX.value - x.value);
      const thin = Math.min(gap / 120, 1);
      const th = boxH * (1 - thin * 0.42) * o.trail;
      tail.setAttribute('x', String(tailX.value));
      tail.setAttribute('y', String(boxY + (boxH - th) / 2));
      tail.setAttribute('width', String(Math.max(0, tailW.value)));
      tail.setAttribute('height', String(Math.max(0, th)));
      tail.setAttribute('rx', String(Math.min(o.radius, th / 2)));
      tail.setAttribute('opacity', '1');
    } else {
      tail.setAttribute('opacity', '0');
    }

    if (x.settled && w.settled && tailX.settled && tailW.settled) {
      running = false;
      last = 0;
      return;
    }
    raf = requestAnimationFrame(frame);
  }

  function wake() {
    if (running) return;
    running = true;
    last = 0;
    raf = requestAnimationFrame(frame);
  }

  function show(el: HTMLElement) {
    const r = rectFor(el);
    boxY = r.y;
    boxH = r.h;

    // First reveal appears in place. Springing in from wherever the pill
    // was last parked would fly it across the nav on an unrelated hover.
    if (!primed || !visible || reduce.matches) {
      x.snap(r.x);
      w.snap(r.w);
      tailX.snap(r.x);
      tailW.snap(r.w);
      primed = true;
    } else {
      x.target = r.x;
      w.target = r.w;
      tailX.target = r.x;
      tailW.target = r.w;
    }
    visible = true;
    svg.classList.add('is-visible');
    wake();
    // One frame is still needed after a snap to write the attributes.
    if (!running) requestAnimationFrame(frame);
  }

  function hide() {
    visible = false;
    svg.classList.remove('is-visible');
  }

  const onEnter = (e: Event) => show(e.currentTarget as HTMLElement);
  for (const t of targets) {
    t.addEventListener('pointerenter', onEnter);
    t.addEventListener('focus', onEnter);
  }
  container.addEventListener('pointerleave', hide);
  container.addEventListener('focusout', (e) => {
    // Only clear when focus actually leaves the group, not when it hops
    // between two links inside it.
    const next = (e as FocusEvent).relatedTarget as Node | null;
    if (!next || !container.contains(next)) hide();
  });

  // Rects move on resize and on font load; re-measure the active one.
  const ro = new ResizeObserver(() => {
    if (!visible) return;
    const active = targets.find((t) => t.matches(':hover, :focus-visible'));
    if (active) show(active);
  });
  ro.observe(container);

  return {
    setOpts(next: HighlightOpts) {
      o = { ...o, ...next };
      sp = springFromKnobs(o.springiness, o.wobble);
      x.retune(sp);
      w.retune(sp);
      const t = { ...sp, stiffness: sp.stiffness! * 0.4 };
      tailX.retune(t);
      tailW.retune(t);
      wake();
    },
    destroy() {
      cancelAnimationFrame(raf);
      running = false;
      ro.disconnect();
      for (const t of targets) {
        t.removeEventListener('pointerenter', onEnter);
        t.removeEventListener('focus', onEnter);
      }
      svg.remove();
    },
  };
}
