/*
 * Generic component computed-style diff against Vercel.
 * Usage:
 *   node scripts/dev/component-style-diff.mjs \
 *     --pages=/press/,/press/vintage/ \
 *     --selectors=.article-row,.article-row__link,.article-row__num,.article-row__title,.article-row__meta \
 *     --out=article-list
 *
 * Reads 30 CSS properties per selector at 1440 and 390. Prints mismatches.
 */
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ASTRO = 'https://boswell-poc.vercel.app';
const WP    = 'http://localhost:8888';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_ROOT = resolve(__dirname, '../../_screens/component-diff');

function arg(name, dflt) {
  const p = process.argv.find(a => a.startsWith(`--${name}=`));
  return p ? p.slice(name.length + 3) : dflt;
}
const pages = (arg('pages', '') || '').split(',').filter(Boolean);
const selectors = (arg('selectors', '') || '').split(',').filter(Boolean);
const out = arg('out', 'component');
if (!pages.length || !selectors.length) {
  console.error('usage: --pages=/a/,/b/ --selectors=.foo,.bar [--out=name]');
  process.exit(2);
}

mkdirSync(`${OUT_ROOT}/${out}`, { recursive: true });

const PROPS = [
  'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing',
  'color', 'background-color', 'background-image', 'mix-blend-mode', 'opacity',
  'min-height', 'height', 'width', 'max-width',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'margin-top', 'margin-inline-start', 'margin-inline-end',
  'text-align', 'text-transform', 'display', 'position', 'z-index', 'inset',
  'filter', 'object-fit', 'object-position', 'grid-template-columns', 'gap',
  'border-top-color', 'border-bottom-color', 'border-left-color',
  'border-top-width', 'border-bottom-width',
];

function chromePath() {
  for (const p of [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ]) if (existsSync(p)) return p;
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
  }, { selectors, props: PROPS });
}
function diff(a, b) {
  const rows = [];
  for (const sel of selectors) {
    const A = a[sel], B = b[sel];
    if (!A && !B) continue;
    if (!A) { rows.push({ sel, prop: '(missing in astro)', a: '-', b: 'present' }); continue; }
    if (!B) { rows.push({ sel, prop: '(missing in wp)',    a: 'present', b: '-' }); continue; }
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
  for (const route of pages) {
    for (const vw of [1440, 390]) {
      const astro = await collect(page, `${ASTRO}${route}`, vw);
      const wp    = await collect(page, `${WP}${route}`, vw);
      const rows  = diff(astro, wp);
      const slug  = route.replace(/\//g, '_').replace(/^_|_$/g, '') || 'home';
      writeFileSync(`${OUT_ROOT}/${out}/${slug}-${vw}.json`, JSON.stringify({ route, vw, diff: rows }, null, 2));
      console.log(`\n=== ${route} @ ${vw} — ${rows.length} mismatch(es)`);
      for (const r of rows) console.log(`  ${r.sel}[${r.prop}]  astro="${r.a}"  wp="${r.b}"`);
      summary.push({ route, vw, mismatches: rows.length });
    }
  }
  writeFileSync(`${OUT_ROOT}/${out}/summary.json`, JSON.stringify(summary, null, 2));
  console.log('\nsummary:');
  for (const s of summary) console.log(`  ${s.route} @ ${s.vw}: ${s.mismatches}`);
  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
