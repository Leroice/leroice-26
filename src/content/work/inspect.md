---
title: "Inspect"
year: "2026"
context: "Design tool, AI"
summary: "A Figma-style inspector that runs on a live website. You change spacing, type, colour and states on the real page, then send the changes to Claude Code as a list to apply in the source."
order: 4
detail: true
cover: "/images/work/inspect.jpg"
coverAlt: "Inspect open on a test site, with a layers tree on the left, a selected heading and the inspector panel on the right"
---

Inspect is a Figma-style inspector that opens on a running website. Press Option I, select anything on the page, and change it in a panel: position, auto layout, padding, radius, type, fills, effects and opacity. Colours come from the site's own tokens first.

Each element can have states, like hover, focus and pressed, with its own animation into each one: an easing, a custom curve or a spring. They play live on the page.

<figure class="cs-full"><img src="/images/work/inspect/panel-light.jpg" alt="Inspect's layers tree and inspector panel with a heading selected" /></figure>

Inspect never writes to the code itself. When you're done, it lists every change with before and after thumbnails, the element's selector, and the source file and line. You can save that list or send it straight to Claude Code, which applies it and reloads the page.

It runs as an Astro dev toolbar app, a local server for plain HTML and a Chrome extension. The core is plain TypeScript with no framework, so each new host only needs a small adapter. I built it with Claude in October 2026, and version 0.1 is with a couple of designers now.

## Project info

- **Role:** Design, code
- **Responsibilities and deliverables:** Product design, interaction design, TypeScript
- **Built with:** Claude Code, TypeScript, Astro
- **Status:** Version 0.1, private
