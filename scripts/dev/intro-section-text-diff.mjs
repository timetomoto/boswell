/*
 * Text diff for the home intro section.
 * Compares the visible text inside the .intro-section between Astro's /
 * (Vercel) and WP's / (local). Screenshot-free per rebuild-loop rules.
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
    const sec = document.querySelector('.intro-section');
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
  const astro = await extract(page, `${ASTRO}/`);
  const wp    = await extract(page, `${WP}/`);
  await browser.close();
  const diff = tokenDiff(astro, wp);
  const report = { astroText: astro, wpText: wp, diff };
  writeFileSync(`${OUT}/intro-section-text-diff.json`, JSON.stringify(report, null, 2));
  console.log(`astro: ${diff.lenA} tok`);
  console.log(`wp   : ${diff.lenB} tok`);
  console.log(`onlyAstro: ${diff.onlyAstro.length}`, diff.onlyAstro.slice(0, 10));
  console.log(`onlyWP   : ${diff.onlyWP.length}`, diff.onlyWP.slice(0, 10));
  process.exit(diff.onlyAstro.length === 0 && diff.onlyWP.length === 0 ? 0 : 1);
}
main().catch(e => { console.error(e); process.exit(1); });
