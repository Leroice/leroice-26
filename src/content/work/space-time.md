---
title: "Space/Time"
year: "2026"
context: "iPhone, AI"
summary: "A relationship timing app built on astrology, written for people who don't know astrology. Built with Claude in two weeks: planet positions checked against NASA data, a sky drawn in Metal, and a view that opens onto the real night sky."
order: 3
detail: true
cover: "/images/work/space-time.jpg"
coverAlt: "Two Space/Time screens: a timing view suggesting space with Sam tonight, and a timeline of sittings with a question box"
---

Space/Time is a relationship app built on astrology, for people who don't know astrology. It helps you see when it's a good time to talk, to be close or to give space. What's measured and what it's said to mean are kept apart, and nothing promises destiny.

The planet positions are calculated on the phone and checked against 1,750 positions from NASA's JPL Horizons, each within 0.05°. Only chart facts can move a compatibility score. The weights follow traditional sources, never anyone's real relationships.

The sky is drawn in Metal. Lean back and point the phone up, and the screen opens onto the real night sky where you're standing, with the constellations lit in star dust. Getting it to sit still on a real phone meant one motion manager for the whole app, locked to true north, with the field of view matched to the camera.

<figure class="cs-full"><img src="/images/work/space-time/sky-sequence.jpg" alt="The sky moving from Virgo through Libra to Scorpio as it lights up in star dust" /></figure>

<figure class="cs-full"><img src="/images/work/space-time/sky-looks.jpg" alt="Three looks for the sky: nebula, bokeh and light bleed" /></figure>

I built it with Claude over two weeks in October 2026, with several sessions working in parallel, each owning one part: the sky, the astrology, compatibility and research. Every decision went into a dated log. The first version reached 354 commits in its first week. The current version is a calmer rebuild on the same engine.

## Project info

- **Role:** Design, code
- **Responsibilities and deliverables:** Product design, design system, illustration, iPhone app
- **Built with:** Claude Code, SwiftUI, Metal, CoreMotion, Swift Charts, Apple Foundation Models
- **Status:** In development
