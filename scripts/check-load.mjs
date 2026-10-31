/* ───────────────────────────────────────────────────────────
   check-load — guards the page-load motion against the reload flicker.

   Run after a build:  npm run check:load

   1. The head paints the page colour before global.css arrives, with the
      same values as --bg (light and dark).
   2. Reload and back/forward visits settle: every on-screen block is at
      full opacity from the first frame and never fades. (Hiding content
      the browser was just showing reads as a flicker.)
   3. Arrivals fade in, and the fade starts only after the load event, so
      Safari has the page on screen before it runs (on iPhone an earlier
      start is mostly spent before the first frame shows).

   Runs WebKit at desktop and iPhone sizes against `astro preview`. Needs
   the WebKit build: npx playwright-core install webkit
   ─────────────────────────────────────────────────────────── */

import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { webkit, devices } from 'playwright-core';

const PORT = 4398;
const BASE = `http://localhost:${PORT}`;
const PAGES = ['/', '/work/trace'];
const VIEWPORTS = {
  desktop: { viewport: { width: 1440, height: 900 } },
  iphone: devices['iPhone 15'],
};

const failures = [];
const check = (ok, label) => {
  console.log(`${ok ? 'pass' : 'FAIL'}  ${label}`);
  if (!ok) failures.push(label);
};

/* 1. Page colour in the head ─────────────────────────────── */

const css = readFileSync('src/styles/global.css', 'utf8');
const lightBg = css.match(/:root\s*{[^}]*?--bg:\s*(#[0-9A-Fa-f]{6})/)?.[1];
const darkBg = css.match(/prefers-color-scheme: dark\)\s*{\s*:root\s*{[^}]*?--bg:\s*(#[0-9A-Fa-f]{6})/)?.[1];
const html = readFileSync('dist/index.html', 'utf8');
const head = html.slice(0, html.indexOf('</head>'));
const sheetAt = head.indexOf('rel="stylesheet"');
const styleAt = head.search(/<style>\s*html\s*{\s*background:/);
const inlineStyle = styleAt >= 0 ? head.slice(styleAt, head.indexOf('</style>', styleAt)) : '';
check(/<meta name="color-scheme" content="light dark">/.test(head), 'head declares color-scheme light dark');
check(styleAt >= 0 && (sheetAt < 0 || styleAt < sheetAt), 'page colour is inlined before the stylesheet');
check(!!lightBg && inlineStyle.toLowerCase().includes(lightBg.toLowerCase()), `inline light colour matches --bg ${lightBg}`);
check(!!darkBg && inlineStyle.toLowerCase().includes(darkBg.toLowerCase()), `inline dark colour matches --bg ${darkBg}`);

/* 2 and 3. Motion on reload and on arrival ───────────────── */

// Records, every frame, the lowest opacity among on-screen reveal blocks,
// plus when load fired and whether the page was settled.
const probe = () => {
  const rec = (window.__loadProbe = { frames: [], loadAt: null });
  addEventListener('load', () => { rec.loadAt = performance.now(); });
  const tick = () => {
    const items = document.querySelectorAll('[data-reveal], [data-reveal-children] > *');
    // `min` covers every block with any part on screen; `top` is the
    // topmost one, which leads the arrival cascade.
    let min = 1, seen = 0, top = null;
    for (const el of items) {
      const r = el.getBoundingClientRect();
      if (r.bottom <= 0 || r.top >= innerHeight || !r.height) continue;
      const o = parseFloat(getComputedStyle(el).opacity);
      if (!seen++) top = o;
      min = Math.min(min, o);
    }
    const wipe = document.querySelector('.detail__body[data-wipe]');
    rec.frames.push({
      t: performance.now(),
      min: seen ? min : null,
      top,
      settled: document.documentElement.classList.contains('settled'),
      wipeMask: wipe ? getComputedStyle(wipe).maskImage || getComputedStyle(wipe).webkitMaskImage : null,
    });
    if (performance.now() < 2500) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

const server = spawn('npx', ['astro', 'preview', '--port', String(PORT)], { stdio: 'ignore' });
const stop = () => server.kill();
try {
  for (let i = 0; ; i++) {
    try { if ((await fetch(BASE)).ok) break; } catch {}
    if (i > 60) throw new Error('astro preview did not start');
    await new Promise((r) => setTimeout(r, 250));
  }

  const browser = await webkit.launch();
  for (const [name, device] of Object.entries(VIEWPORTS)) {
    for (const path of PAGES) {
      const ctx = await browser.newContext(device);
      const page = await ctx.newPage();
      await page.addInitScript(probe);
      const where = `${name} ${path}`;

      // Arrival.
      await page.goto(BASE + path);
      await page.waitForTimeout(2700);
      let rec = await page.evaluate(() => window.__loadProbe);
      const shown = rec.frames.filter((f) => f.top !== null);
      const fadeAt = shown.find((f) => f.top > 0.001 && f.top < 0.999)?.t;
      check(shown[0]?.top === 0, `${where} arrival: content starts hidden`);
      check(fadeAt !== undefined && rec.loadAt !== null && fadeAt >= rec.loadAt,
        `${where} arrival: fade starts after load (load ${Math.round(rec.loadAt)}ms, fade ${Math.round(fadeAt ?? -1)}ms)`);
      check(shown.at(-1)?.top === 1, `${where} arrival: content ends fully shown`);

      // Reload.
      await page.reload();
      await page.waitForTimeout(2700);
      rec = await page.evaluate(() => window.__loadProbe);
      const first = rec.frames[0];
      const dipped = rec.frames.some((f) => f.min !== null && f.min < 1);
      check(first?.settled === true, `${where} reload: page is settled before first frame`);
      check(!dipped, `${where} reload: on-screen content never dips below full opacity`);
      if (first?.wipeMask !== null && first?.wipeMask !== undefined) {
        check(first.wipeMask === 'none', `${where} reload: case-study body has no wipe mask`);
      }
      await ctx.close();
    }
  }
  await browser.close();
} finally {
  stop();
}

if (failures.length) {
  console.error(`\n${failures.length} check(s) failed.`);
  process.exit(1);
}
console.log('\nAll load checks passed.');
