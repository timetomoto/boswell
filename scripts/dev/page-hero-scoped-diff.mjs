#!/usr/bin/env node
// Scoped computed-style comparison for the .page-hero region only.
// Pairs `.page-hero*` elements by class name and reports every property
// mismatch — used to verify the bozzies/page-hero block matches Astro.
//
// Usage:
//   node scripts/dev/page-hero-scoped-diff.mjs <wpUrl> <astroUrl> [--vw=1440]

import { chromium } from 'playwright-core';

const args = process.argv.slice(2);
const positional = args.filter(a => !a.startsWith('--'));
const flags = Object.fromEntries(args.filter(a => a.startsWith('--'))
  .map(a => { const [k, v = 'true'] = a.slice(2).split('='); return [k, v]; }));
const [wpUrl, astroUrl] = positional;
if (!wpUrl || !astroUrl) {
  console.error('usage: page-hero-scoped-diff.mjs <wpUrl> <astroUrl> [--vw=1440]');
  process.exit(2);
}
const vw = Number(flags.vw || 1440);
const vh = Number(flags.vh || 900);

const SELECTORS = [
  '.page-hero',
  '.page-hero .music-backdrop',
  '.page-hero__inner',
  '.page-hero__back',
  '.page-hero__eyebrow',
  '.page-hero__title',
  '.page-hero__subtitle',
];
const PROPS = [
  'display', 'position',
  'width', 'height', 'padding', 'margin',
  'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing',
  'text-transform', 'text-align', 'font-style',
  'color', 'background-color',
  'border-top-width', 'border-bottom-width',
  'max-width', 'overflow',
];

async function collect(page, url) {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 });
  await page.addStyleTag({ content: '*,*::before,*::after{animation-duration:0s!important;transition-duration:0s!important}' });
  await page.waitForTimeout(200);
  return await page.evaluate(({ SELECTORS, PROPS }) => {
    const rows = {};
    for (const sel of SELECTORS) {
      const el = document.querySelector(sel);
      if (!el) { rows[sel] = null; continue; }
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const s = { rect: { w: Math.round(r.width * 2) / 2, h: Math.round(r.height * 2) / 2 } };
      for (const p of PROPS) {
        let v = cs.getPropertyValue(p);
        if (typeof v === 'string' && v.endsWith('px')) {
          const n = parseFloat(v);
          if (Number.isFinite(n)) v = `${Math.round(n * 2) / 2}px`;
        }
        s[p] = v;
      }
      s['font-family'] = (s['font-family'] || '').split(',')[0].replace(/["']/g, '').trim();
      rows[sel] = s;
    }
    return rows;
  }, { SELECTORS, PROPS });
}

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const wp = await collect(page, wpUrl);
const astro = await collect(page, astroUrl);
await browser.close();

let real = 0;
const mm = [];
for (const sel of SELECTORS) {
  const w = wp[sel];
  const a = astro[sel];
  if (!w || !a) {
    if ((!!w) !== (!!a)) {
      mm.push({ sel, prop: 'presence', wp: w ? 'ok' : 'missing', astro: a ? 'ok' : 'missing' });
      real++;
    }
    continue;
  }
  for (const p of ['rect', ...PROPS]) {
    const wv = p === 'rect' ? `${w.rect.w}x${w.rect.h}` : w[p];
    const av = p === 'rect' ? `${a.rect.w}x${a.rect.h}` : a[p];
    if (wv !== av) {
      mm.push({ sel, prop: p, wp: wv, astro: av });
      real++;
    }
  }
}

console.log(`[page-hero scoped diff] vw=${vw} url=${wpUrl}`);
console.log(`  selectors checked: ${SELECTORS.length}`);
console.log(`  mismatches: ${mm.length}`);
for (const m of mm) console.log(`    ${m.sel}\t${m.prop}\twp=${m.wp}\tastro=${m.astro}`);
process.exit(real ? 1 : 0);
