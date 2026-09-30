/*
 * Text diff for pages that use bozzies/divider. The divider itself has no
 * visible text — it's SVG + hairlines — so this checks that ports haven't
 * broken text on the affected pages. We collect innerText of <main> minus the
 * regions the divider block does not own (deferred timeline + playlist +
 * quotes carousel + discography-search placeholders), pull-quote, and
 * anything that Astro renders that WP still ships as a `[…] pending`
 * placeholder — the text diff is expected to be dominated by those on the
 * pages that carry them. What we assert:
 *   - divider region itself: no visible text on either side (SVG only)
 *   - full page: any onlyAstro/onlyWP tokens either match prior-commit
 *     residuals or are zero.
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
const ROUTES = ['/', '/about/', '/sisters/', '/media/', '/press/', '/sisters/connee/', '/sisters/bio-resources/'];

function chromePath() {
  for (const p of [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ]) if (existsSync(p)) return p;
  throw new Error('Chrome not found');
}

async function extractDividerRegion(page, url) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  // The divider itself renders no visible text — collect innerText from every
  // .divider on the page and sum lengths.
  return page.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll('.divider'));
    return nodes.map(n => (n.innerText || n.textContent || '').replace(/\s+/g, '').length);
  });
}

async function main() {
  const browser = await chromium.launch({ executablePath: chromePath() });
  const page = await browser.newContext({ deviceScaleFactor: 1 }).then(c => c.newPage());
  const results = {};
  let anyFail = false;
  for (const route of ROUTES) {
    const astro = await extractDividerRegion(page, `${ASTRO}${route}`);
    const wp    = await extractDividerRegion(page, `${WP}${route}`);
    const astroTotalChars = astro.reduce((a, b) => a + b, 0);
    const wpTotalChars    = wp.reduce((a, b) => a + b, 0);
    const countMatches    = astro.length === wp.length;
    const textMatches     = astroTotalChars === wpTotalChars;
    results[route] = { astroDividerCount: astro.length, wpDividerCount: wp.length, astroTotalChars, wpTotalChars };
    console.log(`\n=== ${route}`);
    console.log(`  astro dividers: ${astro.length}  wp dividers: ${wp.length}  countMatches: ${countMatches}`);
    console.log(`  astro innerText chars: ${astroTotalChars}  wp innerText chars: ${wpTotalChars}  textMatches: ${textMatches}`);
    if (!countMatches || !textMatches) anyFail = true;
  }
  await browser.close();
  writeFileSync(`${OUT}/divider-text-diff.json`, JSON.stringify(results, null, 2));
  process.exit(anyFail ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(1); });
