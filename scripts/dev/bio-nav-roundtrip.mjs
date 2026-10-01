/*
 * Round-trip test for bozzies/bio-nav on the 3 bio pages.
 * Open in editor, count invalid blocks, save, compare post_content.
 *
 * Usage: node scripts/dev/bio-nav-roundtrip.mjs
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
const PAGES = [
  { id: 15, slug: 'connee' },
  { id: 16, slug: 'martha' },
  { id: 17, slug: 'vet' },
];

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
      const ok = before === after;
      results.push({ slug: p.slug, id: p.id, invalidBlocks: invalidCount, unchanged: ok, beforeLen: before.length, afterLen: after.length });
      console.log(`  ${p.slug} (${p.id}): invalid=${invalidCount} unchanged=${ok} before=${before.length} after=${after.length}`);
      if (!ok) {
        for (let i = 0; i < Math.min(before.length, after.length); i++) {
          if (before[i] !== after[i]) {
            console.log(`    first delta at ${i}: before="${before.slice(Math.max(0, i-40), i+40)}" after="${after.slice(Math.max(0, i-40), i+40)}"`);
            break;
          }
        }
      }
    }
  } finally {
    await browser.close();
  }
  writeFileSync(`${OUT}/bio-nav-roundtrip.json`, JSON.stringify(results, null, 2));
  const bad = results.filter(r => !r.unchanged || r.invalidBlocks > 0);
  console.log(bad.length ? `FAIL: ${bad.length} page(s) with issues` : 'OK: all 3 pages unchanged and no validation warnings');
  process.exit(bad.length ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
