// scripts/import/network-audit.mjs
// Load each imported page in Playwright and count any 404/500 subresources
// (images, CSS, JS, fonts). Prints per-page results.

import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';

function chromePath() {
  for (const p of ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']) if (existsSync(p)) return p;
  throw new Error('Chrome not found');
}

const WP = 'http://localhost:8888';
const PAGES = [
  '/', '/about/', '/sisters/',
  '/sisters/connee/', '/sisters/martha/', '/sisters/vet/',
  '/sisters/bio-resources/', '/sisters/career-timeline/',
  '/media/', '/media/charts/', '/media/reviews/', '/media/discography/',
  '/media/lessons/', '/media/lessons/lesson-1/', '/media/lessons/lesson-2/', '/media/lessons/lesson-3/', '/media/lessons/lesson-4/', '/media/lessons/lesson-5/',
  '/press/', '/press/vintage/', '/press/feature/', '/media/video/', '/press/essay/', '/press/in-their-own-words/',
  '/press/feature/home-at-last/', '/press/vintage/12-bozzin-brian/', '/media/video/boswell-documentary/', '/press/feature/its-the-girls/',
  '/press/essay/what-is-getting-bozzed/', '/press/in-their-own-words/martha-the-spotlight/',
];

const b = await chromium.launch({ executablePath: chromePath() });
const ctx = await b.newContext();

const totals = { pages: 0, requests: 0, failures: 0 };
const failsByPage = {};

for (const path of PAGES) {
  const p = await ctx.newPage();
  let reqCount = 0;
  const fails = [];
  p.on('response', r => {
    reqCount++;
    const s = r.status();
    if (s >= 400) fails.push({ url: r.url(), status: s });
  });
  p.on('requestfailed', r => fails.push({ url: r.url(), status: r.failure()?.errorText || 'failed' }));
  await p.goto(WP + path, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
  await p.close();
  totals.pages++;
  totals.requests += reqCount;
  totals.failures += fails.length;
  if (fails.length) failsByPage[path] = fails;
  const marker = fails.length ? '✗' : '✓';
  console.log(`${marker} ${path}: ${reqCount} requests, ${fails.length} failures`);
}

await b.close();
console.log(`\nTotal: ${totals.pages} pages, ${totals.requests} requests, ${totals.failures} failures.`);
for (const [path, fails] of Object.entries(failsByPage)) {
  console.log(`\n${path}:`);
  for (const f of fails.slice(0, 10)) console.log(`  ${f.status} ${f.url}`);
}
