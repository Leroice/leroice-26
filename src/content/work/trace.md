---
title: "Trace"
year: "2026"
context: "iPad, iPhone, AI"
summary: "A handwriting app I built for my son Charlie. He says a phrase, traces it in his school's handwriting with Apple Pencil, and gets a sticker of what he said. Built with Claude, from an empty folder to TestFlight in three weeks."
order: 2
detail: true
cover: "/images/work/trace/trace-hero-desktop.jpg"
coverAlt: "Trace on iPad, writing Dog on the moon in blue joined handwriting"
coverPhone: "/images/work/trace/trace-hero-phone.jpg"
heroSquare: true
---

Trace is a handwriting app I built for my son Charlie. He says a phrase, the words appear in the handwriting his school teaches, and he traces over them with Apple Pencil. When he finishes, he gets a sticker of what he said.

It covers all five Australian school handwriting styles, joined and unjoined. For Victoria and Queensland it can also write each word itself, letter by letter, in the right stroke order. That stroke data is generated from the fonts: read straight off the dotted font for Victoria, and worked out from the plain letter outlines for Queensland. All 52 Queensland letters pass a checker against the outlines.

The sticker is made on the iPad. Apple's on-device model rewrites the phrase into a picture prompt while Charlie traces, Image Playground draws it, and Vision cuts the subject out. If a picture can't be made, he's asked to draw it himself instead.

<figure class="cs-full cs-ipad"><video src="/videos/work/trace/trace.mp4" poster="/videos/work/trace/trace-poster.webp" muted loop playsinline preload="none" data-autoplay aria-label="Trace on iPad: a phrase becomes a trace sheet, the app writes it letter by letter, then it's traced over in red"></video><img src="/images/work/trace/ipad-bezel.png" alt="" /></figure>

<div class="cs-2">
  <img class="cs-wide" src="/images/work/trace/ipad-sheet.png" alt="A Trace sheet for Dog on the moon in dotted joined handwriting" />
  <img src="/images/work/trace/ipad-letter.png" alt="Trace showing how to write the letter e" />
  <img src="/images/work/trace/ipad-say.png" alt="Dog on the moon typed into the Trace input bar" />
</div>

<figure class="cs-full"><img src="/images/work/trace/ipad-first-build.png" alt="The first build of Trace: a form to say a phrase, pick letters and line style, then make a tracing sheet" /></figure>

I built it with Claude from an empty folder on 4 August 2026. It went to TestFlight three days later and reached build 19 by the end of the month. It's SwiftUI with PencilKit, SwiftData, Speech and Vision, about 20,000 lines of Swift.

## Project info

- **Role:** Design, code
- **Responsibilities and deliverables:** Product design, design system, iPad and iPhone app
- **Built with:** Claude Code, SwiftUI, PencilKit, Apple Foundation Models, Image Playground, Vision
- **Status:** TestFlight
