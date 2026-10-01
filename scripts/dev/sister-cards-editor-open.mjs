/*
 * Open the imported /sisters/ page (post ID 7) in the block editor as the
 * throwaway `astroshot` admin. Assert:
 *   1. No block validation warnings appear (checkContentValidity returns [])
 *      for the bozzies/sister-cards + bozzies/sister-card blocks.
 *   2. Saving the post produces a byte-identical serialized bozzies/sister-cards
 *      block (round-trip safe).
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
const POST_ID = 7; // /sisters/

function chromePath() {
  for (const p of [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ]) if (existsSync(p)) return p;
  throw new Error('Chrome not found');
}

function extractSisterCardsSlice(content) {
  const start = content.indexOf('<!-- wp:bozzies/sister-cards');
  const end = content.indexOf('<!-- /wp:bozzies/sister-cards -->');
  if (start < 0 || end < 0) return null;
  return content.slice(start, end + '<!-- /wp:bozzies/sister-cards -->'.length);
}

function readPost(id) {
  return execSync(`npx wp-env run cli --env-cwd=/var/www/html wp post get ${id} --field=post_content 2>/dev/null`, { encoding: 'utf8' });
}

async function main() {
  const before = readPost(POST_ID);
  const beforeSlice = extractSisterCardsSlice(before);

  const browser = await chromium.launch({ executablePath: chromePath() });
  const context = await browser.newContext({ deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.setViewportSize({ width: 1600, height: 1000 });

  // Log in.
  await page.goto(`${WP}/wp-login.php`, { waitUntil: 'domcontentloaded' });
  await page.fill('#user_login', 'astroshot');
  await page.fill('#user_pass', 'trialpass123');
  await page.click('#wp-submit');
  await page.waitForURL(/wp-admin/, { timeout: 15000 });

  // Open /sisters/ in the editor.
  await page.goto(`${WP}/wp-admin/post.php?post=${POST_ID}&action=edit`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('iframe[name="editor-canvas"]', { timeout: 30000 });
  await page.waitForTimeout(4000);
  await page.evaluate(() => {
    document.querySelectorAll('.components-modal__screen-overlay, .components-guide').forEach(el => el.remove());
  });

  // Check for validation warnings on our blocks.
  const validity = await page.evaluate(() => {
    const blocks = wp.data.select('core/block-editor').getBlocks();
    const invalid = [];
    const walk = (b) => {
      if (!b.isValid) invalid.push({ name: b.name, id: b.clientId, reason: b.validationIssues || 'unknown' });
      for (const child of (b.innerBlocks || [])) walk(child);
    };
    for (const b of blocks) walk(b);
    return { total: blocks.length, invalid };
  });
  console.log('Validity:', JSON.stringify(validity));

  await page.screenshot({ path: `${OUT}/sister-cards-editor-open.png`, fullPage: false });

  // Save (no changes typed).
  await page.evaluate(async () => {
    await wp.data.dispatch('core/editor').savePost();
  });
  // Wait until dirty flag clears.
  await page.evaluate(async () => {
    for (let i = 0; i < 40; i++) {
      if (!wp.data.select('core/editor').isEditedPostDirty()) return;
      await new Promise(r => setTimeout(r, 250));
    }
  });

  await browser.close();

  const after = readPost(POST_ID);
  const afterSlice = extractSisterCardsSlice(after);

  const roundTripOk = beforeSlice === afterSlice;
  console.log('Round-trip byte-identical:', roundTripOk);
  if (!roundTripOk) {
    writeFileSync(`${OUT}/sister-cards-before.txt`, beforeSlice || '(missing)');
    writeFileSync(`${OUT}/sister-cards-after.txt`, afterSlice  || '(missing)');
    console.log('  (see _screens/rebuild-logs/sister-cards-{before,after}.txt)');
  }

  writeFileSync(`${OUT}/sister-cards-editor-open.json`, JSON.stringify({
    validity,
    roundTripOk,
    postId: POST_ID,
  }, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
