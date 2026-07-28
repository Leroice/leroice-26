# leroice.com — design tokens

Single reference for every token in the build. **The build is the source of
truth** — Figma is the visual reference. Where the two disagree, this file
records what actually ships and flags the delta.

Everything below is declared in `src/styles/global.css` (`:root`, top of file).
Change a value there, not at a call site.

---

## 1. Breakpoints

Declared as `@custom-media` and compiled to plain `@media (max-width: …)` at
build time by `postcss-custom-media` (see `postcss.config.mjs`). Never type the
pixel values at a call site — reference the name.

| Token | Value | What changes |
|---|---|---|
| `--bp-tablet` | 880px | `.split` / `.detail__body` / `.cv-section` / `.sg` collapse to one column; nav switches to the hamburger |
| `--bp-phone` | 520px | Three-tier insets kick in; hero goes full-bleed portrait; case-study grids go 1-up; subnav tabs hidden |
| `--bp-phone-sm` | 480px | CV stat grid's last collapse |

```css
@media (--bp-phone) { … }   /* ✅ */
@media (max-width: 520px) { … }  /* ❌ don't */
```

**Reference test width: 390px.**

---

## 2. Colour

Four tokens. There are no others — everything else is these plus an opacity step.

| Token | Light | Dark |
|---|---|---|
| `--text-primary` | `#24221B` | `#F2EFE8` |
| `--bg` | `#FAFAF7` | `#14130F` |
| `--hover-bg` | `rgba(0,0,0,0.05)` | `rgba(255,255,255,0.06)` |
| `--rule` | `rgba(36,34,27,0.08)` | `rgba(242,239,232,0.08)` |

Theming: `prefers-color-scheme` by default, overridden by `data-theme="light|dark"`
on `<html>`. **System-driven is the default** — the TUNING panel's System option
clears the attribute; Light/Dark force it and persist to `localStorage.theme`.

### Figma ↔ build mapping

The Figma file carries a much larger `Color` collection (19 variables, Light/Dark
modes). Only the four above exist in CSS; the rest are expressed as opacity steps.

| Figma variable | Build equivalent |
|---|---|
| `Text + Icon/Primary` | `--text-primary` @ `--op-primary` |
| `Text + Icon/Secondary` | `--text-primary` @ `--op-secondary` |
| `Text + Icon/Tertiary` | `--text-primary` @ `--op-tertiary` |
| `Text + Icon/Subtle` | `--text-primary` @ `--op-subtle` |
| `Surface/Primary` | `--bg` |
| `Surface/On Surface Subtle` | `--hover-bg` |
| `Border/Subtle` | `--rule` |

> ⚠️ **Known delta:** Figma's `Text + Icon/Primary` is `#232323` (light); the build
> ships `#24221B` — a warmer, slightly darker ink that pairs with the `#FAFAF7`
> paper. The build wins. Don't "fix" this by syncing to Figma without a decision.

---

## 3. Opacity ramp

Figma expresses text/icon colour as opacity steps on one ink, and so does the build.

| Token | Value | Figma name |
|---|---|---|
| `--op-primary` | `1` | Text + Icon/Primary |
| `--op-secondary` | `0.8` | Text + Icon/Secondary |
| `--op-tertiary` | `0.7` | Text + Icon/Tertiary |
| `--op-subtle` | `0.5` | Text + Icon/Subtle |

Legacy aliases (pre-Figma-sync names, still referenced in older rules):
`--op-strong` → `--op-tertiary`, `--op-soft` → `--op-subtle`.

---

## 4. Typography

One typeface: **Geist**, self-hosted (`public/fonts/`), three weights. No monospace
— deliberate.

**Weight note:** the Geist Medium `woff2` is registered at `450`, so `font-weight: 450`
in CSS *is* Figma's "Medium". `400` = Regular, `600` = SemiBold.

### The ramp

Each row is 1:1 with a Figma text style of the same name.

| Token | Size | Weight | Line height | Tracking | Figma style |
|---|---|---|---|---|---|
| `--fs-display` | 32px | Medium (450) | auto | `--tracking-tight` | Display |
| `--fs-title` | 17px | Medium (450) | auto | `--tracking-tight` | Title |
| `--fs-title-2` | 15px | Medium (450) | auto | `--tracking-tight` | Title 2 |
| `--fs-body-lg` | 16px | Regular (400) | `--lh-body-lg` | `--tracking-tight` | Body/Large |
| `--fs-link` | 14px | Regular (400) | auto | `--tracking-meta` | Link |
| `--fs-body` | 14px | Regular (400) | auto | `--tracking-body` | Body/Small |
| `--fs-meta` | 13px | Regular (400) | `--lh-meta` | `--tracking-meta` | Meta |
| `--fs-subline` | 12px | Regular (400) | `--lh-meta` | `--tracking-meta` | Subline |
| `--fs-caption` | 11px | Regular (400) | auto | `0` | Caption |

Body/Small **Emphasis** = `--fs-body` at weight 450 with `--tracking-tight`.

### Metrics

| Token | Value | Applies to |
|---|---|---|
| `--tracking-tight` | `-0.43px` | Display, Title, Title 2, Body/Large |
| `--tracking-meta` | `-0.2px` | Link, Meta, Subline |
| `--tracking-body` | `-0.33px` | Body/Small |
| `--lh-meta` | `1.15` | Meta + Subline (both ride 115%) |
| `--lh-body-lg` | `1.55` | Body/Large |

Legacy size aliases: `--fs-sm` → `--fs-body`, `--fs-name` → `--fs-title`,
`--fs-h1` → `--fs-display`.

### What uses what

| Element | Style | Opacity |
|---|---|---|
| Nav brand | Title (17) | Primary / `.role` at 0.5 |
| Nav links | Link (14) | `--op-strong` |
| Row year | Caption (11, ls 0) | Secondary |
| **Row title + subnav title** | **Title 2 (15)** | Primary |
| **Row meta + subnav meta** | **Subline (12)** | Tertiary |
| Subnav tabs | Meta (13) | Subtle |
| Case-study prose | Body/Large (16) | Primary |
| Unlock dialog kicker | Caption-sized Subline | Subtle |

> The row lockup and the subnav lockup are **one shared rule pair**
> (`.row__title, .detail__subnav-name` / `.row__desc, .detail__subnav-meta`) so
> they can't drift. This mirrors Figma's `List Title + Meta` component (196:335),
> which both the row (198:785) and subnav (194:4) instantiate. Change it once.

---

## 5. Spacing & radius

| Token | Value |
|---|---|
| `--sp-3` | 12px |
| `--sp-base` | 16px |
| `--radius-md` | 12px |

Not every value is tokenised — component-specific numbers (a 20px row bottom pad,
the dialog's 24px radius) live in their rules with a Figma node reference in the
comment.

---

## 6. Layout

| Token | Value | Purpose |
|---|---|---|
| `--page-max` | `76rem` (1216px) | Max content width, every page |
| `--list-width` | `22rem` | Home list column |
| `--col-gap` | `6rem` | Home split column gap |
| `--side-pad` | `2rem` (desktop) · `0.75rem` (phone) | Outer page padding |
| `--top-pad` | `2.5rem` | — |
| `--content-pad` | `calc(--side-pad + --sp-base)` | **The alignment rule** |
| `--nav-height` | `120px` | Sticky offset for the detail subnav; matches the measured `.nav` box (64 top + content + 12 bottom) at every width |

### The alignment rule

`--content-pad` puts every page's content — nav brand, row text, hero, prose,
footer — on **one vertical line**. It's derived, not typed: because it's a
`calc()` off `--side-pad`, overriding `--side-pad` at a breakpoint retunes the
whole site from one place.

### Phone insets — three tiers (Figma 217:222)

| Tier | Inset | Elements |
|---|---|---|
| Chrome | **12px** | Nav brand, hamburger, subnav shell, footer anchor |
| Imagery | **16px** | Case-study media (breaks out of the prose column by −12px) |
| Prose | **28px** | Body text, row text |

`--side-pad: 0.75rem` at `--bp-phone` makes `--content-pad` resolve to 28px
(the prose tier) site-wide; chrome gets scoped overrides in the **Phone chrome
tier** block at the *end* of `global.css` (placed last so it wins the cascade).

Home rows still land their text on the prose line: 12px shell + 16px row padding
= 28px. The hero goes full-bleed (0). This deliberately **decouples the nav brand
from the content line on phones** — brand at 12, prose at 28 — per the guide.

---

## 7. Motion

One signal drives the homepage: **spring velocity** from the rAF loop. Pill
position/size follow the spring; pill blur/opacity and frame blur are functions
of that same velocity, so they cannot desync. There are no CSS transitions in
that stack — the spring *is* the easing curve.

| Token | Value | Purpose |
|---|---|---|
| `--spring-stiffness` | `410` | Heavy, overdamped, deliberate |
| `--spring-damping` | `84` | |
| `--spring-mass` | `3` | |
| `--pill-breath-peak-velocity` | `2000` | px/s at which "breath" maxes |
| `--pill-breath-blur-max` | `16` | |
| `--pill-opacity-rest` | `0.06` | |
| `--pill-opacity-moving` | `0.03` | |
| `--frame-blur-max` | `7` | Preview frame, synced to the same signal |
| `--image-ease` | `cubic-bezier(0.2, 0.8, 0.2, 1)` | Discrete state changes |
| `--row-fade-duration` | `600ms` | Row inactive-state dim |
| `--preview-follow` | `300ms` | Preview image trails the pill |
| `--goo-blur` / `--goo-threshold` | `0` / `4` | Gooey filter (currently neutralised) |

Live values written by rAF each frame: `--pill-velocity-blur`,
`--pill-velocity-opacity`, `--frame-blur`.

### Timing reference (not tokenised — in `src/lib/`)

| System | Values | Where |
|---|---|---|
| Reveal — load cascade | 520ms in, 60ms step, 40ms base delay | `reveal.ts` `revealOnLoad()` |
| Reveal — proximity | 380ms out / 480ms in, 45ms step | `staggerOut` / `staggerIn` |
| Page exit | 260ms, capped 160ms spread | `pageExit()` |
| Subnav elastic entrance | **1409.864ms**, one-shot (Figma verbatim) | `subnav-elastic.ts` |
| Hidden-state blur | 6px | every `[data-reveal]` / `[data-elastic]` |
| Hero arc-flip | 980ms, arc 0.1, minYield 58 | `CHOREO.image` in `index.astro` |

**Site-wide rule: nothing appears or vanishes instantly.** Everything fades with
a slight blur; interactions propagate by proximity; loads cascade in sequence.
Reveals use opacity + blur only (never transform) so layout measurements stay
stable for FLIP.

---

## 8. Non-negotiables / gotchas

Hard-won rules. Breaking these has caused real bugs in this codebase.

1. **`overflow-x: clip`, never `hidden`** on `html`/`body` — `hidden` creates a
   scroll container and silently breaks `position: sticky` on descendants.
2. **`touch-action: manipulation` on `body`** — kills double-tap-to-zoom
   site-wide. Pinch-zoom stays available (accessibility). Don't scope it to images.
3. **Form inputs must be ≥16px** — iOS Safari auto-zooms the whole page when a
   focused input's text is smaller. `.unlock__input` uses `max(16px, var(--fs-body))`.
4. **Two render paths for every case study.** Opening from the home list renders
   the *inline* detail (`.list__detail`, pushState URL); a refresh renders the
   *standalone* `/work/[slug]` page. **Any layout rule must be checked in both.**
   Inline-scoped selectors are two-class (`.list__detail .detail__hero`) and will
   silently outrank single-class breakpoint rules.
5. **Don't reintroduce `body:has(.detail__subnav) .nav`** — its `:has()`
   specificity beat every single-class phone override. Project-page detection uses
   `body:has(article.detail)` / `body:has(.split.is-detail)` instead (the resting
   home list contains *hidden* inline subnavs that would wrongly match).
6. **The subnav entrance must not run on hidden subnavs** — the home page carries
   one per project; animating them strands the real entrance at its start offsets.
7. **WAAPI `fill: 'forwards'` overrides the stylesheet forever.** The elastic
   entrance scales its opacity/gap tracks to each element's *computed rest value*,
   then clears inline styles **before** cancelling, so there's no frame where an
   inline `opacity: 0` can paint.
8. **The preview frame and case-study hero share `16 / 10`** so the click FLIP
   scales uniformly. Changing one without the other makes the image visibly
   squash mid-flight.
9. **`history.scrollRestoration = 'manual'`** on the home page — the browser
   otherwise yanks scroll on `popstate` before the close transition starts.

---

## 9. Where things live

```
src/styles/global.css     ← every token (:root, top of file)
src/lib/arc-flip.ts       ← FLIP primitive, easings, makeSpring
src/lib/reveal.ts         ← staggerIn/Out, revealOnLoad, pageExit
src/lib/subnav-elastic.ts ← subnav entrance (Figma-verbatim tracks)
src/pages/styleguide.astro ← live rendering of this reference
```

`/styleguide` renders every token and component from the real classes — no
reinvented markup — so it can't drift from the site. The Figma **StyleGuide**
page mirrors it, bound to the `Color` collection so it themes with the file.
