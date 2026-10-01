/*
 * Pixel overlay comparison per selector. Clips a section on both Vercel and
 * local WP, runs pixelmatch, prints % pixels differing. Flags over 2 %.
 *
 * Usage:
 *   node scripts/dev/pixel-overlay.mjs <path> <selector> [--vw=1440]
 * Example:
 *   node scripts/dev/pixel-overlay.mjs /sisters/ ".sisters-cards" --vw=1440
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

const args = process.argv.slice(2);
const positional = args.filter(a => !a.startsWith('--'));
const flags = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => { const [k, v = 'true'] = a.slice(2).split('='); return [k, v]; }));

const [route, selector] = positional;
if (!route || !selector) {
  console.error('usage: pixel-overlay.mjs <route> <selector> [--vw=1440]');
  process.exit(2);
}
const vw = Number(flags.vw || 1440);

const WP    = 'http://localhost:8888';
const ASTRO = 'https://boswell-poc.vercel.app';

function chromePath() {
  for (const p of [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ]) if (existsSync(p)) return p;
  throw new Error('Chrome not found');
}

async function snap(page, url, selector, out) {
  await page.setViewportSize({ width: vw, height: 900 });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.addStyleTag({ content: '*,*::before,*::after{animation-duration:0s!important;transition-duration:0s!important}' });
  await page.waitForTimeout(400);
  const el = await page.$(selector);
  if (!el) throw new Error(`selector "${selector}" not found on ${url}`);
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  await el.screenshot({ path: out });
}

function readPNG(path) {
  return PNG.sync.read(readFileSync(path));
}

async function main() {
  const browser = await chromium.launch({ executablePath: chromePath() });
  const page = await browser.newContext({ deviceScaleFactor: 1 }).then(c => c.newPage());

  const slug = selector.replace(/[^A-Za-z0-9-]+/g, '-').replace(/^-|-$/g, '');
  const nameA = `${OUT}/pixel-astro-${slug}-${vw}.png`;
  const nameB = `${OUT}/pixel-wp-${slug}-${vw}.png`;
  const nameD = `${OUT}/pixel-diff-${slug}-${vw}.png`;

  await snap(page, `${ASTRO}${route}`, selector, nameA);
  await snap(page, `${WP}${route}`,    selector, nameB);
  await browser.close();

  const a = readPNG(nameA);
  const b = readPNG(nameB);

  // Different dimensions — resize is not lossless; report and use min dims.
  const w = Math.min(a.width, b.width);
  const h = Math.min(a.height, b.height);
  const clip = (png) => {
    if (png.width === w && png.height === h) return png.data;
    const out = new PNG({ width: w, height: h });
    // Copy each row up to w*4 bytes from the top-left.
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

  const total = w * h;
  const pct = (diffCount / total) * 100;
  const flag = pct > 2 ? 'OVER 2% — FAIL' : 'ok';
  console.log(`${route} ${selector} @ ${vw}: astro=${a.width}x${a.height} wp=${b.width}x${b.height}  pixels diff=${diffCount}/${total} (${pct.toFixed(2)}%)  ${flag}`);
  writeFileSync(`${OUT}/pixel-overlay-${slug}-${vw}.json`, JSON.stringify({
    route, selector, vw, astro: { w: a.width, h: a.height }, wp: { w: b.width, h: b.height },
    diffPixels: diffCount, totalPixels: total, pct, flag,
  }, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
