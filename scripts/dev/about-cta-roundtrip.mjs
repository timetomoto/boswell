/*
 * Round-trip test for bozzies/about-cta on /about/.
 * Open in editor, count invalid blocks, save, compare about-cta region + full page.
 *
 * Usage: node scripts/dev/about-cta-roundtrip.mjs
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
const PAGES = [ { id: 10, slug: 'about' } ];

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
      const re = /<!-- wp:bozzies\/about-cta[\s\S]*?\/-->/;
      const beforeAC = before.match(re);
      const afterAC  = after.match(re);
      const acSame  = beforeAC && afterAC && beforeAC[0] === afterAC[0];
      const pageSame = before === after;
      results.push({ slug: p.slug, id: p.id, invalidBlocks: invalidCount, pageUnchanged: pageSame, aboutCtaRegionUnchanged: !!acSame, beforeLen: before.length, afterLen: after.length });
      console.log(`  ${p.slug} (${p.id}): invalid=${invalidCount} pageUnchanged=${pageSame} aboutCtaRegionUnchanged=${!!acSame} before=${before.length} after=${after.length}`);
      if (!acSame) {
        writeFileSync(`${OUT}/about-cta-${p.slug}-before.txt`, beforeAC ? beforeAC[0] : '');
        writeFileSync(`${OUT}/about-cta-${p.slug}-after.txt`, afterAC ? afterAC[0] : '');
      }
      if (!pageSame) {
        writeFileSync(`${OUT}/about-cta-${p.slug}-page-before.txt`, before);
        writeFileSync(`${OUT}/about-cta-${p.slug}-page-after.txt`, after);
      }
    }
  } finally {
    await browser.close();
  }
  writeFileSync(`${OUT}/about-cta-roundtrip.json`, JSON.stringify(results, null, 2));
  const bad = results.filter(r => !r.aboutCtaRegionUnchanged || r.invalidBlocks > 0);
  console.log(bad.length ? `FAIL: ${bad.length} page(s) with issues` : 'OK: about-cta region unchanged and no validation warnings');
  process.exit(bad.length ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
