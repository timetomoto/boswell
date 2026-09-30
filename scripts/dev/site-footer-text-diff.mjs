/*
 * Text diff for the bozzies/site-footer block on every hub + representative
 * detail pages. Scopes the diff to the `.site-footer` region: wordmark,
 * tagline, secondary-nav labels, credits paragraph, © line.
 *
 * The Astro footer is identical on every route (siteName + tagline +
 * navigation.primary + footerCredits + current year), so this check pairs
 * text token-by-token. The WP DOM will also render a `.bozzies-cookie-settings`
 * button — Astro doesn't. The button is `hidden`, so `.innerText` skips it in
 * both cases; the text-diff is therefore apples-to-apples.
 *
 * Usage: node scripts/dev/site-footer-text-diff.mjs
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
const ROUTES = [ '/', '/sisters/', '/media/', '/press/', '/about/', '/sisters/connee/' ];

function chromePath() {
  for (const p of [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ]) if (existsSync(p)) return p;
  throw new Error('Chrome not found');
}

function tokens(s) { return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean); }

async function extract(page, url) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(200);
  return page.evaluate(() => {
    const foot = document.querySelector('.site-footer');
    if (!foot) return { raw: '', links: [] };
    const raw = (foot.innerText || foot.textContent || '').replace(/\s+/g, ' ').trim();
    const links = Array.from(foot.querySelectorAll('.site-footer__nav a')).map(a => ({
      href: a.getAttribute('href') || '',
      text: (a.innerText || a.textContent || '').replace(/\s+/g, ' ').trim(),
    }));
    return { raw, links };
  });
}

async function main() {
  const browser = await chromium.launch({ executablePath: chromePath() });
  const page = await browser.newContext({ deviceScaleFactor: 1 }).then(c => c.newPage());
  const results = {};
  let anyFail = false;
  for (const route of ROUTES) {
    const astro = await extract(page, `${ASTRO}${route}`);
    const wp    = await extract(page, `${WP}${route}`);
    const at = tokens(astro.raw);
    const wt = tokens(wp.raw);
    const setA = new Set(at), setW = new Set(wt);
    const onlyAstro = at.filter(t => !setW.has(t));
    const onlyWP    = wt.filter(t => !setA.has(t));
    const linkCountsMatch = astro.links.length === wp.links.length;
    const hrefsAstro = astro.links.map(l => l.href).sort();
    const hrefsWP    = wp.links.map(l => l.href).sort();
    const hrefsMatch = JSON.stringify(hrefsAstro) === JSON.stringify(hrefsWP);
    results[route] = {
      astroTokens: at.length,
      wpTokens: wt.length,
      onlyAstro,
      onlyWP,
      astroLinks: astro.links.length,
      wpLinks: wp.links.length,
      linkCountsMatch,
      hrefsMatch,
    };
    console.log(`\n=== ${route}`);
    console.log(`  tokens astro=${at.length} wp=${wt.length}  onlyAstro=${onlyAstro.length} onlyWP=${onlyWP.length}`);
    console.log(`  links astro=${astro.links.length} wp=${wp.links.length} countsMatch=${linkCountsMatch} hrefsMatch=${hrefsMatch}`);
    if (onlyAstro.length) console.log(`  onlyAstro: ${JSON.stringify(onlyAstro)}`);
    if (onlyWP.length)    console.log(`  onlyWP:    ${JSON.stringify(onlyWP)}`);
    if (onlyAstro.length || onlyWP.length || !linkCountsMatch || !hrefsMatch) anyFail = true;
  }
  await browser.close();
  writeFileSync(`${OUT}/site-footer-text-diff.json`, JSON.stringify(results, null, 2));
  process.exit(anyFail ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(1); });
