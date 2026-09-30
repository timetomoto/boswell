/*
 * Text diff for the lesson-hero region on all 5 lesson pages.
 * WP URLs are /media/lessons/lesson-N/; Astro URLs are /media/lessons/N/.
 * Compares the visible text inside .lesson-hero between Vercel and local WP.
 */
import { chromium } from 'playwright-core';
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../../_screens/rebuild-logs');
mkdirSync(OUT, { recursive: true });

const ASTRO = 'https://boswell-poc.vercel.app';
const WP    = 'http://localhost:8888';

const PAGES = [
  { label: 'lesson-1', wp: '/media/lessons/lesson-1/', astro: '/media/lessons/1/' },
  { label: 'lesson-2', wp: '/media/lessons/lesson-2/', astro: '/media/lessons/2/' },
  { label: 'lesson-3', wp: '/media/lessons/lesson-3/', astro: '/media/lessons/3/' },
  { label: 'lesson-4', wp: '/media/lessons/lesson-4/', astro: '/media/lessons/4/' },
  { label: 'lesson-5', wp: '/media/lessons/lesson-5/', astro: '/media/lessons/5/' },
];

function chromePath() {
  for (const p of [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ]) if (existsSync(p)) return p;
  throw new Error('Chrome not found');
}

async function extract(page, url) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  return page.evaluate(() => {
    document.querySelectorAll('[aria-hidden="true"], script, style').forEach(el => { el.style.display = 'none'; });
    const sec = document.querySelector('.lesson-hero');
    if (!sec) return '';
    return (sec.innerText || sec.textContent || '')
      .replace(/\s+/g, ' ')
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/[–—]/g, '-')
      .replace(/ /g, ' ')
      .trim();
  });
}

function tokenDiff(a, b) {
  const toks = s => s.toLowerCase().split(/\s+/).filter(Boolean);
  const A = toks(a), B = toks(b);
  const setA = new Set(A), setB = new Set(B);
  const onlyA = A.filter(t => !setB.has(t));
  const onlyB = B.filter(t => !setA.has(t));
  return { lenA: A.length, lenB: B.length, onlyAstro: onlyA, onlyWP: onlyB };
}

async function main() {
  const browser = await chromium.launch({ executablePath: chromePath() });
  const page = await browser.newContext({ deviceScaleFactor: 1 }).then(c => c.newPage());
  const report = { pages: [] };
  let bad = 0;
  for (const { label, wp, astro } of PAGES) {
    const A = await extract(page, `${ASTRO}${astro}`);
    const W = await extract(page, `${WP}${wp}`);
    const d = tokenDiff(A, W);
    report.pages.push({ label, wp, astro, astroText: A, wpText: W, diff: d });
    console.log(`${label}: astro=${d.lenA} tok  wp=${d.lenB} tok  onlyAstro=${d.onlyAstro.length}  onlyWP=${d.onlyWP.length}`);
    if (d.onlyAstro.length || d.onlyWP.length) bad++;
  }
  await browser.close();
  writeFileSync(`${OUT}/lesson-hero-text-diff.json`, JSON.stringify(report, null, 2));
  process.exit(bad === 0 ? 0 : 1);
}
main().catch(e => { console.error(e); process.exit(1); });
