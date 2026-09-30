/*
 * Text diff for the bozzies/site-nav block on every hub + representative
 * detail pages. Scopes the diff to the `.site-nav` region: mark + primary
 * nav item labels + Donate label + visible text of any child (should be
 * a superset that also matches Astro).
 *
 * The full-page text diff is pointless on hubs (each hub already carries
 * pre-existing deferred-block placeholder residuals) — the site-nav port
 * only affects site-header text, so we scope tightly.
 *
 * Usage: node scripts/dev/site-nav-text-diff.mjs
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
  return page.evaluate(() => {
    const nav = document.querySelector('.site-nav');
    if (!nav) return { raw: '', links: [] };
    const raw = (nav.innerText || nav.textContent || '').replace(/\s+/g, ' ').trim();
    const links = Array.from(nav.querySelectorAll('a')).map(a => ({
      href: a.getAttribute('href') || '',
      text: (a.innerText || a.textContent || '').replace(/\s+/g, ' ').trim(),
      cls:  a.className,
      isActive: a.classList.contains('is-active'),
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
    const activeAstro = astro.links.filter(l => l.isActive).map(l => l.href);
    const activeWP    = wp.links.filter(l => l.isActive).map(l => l.href);
    const linkCountsMatch = astro.links.length === wp.links.length;
    const activeMatch = JSON.stringify(activeAstro) === JSON.stringify(activeWP);
    results[route] = {
      astroTokens: at.length,
      wpTokens: wt.length,
      onlyAstro,
      onlyWP,
      astroLinks: astro.links.length,
      wpLinks: wp.links.length,
      linkCountsMatch,
      astroActive: activeAstro,
      wpActive: activeWP,
      activeMatch,
    };
    console.log(`\n=== ${route}`);
    console.log(`  tokens astro=${at.length} wp=${wt.length}  onlyAstro=${onlyAstro.length} onlyWP=${onlyWP.length}`);
    console.log(`  links astro=${astro.links.length} wp=${wp.links.length} countsMatch=${linkCountsMatch}`);
    console.log(`  active astro=${JSON.stringify(activeAstro)} wp=${JSON.stringify(activeWP)} match=${activeMatch}`);
    if (onlyAstro.length || onlyWP.length || !linkCountsMatch || !activeMatch) anyFail = true;
  }
  await browser.close();
  writeFileSync(`${OUT}/site-nav-text-diff.json`, JSON.stringify(results, null, 2));
  process.exit(anyFail ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(1); });
