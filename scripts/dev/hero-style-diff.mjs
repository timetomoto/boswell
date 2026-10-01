/*
 * Astro-CSS trial verification.
 * Pair the WP hero DOM against the Vercel Astro build by Astro class name
 * (.hero, .hero__title, .hero__subtitle, .hero__eyebrow, .hero__image,
 * .hero__tint, .hero__scrim, .hero__frame, .hero__glyph), read a fixed
 * computed-style set from each, and report every mismatch at both 1440
 * and 390.
 *
 * Usage: node scripts/dev/hero-style-diff.mjs
 * Output: prints a table per page + saves JSON detail under
 *   _screens/astro-css-trial/<page>-<vw>.json
 */

import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../../_screens/astro-css-trial');
mkdirSync(OUT, { recursive: true });

const ASTRO = 'https://boswell-poc.vercel.app';
const WP = 'http://localhost:8888';

const ROUTES = ['/sisters/', '/media/', '/press/', '/about/'];

const PROPS = [
  'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing',
  'color', 'background-color', 'background-image', 'mix-blend-mode', 'opacity',
  'min-height', 'height', 'width', 'max-width',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'margin-top', 'margin-inline-start', 'margin-inline-end',
  'text-align', 'text-transform', 'display', 'position', 'z-index', 'inset',
  'filter', 'object-fit', 'object-position',
];

const SELECTORS = [
  '.hero',
  '.hero__image',
  '.hero__tint',
  '.hero__scrim',
  '.hero__frame',
  '.hero__frame-corner--tl',
  '.hero__content',
  '.hero__eyebrow',
  '.hero__title',
  '.hero__subtitle',
  '.hero__glyph',
];

function chromePath() {
  const paths = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ];
  for (const p of paths) if (existsSync(p)) return p;
  throw new Error('Chrome not found');
}

async function collect(page, url, vw) {
  await page.setViewportSize({ width: vw, height: 900 });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
  return page.evaluate(({ selectors, props }) => {
    const out = {};
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (!el) { out[sel] = null; continue; }
      const cs = getComputedStyle(el);
      const bag = {};
      for (const p of props) bag[p] = cs.getPropertyValue(p).trim();
      out[sel] = bag;
    }
    return out;
  }, { selectors: SELECTORS, props: PROPS });
}

function diff(a, b) {
  const rows = [];
  for (const sel of SELECTORS) {
    const A = a[sel], B = b[sel];
    if (!A && !B) continue;
    if (!A) { rows.push({ sel, prop: '(missing in astro)', a: '-', b: 'present' }); continue; }
    if (!B) { rows.push({ sel, prop: '(missing in wp)', a: 'present', b: '-' }); continue; }
    for (const p of PROPS) {
      if ((A[p] || '') !== (B[p] || '')) rows.push({ sel, prop: p, a: A[p], b: B[p] });
    }
  }
  return rows;
}

async function main() {
  const browser = await chromium.launch({ executablePath: chromePath() });
  const page = await browser.newContext({ deviceScaleFactor: 1 }).then(c => c.newPage());
  const summary = [];
  for (const route of ROUTES) {
    for (const vw of [1440, 390]) {
      const astro = await collect(page, `${ASTRO}${route}`, vw);
      const wp = await collect(page, `${WP}${route}`, vw);
      const rows = diff(astro, wp);
      const slug = route.replace(/\//g, '').trim() || 'home';
      const file = `${OUT}/${slug}-${vw}.json`;
      writeFileSync(file, JSON.stringify({ route, vw, astro, wp, diff: rows }, null, 2));
      console.log(`\n=== ${route} @ ${vw} — ${rows.length} mismatch(es)`);
      for (const r of rows) console.log(`  ${r.sel}[${r.prop}]  astro="${r.a}"  wp="${r.b}"`);
      summary.push({ route, vw, mismatches: rows.length });
    }
  }
  writeFileSync(`${OUT}/summary.json`, JSON.stringify(summary, null, 2));
  console.log('\n=== summary');
  for (const s of summary) console.log(`  ${s.route} @ ${s.vw}: ${s.mismatches} mismatch(es)`);
  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
