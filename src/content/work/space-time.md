---
title: "Space/Time"
year: "2026"
context: "iPhone, AI"
summary: "A relationship timing app built on astrology, written for people who don't know astrology. Built with Claude in two weeks: planet positions checked against NASA data, a sky drawn in Metal, and a view that opens onto the real night sky."
order: 5
detail: true
cover: "/images/work/space-time.jpg"
coverAlt: "Space/Time on iPhone: your chart and Sam’s laid over each other, tilted back, with the lines between you"
---

Space/Time is a relationship app built on astrology, for people who don't know astrology. It helps you see when it's a good time to talk, to be close or to give space. What's measured and what it's said to mean are kept apart, and nothing promises destiny.

<div class="cs-3">
  <div class="cs-iphone"><video src="/videos/work/space-time/intro.mp4" poster="/videos/work/space-time/intro-poster.webp" muted loop playsinline preload="none" data-autoplay aria-label="The opening: a star drifting through life, love and loss"></video><img src="/images/work/space-time/iphone-bezel.png" alt="" /></div>
  <div class="cs-iphone"><video src="/videos/work/space-time/home.mp4" poster="/videos/work/space-time/home-poster.webp" muted loop playsinline preload="none" data-autoplay aria-label="Home: your chart drawn as a disc, with what is happening in the sky below it"></video><img src="/images/work/space-time/iphone-bezel.png" alt="" /></div>
  <div class="cs-iphone"><video src="/videos/work/space-time/sign.mp4" poster="/videos/work/space-time/sign-poster.webp" muted loop playsinline preload="none" data-autoplay aria-label="Flying into Gemini, where your Sun sits, then pulling up the sheet about the sign"></video><img src="/images/work/space-time/iphone-bezel.png" alt="" /></div>
</div>

The planet positions are calculated on the phone and checked against 1,750 positions from NASA's JPL Horizons, each within 0.05°. Only chart facts can move a compatibility score. The weights follow traditional sources, never anyone's real relationships.

<div class="cs-3">
  <div class="cs-iphone"><video src="/videos/work/space-time/you-and-sam.mp4" poster="/videos/work/space-time/you-and-sam-poster.webp" muted loop playsinline preload="none" data-autoplay aria-label="Opening You, then laying Sam’s chart over yours with the lines between you"></video><img src="/images/work/space-time/iphone-bezel.png" alt="" /></div>
  <div class="cs-iphone"><video src="/videos/work/space-time/then-now.mp4" poster="/videos/work/space-time/then-now-poster.webp" muted loop playsinline preload="none" data-autoplay aria-label="Moving the planets from the day you were born to now"></video><img src="/images/work/space-time/iphone-bezel.png" alt="" /></div>
  <div class="cs-iphone"><video src="/videos/work/space-time/venus-retrograde.mp4" poster="/videos/work/space-time/venus-retrograde-poster.webp" muted loop playsinline preload="none" data-autoplay aria-label="Venus retrograde playing out over its three months"></video><img src="/images/work/space-time/iphone-bezel.png" alt="" /></div>
</div>

The sky is drawn in Metal. Lean back and point the phone up, and the screen opens onto the real night sky where you're standing, with the constellations lit in star dust. Getting it to sit still on a real phone meant one motion manager for the whole app, locked to true north, with the field of view matched to the camera.

<figure class="cs-full"><img src="/images/work/space-time/sky-sequence.jpg" alt="The sky moving from Virgo through Libra to Scorpio as it lights up in star dust" /></figure>

<figure class="cs-full"><img src="/images/work/space-time/sky-looks.jpg" alt="Three looks for the sky: nebula, bokeh and light bleed" /></figure>

To work out how the AR sky should look, I built Galaxy Studio, a Mac tool for testing ideas and styles. While the app built in the background, I could change the galaxy in detail: its smoke particles, wind, lighting and tracking.

I built it with Claude over two weeks in October 2026, with several sessions working in parallel, each owning one part: the sky, the astrology, compatibility and research. Every decision went into a dated log. The first version reached 354 commits in its first week. The current version is a calmer rebuild on the same engine.

## Project info

- **Role:** Design, code
- **Responsibilities and deliverables:** Product design, design system, illustration, iPhone app
- **Built with:** Claude Code, SwiftUI, Metal, CoreMotion, Swift Charts, Apple Foundation Models
- **Status:** In development
