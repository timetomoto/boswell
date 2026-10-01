/*
 * Astro-CSS style diff for the split hero on the home page.
 * Pairs the Vercel Astro build's DOM against the local WP by Astro class
 * name and reports every computed-style mismatch at 1440 + 390.
 *
 * Usage: node scripts/dev/hero-split-style-diff.mjs
 * Output: prints per-viewport tables + saves JSON detail under
 *   _screens/hero-split-verify/
 */

import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../../_screens/hero-split-verify');
mkdirSync(OUT, { recursive: true });

const ASTRO = 'https://boswell-poc.vercel.app';
const WP = 'http://localhost:8888';
const ROUTE = '/';

const PROPS = [
  'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing',
  'color', 'background-color', 'background-image', 'mix-blend-mode', 'opacity',
  'min-height', 'height', 'width', 'max-width',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'margin-top', 'margin-inline-start', 'margin-inline-end',
  'text-align', 'text-transform', 'display', 'position', 'z-index', 'inset',
  'filter', 'object-fit', 'object-position',
  'grid-template-columns', 'align-items', 'justify-content',
];

const SELECTORS = [
  '.hero.hero--split',
  '.hero__split',
  '.hero__image-panel',
  '.hero__image--split',
  '.hero__tint--gradient',
  '.hero__frame',
  '.hero__frame-corner--tl',
  '.hero__credit--split',
  '.hero__text-panel',
  '.hero__text-inner',
  '.hero__title--split',
  '.hero__subtitle--split',
  '.hero__glyph',
];

function chromePath() {
  const paths = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
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
  for (const vw of [1440, 390]) {
    const astro = await collect(page, `${ASTRO}${ROUTE}`, vw);
    const wp = await collect(page, `${WP}${ROUTE}`, vw);
    const rows = diff(astro, wp);
    const file = `${OUT}/home-${vw}.json`;
    writeFileSync(file, JSON.stringify({ route: ROUTE, vw, astro, wp, diff: rows }, null, 2));
    console.log(`\n=== ${ROUTE} @ ${vw} — ${rows.length} mismatch(es)`);
    for (const r of rows) console.log(`  ${r.sel}[${r.prop}]  astro="${r.a}"  wp="${r.b}"`);
    summary.push({ vw, mismatches: rows.length });
  }
  writeFileSync(`${OUT}/summary.json`, JSON.stringify(summary, null, 2));
  console.log('\n=== summary');
  for (const s of summary) console.log(`  @ ${s.vw}: ${s.mismatches} mismatch(es)`);
  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
