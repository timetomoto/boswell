/*
 * Round-trip test for the footer template-part with bozzies/site-footer inside.
 * Because the block is server-rendered (`save: () => null`), the only content
 * that gets re-serialized on save is the block's opening/self-closing comment.
 * We open the template part in the site editor, save, then compare the DB
 * post_content before/after.
 *
 * We also open every landing/subpage-templated page (which uses the footer
 * template-part) and confirm no invalid blocks are reported and each page's
 * post_content is unchanged.
 *
 * Usage: node scripts/dev/site-footer-roundtrip.mjs
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
  { id: 39, slug: 'home' },
  { id: 7,  slug: 'sisters' },
  { id: 9,  slug: 'media' },
  { id: 8,  slug: 'press' },
  { id: 10, slug: 'about' },
  { id: 15, slug: 'connee' },
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

function readFooterPart() {
  return execSync(
    `npx wp-env run cli --env-cwd=/var/www/html wp post list --post_type=wp_template_part --name=footer --field=post_content 2>/dev/null`,
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

async function openTemplatePartAndSave(page) {
  await page.goto(`${WP}/wp-admin/site-editor.php?postType=wp_template_part&postId=bozzies//footer&canvas=edit`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(6000);
  await page.evaluate(() => {
    document.querySelectorAll('.components-modal__screen-overlay, .components-guide').forEach(el => el.remove());
  });
  const invalidCount = await page.evaluate(() => {
    try {
      const blocks = wp.data.select('core/block-editor').getBlocks();
      let c = 0;
      function count(bs) {
        for (const b of bs) {
          if (b.isValid === false) c += 1;
          if (b.innerBlocks && b.innerBlocks.length) count(b.innerBlocks);
        }
      }
      count(blocks);
      return c;
    } catch (e) { return -1; }
  });
  try {
    await page.evaluate(async () => {
      const store = wp.data.dispatch('core/editor');
      if (store && store.savePost) await store.savePost();
    });
  } catch (e) {}
  await page.waitForTimeout(2500);
  return { invalidCount };
}

async function main() {
  const results = { pages: [], templatePart: null };
  const browser = await chromium.launch({ executablePath: chromePath() });
  const page = await browser.newContext({ deviceScaleFactor: 1 }).then(c => c.newPage());
  await page.setViewportSize({ width: 1600, height: 1000 });

  try {
    await login(page);

    for (const p of PAGES) {
      const before = readContent(p.id);
      const { invalidCount } = await openAndSave(page, p.id);
      const after = readContent(p.id);
      const pageSame = before === after;
      results.pages.push({ slug: p.slug, id: p.id, invalidBlocks: invalidCount, pageUnchanged: pageSame, beforeLen: before.length, afterLen: after.length });
      console.log(`  ${p.slug} (${p.id}): invalid=${invalidCount} pageUnchanged=${pageSame} before=${before.length} after=${after.length}`);
    }

    const tpBefore = readFooterPart();
    const tpRes = await openTemplatePartAndSave(page);
    const tpAfter = readFooterPart();
    results.templatePart = {
      invalidBlocks: tpRes.invalidCount,
      unchanged: tpBefore === tpAfter,
      beforeLen: tpBefore.length,
      afterLen: tpAfter.length,
    };
    console.log(`  footer template-part: invalid=${tpRes.invalidCount} unchanged=${tpBefore === tpAfter} before=${tpBefore.length} after=${tpAfter.length}`);
  } finally {
    await browser.close();
  }
  writeFileSync(`${OUT}/site-footer-roundtrip.json`, JSON.stringify(results, null, 2));
  const badPages = results.pages.filter(r => !r.pageUnchanged || r.invalidBlocks > 0);
  const tpBad = results.templatePart && !results.templatePart.unchanged;
  const ok = badPages.length === 0 && !tpBad;
  console.log(ok ? 'OK' : `FAIL: ${badPages.length} bad pages, templatePart ok=${!tpBad}`);
  process.exit(ok ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });
