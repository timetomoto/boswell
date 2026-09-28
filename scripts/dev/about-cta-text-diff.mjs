/*
 * Text diff for the About page — both the full page and the .about-cta
 * section scoped diff. Screenshot-free per rebuild-loop rules — visual QA
 * done manually by Keith.
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

async function extract(page, url, selector) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  return page.evaluate(({ selector }) => {
    document.querySelectorAll('[aria-hidden="true"], script, style').forEach(el => { el.style.display = 'none'; });
    // Hide site chrome for full-page diffs.
    document.querySelectorAll(
      'script, style, header.wp-block-template-part, footer.wp-block-template-part, ' +
      '.site-header, .site-footer, body > nav, body > footer, .site-nav, header.site-nav'
    ).forEach(el => { el.style.display = 'none'; });
    const scope = selector ? document.querySelector(selector) : document.querySelector('main, [role="main"], body');
    if (!scope) return '';
    return (scope.innerText || scope.textContent || '')
      .replace(/\s+/g, ' ')
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/[–—]/g, '-')
      .replace(/ /g, ' ')
      .trim();
  }, { selector });
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

  const report = {};
  for (const scope of [{ name: 'full', sel: null }, { name: 'about-cta', sel: '.about-cta' }]) {
    const astro = await extract(page, `${ASTRO}/about/`, scope.sel);
    const wp    = await extract(page, `${WP}/about/`, scope.sel);
    const diff  = tokenDiff(astro, wp);
    report[scope.name] = { astroText: astro, wpText: wp, diff };
    console.log(`\n=== ${scope.name}`);
    console.log(`  astro: ${diff.lenA} tok`);
    console.log(`  wp   : ${diff.lenB} tok`);
    console.log(`  onlyAstro (${diff.onlyAstro.length}):`, diff.onlyAstro.slice(0, 15));
    console.log(`  onlyWP    (${diff.onlyWP.length}):`, diff.onlyWP.slice(0, 15));
  }

  await browser.close();
  writeFileSync(`${OUT}/about-cta-text-diff.json`, JSON.stringify(report, null, 2));
}
main().catch(e => { console.error(e); process.exit(1); });
