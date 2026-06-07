# leroice.com — Context Handoff

Portfolio of Leigh Scholten. Astro site, deployed to Vercel, currently built and
previewed on a **sandbox subdomain** while the real site keeps running. This doc
is the full pick-up-anywhere context: where things live, how the motion system
works, the content model, deploy/DNS, and the open work (incl. the Figma redesign loop).

---

## 1. Where everything lives

| Thing | Location |
|---|---|
| Astro project (this repo) | `~/Developer/Leroice-26` |
| Old Webflow export (content source) | `~/Developer/leroice-portfolio` |
| Live sandbox | https://26.leroice.com |
| Real site (untouched) | https://leroice.com |
| Figma source file | https://www.figma.com/design/h7LSto3kK3s1AdbA2w6MNU/leroice.com |

Stack: **Astro** (MPA, no client router) · **Vercel** hosting · **Geist** font
(Fontsource, self-hosted in `public/fonts/`). No framework UI libs — vanilla TS
in Astro `<script>` blocks. Single typeface, no monospace (deliberate).

## 2. Run & deploy

```sh
cd ~/Developer/Leroice-26
npm install
npm run dev          # http://localhost:4321
npm run build        # static output → dist/
vercel --prod --yes  # deploy to the sandbox subdomain (account: ls-2955, project: leroice-26)
```

- **`26.leroice.com`** is the sandbox: a Cloudflare **CNAME `26` → `cname.vercel-dns.com`**, set to **DNS-only** (grey cloud) so Vercel manages TLS. This is the *only* leroice.com record on Vercel.
- **The real `leroice.com` is NOT on Vercel** — it stays on Cloudflare (apex A records). Nothing in this project touches it. Do **not** move nameservers to Vercel.
- Vercel auto-promotes; `vercel --prod` updates what `26.leroice.com` serves.

## 3. Repo map

```
src/
  content/
    config.ts          ← work collection schema
    work/*.md           ← one file per project (frontmatter + markdown body)
  layouts/Base.astro    ← <head>, nav, footer, theme bootstrap, reveal + exit scripts
  pages/
    index.astro         ← home: two-col list + preview pane + inline transition + TUNING panel
    work/[slug].astro    ← static case-study pages (deep-link fallback for the inline detail)
    cv.astro             ← CV (data-driven arrays in frontmatter)
    about.astro, connect.astro
  lib/
    arc-flip.ts          ← reusable FLIP/spring/easing motion primitive
    reveal.ts            ← site-wide fade+blur reveal / proximity cascade / page-exit
  styles/global.css      ← tokens, type, layout, case-study layout kit, reveal CSS
public/
  fonts/                 ← Geist Regular/Medium/SemiBold woff2
  images/work/<slug>/    ← case-study images (migrated from the Webflow export)
  videos/work/luxem/     ← Luxem background video
```

## 4. The motion system (the core IP — keep this intact)

Site-wide rule: **nothing appears or vanishes instantly.** Everything fades with a
slight blur; interactions propagate by **proximity**; loads cascade **in sequence**.

### `src/lib/arc-flip.ts`
- `arcFlip(el, fromRect, opts)` — FLIP an element from a measured rect to its current
  laid-out box via WAAPI keyframes. Options: `duration, delay, easing, arc` (downward
  "yield" bow as a fraction of travel — the yield rides *eased* progress so it settles
  softly), `minYield, scale, samples`. Clears its own inline styles on finish/cancel.
- `concert(anims)` — run several together, resolve when all settle.
- `easings` — full Penner set (sine/quad/cubic/quart/quint/expo/circ/back/elastic/bounce
  ×in/out/inOut) + soft-landing beziers (`glide`, `softLand`, `decelerate`, `gentle`).
- `makeSpring({stiffness,damping,mass})` — damped-spring integrator pre-sampled into an
  easing. Defaults `410/84/3` match the menu/pill rollover physics.
- `cubicBezier(x1,y1,x2,y2)` — CSS-style bezier → easing fn.

### `src/lib/reveal.ts`
- `staggerOut(els, {origin})` / `staggerIn(els, {origin})` — fade+blur out/in, ordered by
  **proximity to `origin`** (nearest first). Pure opacity+blur (no transform → never
  disturbs layout/measurements).
- `revealOnLoad()` — fades+blurs `[data-reveal]` and `[data-reveal-children] > *` in,
  top-down, then adds `.revealed` to `<html>` (CSS stops hiding). 4s failsafe.
- `pageExit(href, origin)` — site-wide exit: fade+blur the page out (rippling from the
  clicked link), then navigate. Caps total stagger spread (~160ms) so big pages exit fast.

### Homepage inline transition (`index.astro`, 2nd `<script>`)
Clicking a project: the other rows **cascade out by proximity**, the clicked row **rises**
and becomes the page heading (held in place, not morphed), its **cover FLIPs from the
preview pane into a full-width header** (arcing downward to yield so it never crosses the
title's path), and the case-study body **staggers in**. Close reverses softly. A
generation **token** + `closing`/`busy` flags + `window.__leroiceBusy` (read by the Base
exit handler) keep it interruptible and conflict-free.

`CHOREO` (baked defaults, tuned via the panel; localStorage overrides per browser):
```js
const CHOREO = {
  leadIn: 0, easing: 'gentle',
  spring: { stiffness: 900, damping: 160, mass: 0.5 },
  title: { duration: 1000, delay: 0, arc: 0, scale: false },
  image: { duration: 980, delay: 0, arc: 0.1, minYield: 58, scale: true },
  stagger: { step: 15, blur: 6, outDuration: 340 },
};
```

### TUNING panel (sandbox-only)
Bottom-right `TUNING` button on the homepage opens a live panel: sliders for lead-in,
durations, image delay/arc/minYield, cascade step/blur, an easing dropdown (incl.
`spring` with stiffness/damping/mass), plus **Replay / Copy / Reset**. Writes the live
`CHOREO` + localStorage. **Gate or remove before promoting to the real domain** (search
`data-tuner` / `.tuner` in `index.astro`).

### Other site-wide rules
- **Alignment:** `--content-pad` token (`side-pad + sp-base`) aligns every page's content
  L/R with the nav brand. Applied to nav, split (right), footer, `.detail`, `.cv`.
- **Fonts:** `font-display: optional` + preload of Regular/Medium so Geist renders on
  first paint with no swap-jump. `scrollbar-gutter: stable` prevents sideways shift.
- **Nav reveal fix:** cross-document navigations hold first paint (skipping a JS entrance),
  so the reveal starts on `pageshow` for navigations and immediately for reloads.

## 5. Content model

`src/content/work/<slug>.md` frontmatter (`src/content/config.ts`):
`title, year, context, summary, order` (1 = top), `detail` (true → inline transition +
`/work/[slug]` page), `external` (optional URL), `cover`, `coverAlt`.

**Case-study layout kit** (use raw HTML in the markdown body — images live outside `<p>`
so they span full width; prose stays markdown and is held to a readable measure):
- `<figure class="cs-full"><img/></figure>` — full-width single (or `<video>`)
- `<div class="cs-mocks"> 4× <img> </div>` — phone-mockup row (responsive 4→2→1)
- `<div class="cs-3"> 3× <img> </div>` — three-up / bento
- `<div class="cs-2"> 2× <img> </div>` — two-up

### Project status
| Project | order | detail | content | notes |
|---|---|---|---|---|
| AU multicurrency wallet (wu-au-wallet) | 1 | yes | placeholder | **placeholder SVG cover** `/images/work/wu-au-wallet.svg`; needs real content + cover |
| Meddle | 2 | yes | placeholder | current work, no old content |
| ANZ Plus | 3 | yes | migrated | mockup row + full shots + bento + type/icons |
| Luxem | 4 | yes | migrated | header + mocks + moodboard + **video** |
| Ghost VC | 5 | yes | migrated | mocks; Lottie logo omitted (md renders img/video only) |
| LifeSpaceJourney | 6 | yes | migrated | hero + 3-up + pairs |
| CACNA-1a | 7 | yes | migrated | father–son 3D/NFT project |

Migrated content came from `~/Developer/leroice-portfolio` (Webflow export): real copy,
project-info, external links, 37 image/video assets copied into `public/`.
**About** and **CV** are current (built from Figma + session) — the old export's About is
stale (still lists ANZ Plus as current; he's now at Western Union).

## 6. Figma redesign loop (the next phase)

Intent: **redesign the page layouts in Figma, then rebuild here.**

> ⚠️ Pushing pages *into* Figma programmatically is **blocked**: the connected Figma MCP is
> read-only (Dev Mode — `get_design_context`/`get_screenshot`/`get_metadata`/`get_variable_defs`).
> There is no `use_figma` write tool connected. To auto-generate frames, connect a Figma
> **write** integration (the one exposing `use_figma`, e.g. the Figma MCP write/plugin), then
> the `figma:figma-generate-design` skill can build the pages. Otherwise redesign manually in
> Figma using the per-page spec below; hand the redesigned frames (node IDs) back and I'll
> rebuild — the read MCP can pull design context to implement.

### Per-page layout spec (current build — redesign target)
- **Home (`index.astro`)** — desktop two-column: tight project list (left, ~22rem) + a
  mouse-tracked preview pane (right, 16/10 cover, slow ~520ms catch-up). Pill highlight
  behind the hovered row (spring physics, gooey). Mobile (<881px): single column, preview
  dropped, cover stacked under each row. Clicking a project runs the inline transition.
- **Work detail (`work/[slug].astro` + inline)** — heading (title + `year · context`),
  full-width cover hero, then the case-study layout kit (mockup rows / grids / full / video),
  prose held to ~44rem, ending in a "Project info" list. Content area is page-max wide.
- **CV (`cv.astro`)** — left label rail + right content per section: profile, selected
  impact (stat grid), current, prior (role + bullets), core skills (chips), education &
  awards. Data-driven from frontmatter arrays. Built from Figma nodes `32:124` (light) /
  `32:125` (dark).
- **About / Connect** — `.detail` prose pages.

### Design tokens (in `global.css :root`)
- Color: `--text-primary` #24221B / `--bg` #FAFAF7 (light); #F2EFE8 / #14130F (dark).
  Opacity steps `--op-strong` .7, `--op-soft` .5. `--rule` hairline.
- Type: Geist; sizes `--fs-meta` 11px, `--fs-sm` 14px, `--fs-name` 17px, `--fs-h1` 32px;
  `--tracking-tight` -0.43px.
- Layout: `--page-max` 76rem, `--side-pad` 2rem, `--content-pad` (=side-pad+16px), `--radius-md` 12px.
- Theme toggles via `data-theme` on `<html>` (footer button, localStorage, prefers-color-scheme).

## 7. Open items / TODO
- [ ] **Figma:** connect a write integration to auto-push pages (or redesign manually per §6).
- [ ] **Meddle & WU:** real case-study content; replace WU placeholder SVG cover.
- [ ] **Years:** Ghost (2022), LifeSpaceJourney (2021), Luxem (2023) are placeholders to confirm.
- [ ] **Ghost Lottie logo:** omitted; add via a small component if wanted.
- [ ] **TUNING panel:** gate/remove before the real launch.
- [ ] **Bento / full-bleed:** grids are clean 3-up with natural heights; could go true bento /
      viewport-edge full-bleed if desired.
- [ ] `preview.html` (916 KB) in the repo is an unused export artifact — can be removed.
- [ ] Not near launch — lots of content still to load.

## 8. Conventions / gotchas
- Bash cwd resets between calls — use absolute paths / `cd … &&`.
- The harness preview tool is sandboxed to a different folder, so this project can't be
  screenshotted in-session; verify visually in a browser at `26.leroice.com`.
- Reduced-motion and mobile have explicit fallbacks throughout the motion system.
- Latest commit at handoff: case-study layouts (`c815b5f`).
