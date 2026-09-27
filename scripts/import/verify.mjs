// scripts/import/verify.mjs
// Verification harness for a group of imported pages.
// - Visible-text diff between Vercel Astro page and local WP page
// - Broken-link crawl from a set of entry points
// - Screenshot pair (Astro + WP) at 1440 and 390
//
// Usage:
//   node scripts/import/verify.mjs <group-name> <route1> [<route2> ...]
// Routes are the shared path segment (e.g. "/sisters/"). Astro serves at
// https://boswell-poc.vercel.app, WP at http://localhost:8888.

import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { execSync } from 'node:child_process';

const ASTRO = 'https://boswell-poc.vercel.app';
const WP = 'http://localhost:8888';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_ROOT = resolve(__dirname, '../../_screens');

const group = process.argv[2];
const routes = process.argv.slice(3);
if (!group || routes.length === 0) {
  console.error('usage: node scripts/import/verify.mjs <group> <route> [...]');
  process.exit(2);
}

const outDir = `${OUT_ROOT}/task-9-${group}`;
mkdirSync(outDir, { recursive: true });

// Try to locate Chrome/Chromium on macOS (playwright-core needs a browser).
function chromePath() {
  const paths = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ];
  for (const p of paths) { if (existsSync(p)) return p; }
  throw new Error('Chrome not found — install Google Chrome or set CHROME_PATH');
}

// Extract visible text: strip nav/footer/scripts, keep main content.
async function visibleText(page) {
  return page.evaluate(() => {
    const main = document.querySelector('main, [role="main"], article, .site-main, .wp-site-blocks main') || document.body;
    const clone = main.cloneNode(true);
    // Strip everything that shouldn't participate in a body-text diff.
    clone.querySelectorAll('script, style, nav, footer, header, .site-footer, .site-header, [aria-hidden="true"]').forEach(el => el.remove());
    const raw = clone.innerText || clone.textContent || '';
    return raw
      .replace(/\s+/g, ' ')
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/[–—]/g, '-')
      .replace(/ /g, ' ')
      .trim();
  });
}

// Diff two strings token-by-token; return an object with counts + first N mismatches.
function tokenDiff(a, b) {
  const toks = s => s.split(/\s+/).filter(Boolean);
  const A = toks(a), B = toks(b);
  const setA = new Set(A), setB = new Set(B);
  const onlyA = A.filter(t => !setB.has(t));
  const onlyB = B.filter(t => !setA.has(t));
  return {
    lenA: A.length, lenB: B.length,
    onlyAstro: onlyA.slice(0, 30),
    onlyWP: onlyB.slice(0, 30),
    onlyAstroCount: onlyA.length,
    onlyWPCount: onlyB.length,
  };
}

async function grabScreenshot(page, url, width, outPath) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: outPath, fullPage: true });
}

// Very small crawl: fetch the WP entry point, extract same-origin links, HEAD each.
async function crawl(entryUrl) {
  const seen = new Set();
  const bad = [];
  async function fetchLinks(u) {
    const html = execSync(`curl -sS "${u}"`, { encoding: 'utf8', maxBuffer: 32*1024*1024 });
    const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map(m => m[1]);
    return hrefs;
  }
  const links = await fetchLinks(entryUrl);
  for (const h of links) {
    let u;
    try { u = new URL(h, entryUrl); } catch { continue; }
    if (u.origin !== new URL(entryUrl).origin) continue;
    if (seen.has(u.pathname)) continue;
    seen.add(u.pathname);
    const code = execSync(`curl -sS -o /dev/null -w "%{http_code}" "${u.href}"`, { encoding: 'utf8' }).trim();
    if (code === '404') bad.push(u.pathname);
  }
  return { checked: seen.size, bad };
}

async function main() {
  const browser = await chromium.launch({ executablePath: chromePath() });
  const context = await browser.newContext({ deviceScaleFactor: 1 });
  const page = await context.newPage();

  const report = { group, routes: [] };

  for (const route of routes) {
    const slug = route.replace(/^\/+|\/+$/g, '').replace(/\//g, '__') || 'home';
    console.log(`\n=== ${route}`);

    // Visible-text diff.
    await page.goto(`${ASTRO}${route}`, { waitUntil: 'networkidle', timeout: 30000 });
    const astroText = await visibleText(page);
    await page.goto(`${WP}${route}`, { waitUntil: 'networkidle', timeout: 30000 });
    const wpText = await visibleText(page);
    const diff = tokenDiff(astroText, wpText);
    console.log(`  text: astro=${diff.lenA} tok, wp=${diff.lenB} tok, onlyAstro=${diff.onlyAstroCount}, onlyWP=${diff.onlyWPCount}`);

    // Screenshots at 1440 + 390.
    for (const vw of [1440, 390]) {
      await grabScreenshot(page, `${ASTRO}${route}`, vw, `${outDir}/${slug}-astro-${vw}.png`);
      await grabScreenshot(page, `${WP}${route}`, vw, `${outDir}/${slug}-wp-${vw}.png`);
    }
    console.log(`  screenshots: ${slug}-{astro,wp}-{1440,390}.png`);

    report.routes.push({ route, diff });
  }

  await browser.close();

  // Link crawl from the WP homepage.
  const crawlResult = await crawl(`${WP}/`);
  console.log(`\nCrawl from ${WP}/: checked ${crawlResult.checked} internal links, ${crawlResult.bad.length} 404s`);
  if (crawlResult.bad.length) console.log('  bad:', crawlResult.bad);
  report.crawl = crawlResult;

  writeFileSync(`${outDir}/report.json`, JSON.stringify(report, null, 2));
  console.log(`\nReport: ${outDir}/report.json`);
}

main().catch(e => { console.error(e); process.exit(1); });
