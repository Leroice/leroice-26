# Handoff — leroice.com

Written for whoever (Claude Code or otherwise) picks this up next. Covers where the code stands, an active deployment blocker, and standing preferences worth knowing before touching anything.

## Project basics

- Astro static site (TypeScript, vanilla CSS with custom properties, no UI framework). Personal portfolio for Leigh Scholten.
- Repo: `github.com/Leroice/leroice-26`, branch `main`.
- Vercel project: `leroice-26` (team: `ls-2955's projects`), production domain `26.leroice.com`.
- `npm run dev` / `npm run build` / `npm run preview` — standard Astro scripts, nothing custom.
- Content model: `src/content/work/*.md` (Astro content collection `work`), rendered by `src/pages/index.astro` (home list + inline case-study transition) and `src/pages/work/[slug].astro` (deep-link case-study page).

## Active blocker: Vercel isn't deploying

Local `main` and `origin/main` are both at commit `6923a2d` — the push succeeded, GitHub has the latest code. **Vercel's Production Deployment is still on an old commit (`5caa8dc`, Jun 24)** because the GitHub repo was never connected to this Vercel project.

What's been established:
- The Vercel account's linked GitHub identity is `leroice-meddle`. Its repo list (MeDS, leroice, design-system, MEDDLE-DS, meddle-design-system) does **not** include `leroice-26` — that repo lives under a different GitHub org, `Leroice` (capital L).
- Mid-troubleshooting, `leroice-meddle/leroice` (wrong repo) got connected by accident — this has been disconnected again. Project is currently in a clean, disconnected state.
- Tried "Add GitHub Account" to link an identity with access to the `Leroice` org — user hit a conflict during that OAuth step (exact wording not captured).

Next step (needs Leigh's GitHub login — cannot be completed by an agent without credentials):
1. `vercel.com/ls-2955s-projects/leroice-26/settings/git` → **GitHub** → account dropdown → **Add GitHub Account** → authorize whichever GitHub login has access to `Leroice/leroice-26`.
2. If it conflicts again: that likely means the target GitHub account is already linked to a *different* Vercel account. Check `github.com` → Settings → Applications → Vercel → Configure, to see what it's currently scoped to — or grant the Vercel GitHub App access to the `Leroice` org directly from GitHub's org settings.
3. Once the right account is connected, search `leroice-26` in the repo list and hit **Connect**. This deploys current `main` immediately and wires up auto-deploy for future pushes.
4. Fallback if you just need it live *now*: `vercel --prod` from the CLI (requires `vercel login`) — gets today's build out without fixing the underlying git connection, so the same problem will recur on the next push.

## What shipped in commit `6923a2d` (on GitHub, not yet live)

1. **`src/components/DetailSubnav.astro`** — new shared component (back-badge, title/subtitle, Details/Credits tabs). Used by both `[slug].astro` (deep link) and `index.astro`'s inline transition — the inline path previously had no subnav at all, just a bare back button.
2. **`src/lib/subnav-elastic.ts`** — WAAPI entrance animation ported from Figma node `169:1155` ("title + credits · elastic"): badge/title/subtitle/credits spring in as a staggered sequence. Signature is `subnavElasticEnter(root, { duration?, delay?, skip? })` so callers can retime or omit tracks.
3. **`index.astro`** — added a `CHOREO.subnav = { delay, durationScale }` block, wired into the live TUNING panel. The list → detail inline transition: every row (including the one clicked) fades out via the existing proximity cascade — nothing freezes in place or travels anywhere. `DetailSubnav` then plays its own unmodified `subnav-elastic` entrance underneath. See "Reverted approach" below for what *not* to redo.
4. **Typography/color**, synced twice against live Figma pulls of node `169:1155` (values changed between the two pulls — trust the latest, don't assume the first pull was final): title 14px / weight 500 / letter-spacing -0.43px / line-height 1; subtitle + credits tabs 11px / weight 400 / letter-spacing 0 / line-height 1 / `opacity: var(--op-soft)` (0.5); back-badge corner radius 12px (was 10px).
5. **Fixed a left-alignment bug** in the inline `DetailSubnav` — it was double-padded (its own `--content-pad` stacked on top of `.list__detail`'s padding), sitting ~32px right of where it should. Now matches `.nav`'s "Leigh Scholten." edge and the hero image exactly.
6. **Fixed the close-transition** — the subnav was fading as four separately-staggered elements (badge/title/subtitle/credits each with their own delay), reading as a mushy dissolve instead of one clean fade. Now fades as a single unit. Also fixed a stale `origin: row` reference in the close() proximity-stagger call — `row` is `display:none` at that point (zero rect), which was throwing the stagger ordering off.
7. Removed the one stray `text-decoration: underline` in the codebase (`.detail__body a`, case-study prose links).
8. `.gitignore`: added `.claude/` (local tooling config, not site code).

## Reverted approach — do not reintroduce without explicit sign-off

Earlier this session, the clicked row's title was made to arc-FLIP from its list position up into the DetailSubnav's title slot, with the row freezing in place as a heading. **This was not specified anywhere (not in the Figma link) and was explicitly rejected** — described as janky, invented behavior. It's been fully reverted. Standing instruction from the user: implement only what's explicitly specified, especially from a supplied Figma link — don't invent motion, layout, or interaction design unprompted. If a UX/behavior change isn't nailed down by the spec, list out the plan and confirm before touching code.

## Environment quirks hit this session (tooling, not the site)

- The sandboxed shell used for this session had a persistent `.git/index.lock` (and related `tmp_obj_*` / `HEAD.lock` files) that `rm` couldn't remove (`Operation not permitted`) but `mv` could. If a future sandboxed agent hits `fatal: Unable to create '.git/index.lock': File exists` here, try renaming the lock file out of the way before retrying — `git fsck` came back clean after doing this, so it's a sandbox/mount quirk, not real corruption or a real concurrent process.
- The real project's `node_modules` has macOS-only `@rollup/rollup-darwin-*` binaries. Running `astro build`/`check` from a Linux sandbox against it fails on a missing `@rollup/rollup-linux-*` module. Don't `npm install` directly into the real `node_modules` from a Linux sandbox to "fix" this — it'll swap in Linux binaries and break the local macOS dev environment. Copy the repo (excluding `node_modules`) to a scratch directory and `npm install` there instead.

## Separate in-flight task (not part of the code changes above)

Splitting a Western Union client asset dump (35+ frames — cards, screens, icons) out of the `leroice.com` Figma file into its own file: **"Western Union --- Assets --- v1.0"** (file key `4NFtGc12TTXTDDzRp88LlK`, in the `leroice` Figma team). The new file exists. User opted to move the "WU assets" page across manually via Figma's own "Duplicate to" (rather than a lossy programmatic export/import). Not yet confirmed complete — remaining steps: verify the page landed in the new file, delete it from `leroice.com`, final check both files.

## Figma reference

- File: `https://www.figma.com/design/h7LSto3kK3s1AdbA2w6MNU/leroice.com` (fileKey `h7LSto3kK3s1AdbA2w6MNU`)
- Node `169:1155` = "title + credits · elastic" — DetailSubnav's source of truth for type, color, and motion. Its static styles changed between two pulls in this same session, so re-pull fresh (`get_design_context` + `get_motion_context`) rather than trusting cached values.
- Figma's codegen returns React + Tailwind + `motion/react` — this project is Astro + vanilla CSS + raw WAAPI (`el.animate()`), so every pull needs manual translation, not verbatim use. `subnav-elastic.ts` and `arc-flip.ts` are the established patterns for this (sampled keyframe tracks baked from Figma's easing curves, played via native WAAPI).
- Naming/structure conventions for this Figma file (page order, frame naming, token naming) are defined by the `leroice-project-system` skill — apply automatically for anything Figma-related.

## MCP / tool access notes

- **Figma MCP**: used throughout this session for `get_design_context`/`get_motion_context`/`use_figma` pulls — working, no auth issue encountered.
- **GitHub**: push access confirmed working (HTTPS remote, though the sandboxed shell itself has no stored credentials — pushes were done from the user's own machine). The *Vercel* side's GitHub App connection is the actual blocker (see above), not repo access itself.
- **Vercel**: no CLI/API token available in-session; all diagnosis was done via the web dashboard through a browser tool. If Claude Code has `vercel` CLI access with a valid login, that's a more direct path for checking/fixing deploys than the dashboard.

## Preferences observed this session (worth internalizing)

- Very low tolerance for unrequested or invented design/behavior changes. Confirm scope before touching animation or UX, especially anything not explicitly covered by a supplied Figma link.
- No emojis in any design output, ever.
- No underlines anywhere unless explicitly specified.
- Wants concise, direct communication — minimal preamble, no padding.
