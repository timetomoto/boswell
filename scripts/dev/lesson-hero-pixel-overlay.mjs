/*
 * Pixel overlay for lesson-hero on all 5 lesson pages at 1440 and 390.
 * WP URLs are /media/lessons/lesson-N/; Astro URLs are /media/lessons/N/.
 * Clips .lesson-hero on both sites, runs pixelmatch, prints % diff.
 */
import { chromium } from 'playwright-core';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../../_screens/rebuild-logs');
mkdirSync(OUT, { recursive: true });

const WP    = 'http://localhost:8888';
const ASTRO = 'https://boswell-poc.vercel.app';

const PAGES = [
  { label: 'lesson-1', wp: '/media/lessons/lesson-1/', astro: '/media/lessons/1/' },
  { label: 'lesson-2', wp: '/media/lessons/lesson-2/', astro: '/media/lessons/2/' },
  { label: 'lesson-3', wp: '/media/lessons/lesson-3/', astro: '/media/lessons/3/' },
  { label: 'lesson-4', wp: '/media/lessons/lesson-4/', astro: '/media/lessons/4/' },
  { label: 'lesson-5', wp: '/media/lessons/lesson-5/', astro: '/media/lessons/5/' },
];

const SELECTOR = '.lesson-hero';

function chromePath() {
  for (const p of [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ]) if (existsSync(p)) return p;
  throw new Error('Chrome not found');
}

async function snap(page, url, out, vw) {
  await page.setViewportSize({ width: vw, height: 900 });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.addStyleTag({ content: '*,*::before,*::after{animation-duration:0s!important;transition-duration:0s!important}' });
  await page.waitForTimeout(400);
  const el = await page.$(SELECTOR);
  if (!el) throw new Error(`selector "${SELECTOR}" not found on ${url}`);
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  await el.screenshot({ path: out });
}

function readPNG(path) { return PNG.sync.read(readFileSync(path)); }

async function main() {
  const browser = await chromium.launch({ executablePath: chromePath() });
  const page = await browser.newContext({ deviceScaleFactor: 1 }).then(c => c.newPage());
  const results = [];
  for (const { label, wp, astro } of PAGES) {
    for (const vw of [1440, 390]) {
      const nameA = `${OUT}/pixel-astro-lesson-hero-${label}-${vw}.png`;
      const nameB = `${OUT}/pixel-wp-lesson-hero-${label}-${vw}.png`;
      const nameD = `${OUT}/pixel-diff-lesson-hero-${label}-${vw}.png`;
      await snap(page, `${ASTRO}${astro}`, nameA, vw);
      await snap(page, `${WP}${wp}`,       nameB, vw);
      const a = readPNG(nameA);
      const b = readPNG(nameB);
      const w = Math.min(a.width, b.width);
      const h = Math.min(a.height, b.height);
      const clip = (png) => {
        if (png.width === w && png.height === h) return png.data;
        const out = new PNG({ width: w, height: h });
        for (let y = 0; y < h; y++) {
          const src = y * png.width * 4;
          const dst = y * w * 4;
          png.data.copy(out.data, dst, src, src + w * 4);
        }
        return out.data;
      };
      const dataA = clip(a);
      const dataB = clip(b);
      const diff = new PNG({ width: w, height: h });
      const diffCount = pixelmatch(dataA, dataB, diff.data, w, h, { threshold: 0.15, includeAA: false, alpha: 0.4 });
      writeFileSync(nameD, PNG.sync.write(diff));
      const pct = (diffCount / (w * h)) * 100;
      const flag = pct > 2 ? '○' : 'ok';
      console.log(`  ${label} @ ${vw}: astro=${a.width}x${a.height}  wp=${b.width}x${b.height}  diff=${diffCount}/${w*h} (${pct.toFixed(2)}%)  ${flag}`);
      results.push({ label, vw, pct, flag, astro: { w: a.width, h: a.height }, wp: { w: b.width, h: b.height } });
    }
  }
  await browser.close();
  writeFileSync(`${OUT}/lesson-hero-pixel-overlay.json`, JSON.stringify(results, null, 2));
}
main().catch(e => { console.error(e); process.exit(1); });
