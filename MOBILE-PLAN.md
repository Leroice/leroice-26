# leroice.com — mobile responsive plan

Audit of `leroice-26` against phone/tablet breakpoints, plus a punch list before touching code. Desktop is the baseline; this covers what's already handled vs. what's a real gap.

## Already covered

- **Two breakpoints exist and are used consistently**: `880px` (tablet — collapses `.split`, `.detail__body`, `.cv-section`, `.sg` to single column) and `520px` (phone — hero crops to portrait, case-study grids drop to 1-up).
- **Home page list↔detail transition already branches for mobile**: `BP_DESKTOP = 881` in `index.astro` skips the arc-FLIP/preview-pane choreography below that width and falls back to a plain opacity fade. Pointer devices are also separately gated via `hover: none`.
- **No cover thumbnails on mobile** — list is already text-only below 880px by design (`.row__media { display: none }`), preview pane hidden.
- Unlock dialog, CV stat grid, styleguide nav — all have explicit mobile rules already.

## Gaps

1. **`.nav` header has zero responsive treatment.** Brand (`Leigh Scholten. Designer`) + 3 links (About/Connect/CV) sit in one `justify-content: space-between` row with no wrap rule and no breakpoint at all in `global.css`. Untested below ~880px — likely fine at 390px, worth confirming at 360–375px (small Android / iPhone SE).
2. **Nav link tap targets are undersized for touch.** `.nav__links` has padding on the *container*, not per-link — each `<a>` is just 14px text with no individual hit-area padding. Below the ~44px recommended touch target.
3. **Lock affordance ("Unlock on request" label) is hover-only.** On touch, the row's padlock never shows the expanding label — only the bare icon renders, tap still opens the code dialog via the whole row, but the "this one's gated" signal is weaker on mobile than desktop.
4. **Breakpoint values are magic numbers repeated ad hoc** — `880px` and `520px` (plus one `480px` for CV stats) appear across ~7 separate `@media` blocks with no shared token/comment convention. Not broken, just no single source of truth if a breakpoint ever needs to shift.
5. ~~No spot-check below 520px for `.cs-mocks`/`.cs-3` case-study grids~~ — **checked, not actually a gap.** Re-read `global.css`: the `520px` query already collapses `cs-mocks`/`cs-3`/`cs-2` to a single column, so at 390px they're 1-up, not 2-up as originally assumed. No action needed.

## Suggested priority

1. Nav collapse/wrap behavior + tap-target sizing (P1 — every page, most visible)
2. Footer at narrow widths — quick check, likely fine, confirm not assume (P2)
3. Lock-affordance touch state decision (P3)
4. Case-study grid spot-check at 360–390px (P4)
5. Breakpoint documentation/consolidation — no visual change, just a comment block or shared constants so `880`/`520` aren't scattered magic numbers (P5)

## Decisions

- **Nav**: hamburger menu below the tablet breakpoint. Spec'd separately as `NAV-HAMBURGER-SPEC.md` (P1).
- **Lock affordance**: leave as-is — no touch-specific state.
- **Test matrix**: 390px is the reference width.
- **Breakpoint tokens**: open — needs its own discussion.

## P2 — Footer at 390px: verified, no gap

Built the site fresh (`npm install` + `npm run build` + preview server) and worked through the box model by hand at 390px (couldn't get a headless-browser screenshot in the audit sandbox — missing a system lib, `apt-get` blocked by the sandbox's network policy — so this was a manual box-model check, not a rendered screenshot).

`.foot` padding at 390px leaves ~294px of content width (`390 − content-pad(48px)×2`). "© 2026 Leigh Scholten" (~127px) + "theme" button (~30px) ≈ 157px combined — comfortably under 294px with room to spare either side of `space-between`. No wrap risk, no action needed.

## P4 — Case-study grids at 390px: verified, no gap

Corrected from the original audit: re-reading `global.css` shows the `520px` query already collapses `.cs-mocks`/`.cs-3`/`.cs-2` to a single column (not 2-up as first assumed). At 390px every case-study grid is already 1-up. No action needed — struck from the priority list.

## P5 — Breakpoint tokens: done

Decision: real single source of truth, not just a comment. Implemented with `postcss-custom-media` (Astro/Vite picks up `postcss.config.mjs` automatically — no Sass, no change to how CSS is authored otherwise):

- `postcss.config.mjs` — new file, registers the plugin.
- `package.json` — added `postcss` + `postcss-custom-media` to `devDependencies`.
- `src/styles/global.css` — added a `@custom-media` block up top (`--bp-tablet` 880px, `--bp-phone` 520px, `--bp-phone-sm` 480px) and swapped all 7 `@media (max-width: …)` call sites to reference them.

Validated in an isolated scratch build (separate from the real `node_modules`, per the sandbox/Linux-binary note in `HANDOFF.md`) — `@media (--bp-tablet)` compiles back to plain `@media(max-width:880px)` in the shipped CSS, byte-identical behavior to before.

**Still needed:** run `npm install` locally to pull in the two new devDependencies before the next `npm run dev`/`build` — this wasn't done automatically to avoid the macOS/Linux `node_modules` binary mismatch already documented in `HANDOFF.md`.

## Status

All 5 items closed except the actual nav build. Only remaining action item is P1 (nav hamburger) — spec is in `NAV-HAMBURGER-SPEC.md`, not yet built.
