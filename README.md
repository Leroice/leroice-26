# leroice.com

Portfolio of Leigh Scholten. Built with [Astro](https://astro.build), deployed to Vercel.

## Run locally

```sh
npm install
npm run dev
```

Then open <http://localhost:4321>.

## Build

```sh
npm run build
npm run preview
```

## Architecture

Two-column index page on desktop — a tight list of projects on the left, a mouse-tracked preview pane on the right. The preview shows the cover image of whichever project the cursor is hovering, and translates within a ±16px envelope as the cursor moves through the row. Slow easing (~520ms, soft ease-out) gives it a fluid, catching-up feel rather than 1:1 follow.

On mobile (<881px), the preview pane is dropped entirely and each project shows its cover image stacked beneath the row.

Three projects (WU AU wallet, ANZ Plus design system, ANZ Plus product) have full case study pages at `/work/[slug]`. The remaining four are index-only.

## Adding a project

Drop a new `.md` file into `src/content/work/`. Frontmatter schema is in `src/content/config.ts`.

```yaml
---
title: "Project name"
year: "2026"
context: "Client · Surface, Surface"
summary: "One-line description shown on the index list."
order: 1                        # lower = higher on the page
detail: true                    # true → has /work/[slug] page
cover: "/images/cover.png"      # path under /public/
coverAlt: "Alt text"
# optional:
external: "https://..."         # links to URL instead of detail page
---

Body content here renders on the detail page if detail: true.
```

## Structure

```
src/
  content/
    config.ts          ← schema definition
    work/              ← one markdown file per project
  layouts/
    Base.astro         ← <html>, head meta, nav, footer, theme bootstrap
  pages/
    index.astro        ← landing — two-column split with preview pane
    about.astro        ← about page
    connect.astro      ← contact page
    work/[slug].astro  ← dynamic detail pages
  styles/
    global.css         ← tokens, type scale, layout, animation
public/
  fonts/               ← Roobert + Geist Mono .woff2
  images/              ← project covers
  videos/              ← .mp4 / .mov for interaction demos
  documents/           ← CV PDF
```

## Fonts

Drop these into `public/fonts/`:

- `Roobert-Regular.woff2`
- `Roobert-Medium.woff2`
- `Roobert-SemiBold.woff2`
- `GeistMono-Regular.woff2`

Roobert: licensed from [Displaay Type Foundry](https://displaay.net/typeface/roobert/).
Geist Mono: free under the OFL — <https://github.com/vercel/geist-font>.

If you don't have Roobert handy, change `--font-sans` in `src/styles/global.css` to `'Inter', system-ui, ...` and add the Google Fonts link to `Base.astro`. Visually almost identical.

## Mouse-tracking spec

In `src/pages/index.astro`:

- `TRACK = 16` — the px envelope on each axis
- Transition is `transform 520ms cubic-bezier(0.16, 1, 0.3, 1)`
- Cover image cross-fade is `opacity 520ms` with the same easing
- Skipped on touch devices (`(hover: none)`) and when `prefers-reduced-motion: reduce`

Adjust `TRACK` to tune the tracking distance; adjust the `transition` durations in `global.css` (`.preview__frame`, `.preview__image`) to tune the speed of the catch-up.

## Theme

Respects `prefers-color-scheme` by default. The `theme` button in the footer toggles an explicit override, stored in `localStorage`. Inline script in `<head>` prevents the dark-mode flash on load.

## Deploy

```sh
vercel
```

Or push to GitHub and connect via the Vercel dashboard. No build config required — Vercel auto-detects Astro.
