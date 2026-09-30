/*
 * Lesson-hero computed-style diff against Vercel.
 * WP URLs are /media/lessons/lesson-N/; Astro URLs are /media/lessons/N/.
 * Reads 30 CSS properties per selector at 1440 and 390 on all 5 lesson pages.
 */
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ASTRO = 'https://boswell-poc.vercel.app';
const WP    = 'http://localhost:8888';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_ROOT = resolve(__dirname, '../../_screens/component-diff/lesson-hero');
mkdirSync(OUT_ROOT, { recursive: true });

const PAGES = [
  { label: 'lesson-1', wp: '/media/lessons/lesson-1/', astro: '/media/lessons/1/' },
  { label: 'lesson-2', wp: '/media/lessons/lesson-2/', astro: '/media/lessons/2/' },
  { label: 'lesson-3', wp: '/media/lessons/lesson-3/', astro: '/media/lessons/3/' },
  { label: 'lesson-4', wp: '/media/lessons/lesson-4/', astro: '/media/lessons/4/' },
  { label: 'lesson-5', wp: '/media/lessons/lesson-5/', astro: '/media/lessons/5/' },
];

const SELECTORS = [
  '.lesson-hero',
  '.lesson-hero .music-backdrop',
  '.lesson-hero__inner',
  '.lesson-hero__back',
  '.lesson-hero__eyebrow',
  '.lesson-hero__title',
  '.lesson-hero__summary',
];

const PROPS = [
  'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing',
  'color', 'background-color', 'background-image', 'mix-blend-mode', 'opacity',
  'min-height', 'height', 'width', 'max-width',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'margin-top', 'margin-inline-start', 'margin-inline-end', 'margin-bottom',
  'text-align', 'text-transform', 'display', 'position', 'z-index',
  'border-top-color', 'border-bottom-color', 'border-left-color',
  'border-top-width', 'border-bottom-width', 'border-bottom-style',
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
  }, { selectors: SELECTORS, props: PROPS });
}

function diff(a, b) {
  const rows = [];
  for (const sel of SELECTORS) {
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
  for (const { label, wp, astro } of PAGES) {
    for (const vw of [1440, 390]) {
      const A = await collect(page, `${ASTRO}${astro}`, vw);
      const W = await collect(page, `${WP}${wp}`, vw);
      const rows = diff(A, W);
      writeFileSync(`${OUT_ROOT}/${label}-${vw}.json`, JSON.stringify({ label, vw, wp, astro, diff: rows }, null, 2));
      summary.push({ label, vw, mismatches: rows.length });
    }
  }
  writeFileSync(`${OUT_ROOT}/summary.json`, JSON.stringify(summary, null, 2));
  console.log('summary:');
  for (const s of summary) console.log(`  ${s.label} @ ${s.vw}: ${s.mismatches}`);
  await browser.close();
}
main().catch(e => { console.error(e); process.exit(1); });
