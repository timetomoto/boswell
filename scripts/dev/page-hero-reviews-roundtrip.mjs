/*
 * Round-trip test for bozzies/page-hero on /media/reviews/ (backdrop:staves).
 * Opens in editor, counts invalid blocks, saves, and compares the page-hero
 * region + full page before/after.
 */

import { chromium } from 'playwright-core';
import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../../_screens/rebuild-logs');
mkdirSync(OUT, { recursive: true });

const WP = 'http://localhost:8888';
const PAGES = [ { id: 21, slug: 'reviews' } ];

function chromePath() {
  for (const p of [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ]) if (existsSync(p)) return p;
  throw new Error('Chrome not found');
}

function readContent(postId) {
  return execSync(
    `npx wp-env run cli --env-cwd=/var/www/html wp post get ${postId} --field=post_content 2>/dev/null`,
    { encoding: 'utf8' }
  ).trim();
}

async function login(page) {
  await page.goto(`${WP}/wp-login.php`, { waitUntil: 'domcontentloaded' });
  await page.fill('#user_login', 'astroshot');
  await page.fill('#user_pass', 'trialpass123');
  await page.click('#wp-submit');
  await page.waitForURL(/wp-admin/, { timeout: 15000 });
}

async function openAndSave(page, postId) {
  await page.goto(`${WP}/wp-admin/post.php?post=${postId}&action=edit`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('iframe[name="editor-canvas"]', { timeout: 30000 });
  await page.waitForTimeout(4000);
  await page.evaluate(() => {
    document.querySelectorAll('.components-modal__screen-overlay, .components-guide').forEach(el => el.remove());
  });
  const invalidCount = await page.evaluate(() => {
    const blocks = wp.data.select('core/block-editor').getBlocks();
    function count(bs) {
      let c = 0;
      for (const b of bs) {
        if (b.isValid === false) c += 1;
        if (b.innerBlocks && b.innerBlocks.length) c += count(b.innerBlocks);
      }
      return c;
    }
    return count(blocks);
  });
  await page.evaluate(async () => {
    await wp.data.dispatch('core/editor').savePost();
  });
  await page.waitForTimeout(2500);
  return { invalidCount };
}

async function main() {
  const results = [];
  const browser = await chromium.launch({ executablePath: chromePath() });
  const page = await browser.newContext({ deviceScaleFactor: 1 }).then(c => c.newPage());
  await page.setViewportSize({ width: 1600, height: 1000 });

  try {
    await login(page);
    for (const p of PAGES) {
      const before = readContent(p.id);
      const { invalidCount } = await openAndSave(page, p.id);
      const after = readContent(p.id);
      const re = /<!-- wp:bozzies\/page-hero[\s\S]*?\/-->/;
      const beforeHero = before.match(re);
      const afterHero = after.match(re);
      const heroSame = beforeHero && afterHero && beforeHero[0] === afterHero[0];
      const pageSame = before === after;
      results.push({ slug: p.slug, id: p.id, invalidBlocks: invalidCount, pageUnchanged: pageSame, heroRegionUnchanged: !!heroSame, beforeLen: before.length, afterLen: after.length });
      console.log(`  ${p.slug} (${p.id}): invalid=${invalidCount} pageUnchanged=${pageSame} heroRegionUnchanged=${!!heroSame} before=${before.length} after=${after.length}`);
      if (!heroSame) {
        writeFileSync(`${OUT}/page-hero-${p.slug}-before.txt`, beforeHero ? beforeHero[0] : '');
        writeFileSync(`${OUT}/page-hero-${p.slug}-after.txt`, afterHero ? afterHero[0] : '');
      }
    }
  } finally {
    await browser.close();
  }
  writeFileSync(`${OUT}/page-hero-reviews-roundtrip.json`, JSON.stringify(results, null, 2));
  const bad = results.filter(r => !r.heroRegionUnchanged || r.invalidBlocks > 0);
  console.log(bad.length ? `FAIL: ${bad.length} page(s) with issues` : 'OK: page-hero region unchanged and no validation warnings');
  process.exit(bad.length ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
