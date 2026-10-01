/*
 * Astro-CSS style diff for the bozzies/site-footer block.
 * Pairs the Vercel Astro build's DOM against the local WP by Astro class
 * name on 4 routes at 1440 + 390 and reports every computed-style mismatch.
 *
 * The site-footer appears on every page; a small route set is enough since
 * the footer has no per-page variants.
 *
 * Usage: node scripts/dev/site-footer-style-diff.mjs
 * Output: prints per-route + per-viewport tables + saves JSON detail under
 *   _screens/site-footer-verify/
 */

import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../../_screens/site-footer-verify');
mkdirSync(OUT, { recursive: true });

const ASTRO = 'https://boswell-poc.vercel.app';
const WP = 'http://localhost:8888';
const ROUTES = [ '/', '/sisters/', '/media/', '/about/' ];

const PROPS = [
  'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing',
  'color', 'background-color', 'background-image', 'text-transform', 'text-decoration-line', 'opacity',
  'min-height', 'height', 'width', 'max-width',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'margin-top', 'margin-bottom', 'margin-inline-start', 'margin-inline-end',
  'text-align', 'display', 'position', 'grid-template-columns', 'align-items',
  'gap', 'flex-direction',
  'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
];

// Pair by Astro class name.
const SELECTORS = [
  '.site-footer',
  '.site-footer__inner',
  '.site-footer__mark',
  '.site-footer__wordmark',
  '.site-footer__tagline',
  '.site-footer__nav',
  '.site-footer__nav ul',
  '.site-footer__nav a',
  '.site-footer__meta',
  '.site-footer__meta p',
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
  // Scroll to bottom so the footer is in view / hover-able (not required for
  // computed style, but keeps rendering realistic).
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(200);
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
  let anyReal = 0;
  for (const route of ROUTES) {
    for (const vw of [1440, 390]) {
      const astro = await collect(page, `${ASTRO}${route}`, vw);
      const wp = await collect(page, `${WP}${route}`, vw);
      const rows = diff(astro, wp);
      const file = `${OUT}/${route.replace(/\//g, '_') || '_root'}-${vw}.json`;
      writeFileSync(file, JSON.stringify({ route, vw, astro, wp, diff: rows }, null, 2));
      console.log(`\n=== ${route} @ ${vw} — ${rows.length} mismatch(es)`);
      for (const r of rows) console.log(`  ${r.sel}[${r.prop}]  astro="${r.a}"  wp="${r.b}"`);
      anyReal += rows.length;
      summary.push({ route, vw, mismatches: rows.length });
    }
  }
  writeFileSync(`${OUT}/summary.json`, JSON.stringify(summary, null, 2));
  console.log('\n=== summary');
  for (const s of summary) console.log(`  ${s.route} @ ${s.vw}: ${s.mismatches} mismatch(es)`);
  await browser.close();
  process.exit(anyReal > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
