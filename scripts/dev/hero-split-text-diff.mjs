/*
 * Scoped visible-text diff for the split hero on the home page. Reads only
 * the .hero (or .hero.hero--split) section of each site, so the deferred
 * playlist / quotes-carousel sections don't pollute the numbers.
 *
 * Usage: node scripts/dev/hero-split-text-diff.mjs
 */

import { chromium } from 'playwright-core';
import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../../_screens/hero-split-verify');
mkdirSync(OUT, { recursive: true });

const ASTRO = 'https://boswell-poc.vercel.app/';
const WP = 'http://localhost:8888/';

function chromePath() {
  for (const p of [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ]) if (existsSync(p)) return p;
  throw new Error('Chrome not found');
}

async function extract(page, url) {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 });
  return page.evaluate(() => {
    const root = document.querySelector('.hero.hero--split') || document.querySelector('.hero');
    if (!root) return [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => {
        if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        const el = n.parentElement;
        if (!el) return NodeFilter.FILTER_REJECT;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return NodeFilter.FILTER_REJECT;
        if (el.closest('[aria-hidden="true"]')) return NodeFilter.FILTER_REJECT;
        if (el.closest('script, style, noscript')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    const out = [];
    let node;
    while ((node = walker.nextNode())) {
      const t = node.nodeValue.replace(/\s+/g, ' ').trim();
      if (t) out.push(t);
    }
    return out;
  });
}

async function main() {
  const browser = await chromium.launch({ executablePath: chromePath() });
  const page = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }).then(c => c.newPage());
  const a = await extract(page, ASTRO);
  const b = await extract(page, WP);
  const norm = (s) => s.replace(/\s+/g, ' ').trim();
  const setA = new Map();
  for (const s of a) setA.set(norm(s), (setA.get(norm(s)) || 0) + 1);
  const setB = new Map();
  for (const s of b) setB.set(norm(s), (setB.get(norm(s)) || 0) + 1);
  const onlyA = [];
  for (const [s, count] of setA) {
    const bCount = setB.get(s) || 0;
    for (let i = 0; i < count - bCount; i++) onlyA.push(s);
  }
  const onlyB = [];
  for (const [s, count] of setB) {
    const aCount = setA.get(s) || 0;
    for (let i = 0; i < count - aCount; i++) onlyB.push(s);
  }
  const result = { astroCount: a.length, wpCount: b.length, onlyAstro: onlyA, onlyWP: onlyB };
  writeFileSync(`${OUT}/hero-split-text-diff.json`, JSON.stringify(result, null, 2));
  console.log(`hero (scoped): astro=${a.length}  wp=${b.length}  onlyAstro=${onlyA.length}  onlyWP=${onlyB.length}`);
  for (const s of onlyA) console.log(`  - ${JSON.stringify(s)}`);
  for (const s of onlyB) console.log(`  + ${JSON.stringify(s)}`);
  await browser.close();
  process.exit(onlyA.length + onlyB.length ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
