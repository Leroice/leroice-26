# Handoff — leroice.com

Written for whoever (Claude Code or otherwise) picks this up next. Covers where the code stands, how deployment works, and standing preferences worth knowing before touching anything.

## Project basics

- Astro static site (TypeScript, vanilla CSS with custom properties, no UI framework). Personal portfolio for Leigh Scholten.
- Repo: `github.com/Leroice/leroice-26`, branch `main`.
- Vercel project: `leroice-26` (team: `ls-2955's projects`), production domain `26.leroice.com`.
- `npm run dev` / `npm run build` / `npm run preview` — standard Astro scripts, nothing custom.
- Content model: `src/content/work/*.md` (Astro content collection `work`), rendered by `src/pages/index.astro` (home list + inline case-study transition) and `src/pages/work/[slug].astro` (deep-link case-study page).

## Deployment — auto-deploy from `main` (resolved 2026-09-20)

**Push to `main` and the site deploys itself.** The GitHub repo is connected to the Vercel project; production branch is `main`, fork protection on. No manual step is required, and `vercel --prod` should no longer be part of anyone's routine — reaching for it by habit is how the live site silently drifted behind `main` before.

This was blocked for a long time by a GitHub identity mismatch, recorded here so the same dead ends aren't re-walked:

- `Leroice/leroice-26` is owned by the **`Leroice` personal user account** (id 700842) — *not* an org, which is what earlier notes assumed. That assumption sent troubleshooting toward org-settings paths that don't exist for a user-owned repo.
- The Vercel account (`ls-2955`, ls@leroice.com) had been OAuth-linked to an unrelated GitHub account. `vercel git connect` therefore checked write access as the wrong identity and failed with `You need admin or write access to the repository "leroice-26" to link it. (400)`.
- **Diagnosing this from the CLI:** `GET https://api.vercel.com/v1/integrations/git-namespaces?provider=github` (bearer token from `~/Library/Application Support/com.vercel.cli/auth.json`) lists what the linked GitHub identity can actually see. It returned `[]` — no working link at all. That single call distinguishes "wrong account linked" from "app lacks repo access", which the 400 alone does not.
- Fix was two separate things, and **both are required** — doing only one reproduces the same 400:
  1. GitHub side: Vercel GitHub App installed with access to `leroice-26` (`github.com/settings/installations`).
  2. Vercel side: account-level GitHub OAuth link repointed to `Leroice` (`vercel.com/account/authentication`). Log the browser into the right GitHub account *first*, in a private window — otherwise the OAuth step silently reuses the existing session and nothing changes.
- Once `git-namespaces` returned `Leroice`, `vercel git connect --yes` succeeded immediately.

Verify the link at any time:
```
curl -s -H "Authorization: Bearer $TOK" \
  "https://api.vercel.com/v9/projects/$PROJECT_ID?teamId=$TEAM_ID" | jq .link
```

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
- **GitHub**: push access works over the HTTPS remote. Note the machine's keychain has served the wrong GitHub account here before, producing `Permission to Leroice/leroice-26.git denied to leroice-meddle`. If that returns, the repo-local fix is a credential helper that defers to the `gh` CLI's active account:
  ```
  git config --local --add credential.https://github.com.helper ""
  git config --local --add credential.https://github.com.helper "!gh auth git-credential"
  ```
  The empty first value clears inherited global helpers (osxkeychain) so the `gh` one actually wins. Check which account `gh` is active as with `gh auth status`.
- **Vercel**: the `vercel` CLI is logged in as `ls-2955` and is the fastest path for checking deploys (`vercel ls --prod`) — faster than the dashboard. Its token lives at `~/Library/Application Support/com.vercel.cli/auth.json` and works directly against `api.vercel.com` for anything the CLI doesn't surface. Tokens do expire; `vercel login` is an interactive browser flow an agent cannot complete, so that step has to go to Leigh.

## Preferences observed this session (worth internalizing)

- Very low tolerance for unrequested or invented design/behavior changes. Confirm scope before touching animation or UX, especially anything not explicitly covered by a supplied Figma link.
- No emojis in any design output, ever.
- No underlines anywhere unless explicitly specified.
- Wants concise, direct communication — minimal preamble, no padding.
