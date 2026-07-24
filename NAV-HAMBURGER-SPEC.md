**leroice.com — Mobile nav: hamburger menu**

`.nav` in `Base.astro` currently has zero responsive treatment — brand + 3 links (About/Connect/CV) sit in one row with no breakpoint, no wrap rule, and no per-link tap-area padding. Below 880px, collapse the inline links into a hamburger-triggered dropdown, and fix the tap-target sizing as part of the same change.

**Scope:** `src/layouts/Base.astro` + `src/styles/global.css`. No new libraries, no framework — matches the rest of the site (Astro + vanilla CSS + a small inline script, same pattern as the theme toggle already in `Base.astro`).

**Requirements**

1. Breakpoint: reuse the existing `880px` tablet breakpoint (same point `.split`, `.detail__body`, `.cv-section`, `.sg` already collapse at) — now available as `@media (--bp-tablet)` per `MOBILE-PLAN.md`'s P5 (custom-media tokens in `global.css`). No new breakpoint.
2. Below 880px: hide the inline `.nav__links` row, show a hamburger toggle button in its place. Brand (`Leigh Scholten. Designer`) stays visible and in position at all widths.
3. Tap the toggle → a dropdown panel opens below the nav, containing the same three links (About/Connect/CV) stacked vertically. Rest of the page stays visible underneath (not a full-screen takeover).
4. Each link in the dropdown gets its own padded tap area — minimum 44px height per link, not just the 14px text line it is today.
5. Icon: hamburger (☰) morphs to a close (✕) state while open — same button, `aria-expanded` toggles `true`/`false`.
6. Closing triggers: tap the toggle again, tap any link in the panel, tap outside the panel, or press Escape.
7. At ≥880px, behavior is unchanged — inline `.nav__links` row, no toggle, no panel in the DOM's visible state.

**Motion**

Match the site's existing fade-from-blur idiom (see `dialog.unlock`'s `unlock-in`/`unlock-out` keyframes in `global.css` for the reference pattern) rather than a slide or instant show/hide.

- Open: opacity `0→1`, `filter: blur(6px) → blur(0)`, ~240ms, `var(--image-ease)`.
- Close: reverse of open, ~200ms.
- Respect `prefers-reduced-motion: reduce` — panel appears/disappears instantly, no blur/opacity transition (same override pattern already used elsewhere in `global.css`).

**Acceptance**

- At ≥880px, nav is pixel-identical to today — no toggle button rendered/visible, no layout shift.
- At <880px, brand stays put, hamburger toggle replaces the inline links, panel opens/closes per the triggers above.
- Every link in the open panel has a real ≥44px tap target.
- Keyboard: toggle is reachable and operable via Tab/Enter/Space; Escape closes the panel and returns focus to the toggle; focus doesn't get trapped or lost.
- `aria-expanded` on the toggle reflects open/closed state; panel is hidden from the accessibility tree when closed.
- Reduced-motion users get an instant toggle, no animation.
