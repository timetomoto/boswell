/*
 * Computed-style diff for the sister-cards block.
 * Pair WP vs Vercel on Astro class names inside /sisters/ (.sisters-cards,
 * .sister-card, .sister-card__link, .sister-card__meta, .sister-card__order,
 * .sister-card__nickname, .sister-card__name, .sister-card__quote,
 * .sister-card__cta). Read a curated computed-style set at 1440 and 390.
 *
 * Usage: node scripts/dev/sister-cards-style-diff.mjs
 * Output: table per viewport, JSON detail under _screens/rebuild-logs/.
 */

import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../../_screens/rebuild-logs');
mkdirSync(OUT, { recursive: true });

const ASTRO = 'https://boswell-poc.vercel.app/sisters/';
const WP    = 'http://localhost:8888/sisters/';

const PROPS = [
  'display', 'position',
  'grid-template-columns', 'gap',
  'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing',
  'text-transform', 'text-align', 'font-style',
  'color', 'background-color',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
  'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
  'width', 'max-width', 'height',
];

// One representative per class (use first-of-type on cards so all three cards agree).
const SELECTORS = [
  '.sisters-cards',
  '.sister-card',
  '.sister-card__link',
  '.sister-card__meta',
  '.sister-card__order',
  '.sister-card__nickname',
  '.sister-card__name',
  '.sister-card__quote',
  '.sister-card__cta',
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

// Compare two computed-style bags. Ignore <0.5px rounding on numeric px values,
// and normalise oklab()<->rgb() by string equality (fine — CSS tokens.css
// re-exports both engines resolve identically on modern Chromium).
function normPx(v) {
  const m = /^(-?\d+(?:\.\d+)?)px$/.exec((v||'').trim());
  if (!m) return v;
  return `${Math.round(parseFloat(m[1]) * 2) / 2}px`;
}
function diff(a, b) {
  const rows = [];
  for (const sel of SELECTORS) {
    const A = a[sel], B = b[sel];
    if (!A && !B) continue;
    if (!A) { rows.push({ sel, prop: '(missing in astro)', a: '-', b: 'present' }); continue; }
    if (!B) { rows.push({ sel, prop: '(missing in wp)',    a: 'present', b: '-' }); continue; }
    for (const p of PROPS) {
      const av = normPx(A[p] || '');
      const bv = normPx(B[p] || '');
      if (av !== bv) rows.push({ sel, prop: p, a: A[p], b: B[p] });
    }
  }
  return rows;
}

async function main() {
  const browser = await chromium.launch({ executablePath: chromePath() });
  const page = await browser.newContext({ deviceScaleFactor: 1 }).then(c => c.newPage());
  const summary = [];
  for (const vw of [1440, 390]) {
    const astro = await collect(page, ASTRO, vw);
    const wp    = await collect(page, WP, vw);
    const rows  = diff(astro, wp);
    const file  = `${OUT}/sister-cards-${vw}.json`;
    writeFileSync(file, JSON.stringify({ vw, astro, wp, diff: rows }, null, 2));
    console.log(`\n=== /sisters/ @ ${vw} — ${rows.length} mismatch(es)`);
    for (const r of rows) console.log(`  ${r.sel}[${r.prop}]  astro="${r.a}"  wp="${r.b}"`);
    summary.push({ vw, mismatches: rows.length });
  }
  writeFileSync(`${OUT}/sister-cards-summary.json`, JSON.stringify(summary, null, 2));
  console.log('\n=== summary');
  for (const s of summary) console.log(`  ${s.vw}: ${s.mismatches} mismatch(es)`);
  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
