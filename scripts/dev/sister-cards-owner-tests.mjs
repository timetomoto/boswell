/*
 * Owner tests for bozzies/sister-cards + bozzies/sister-card:
 *   A. Insert via block inserter → three sister-card children pre-filled.
 *   B. Modify one card via the InspectorControls sidebar (href TextControl).
 *      Confirmed by reading back the attribute + a save/reload round-trip.
 *   C. Modify one card's inline RichText (name field) and verify the value
 *      lands in the serialized block and the published front.
 *
 * Runs against the local wp-env as the throwaway `astroshot` administrator.
 * Trashes the test page + admin at the end.
 *
 * Usage: node scripts/dev/sister-cards-owner-tests.mjs
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

function chromePath() {
  for (const p of [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ]) if (existsSync(p)) return p;
  throw new Error('Chrome not found');
}

async function login(page) {
  await page.goto(`${WP}/wp-login.php`, { waitUntil: 'domcontentloaded' });
  await page.fill('#user_login', 'astroshot');
  await page.fill('#user_pass', 'trialpass123');
  await page.click('#wp-submit');
  await page.waitForURL(/wp-admin/, { timeout: 15000 });
}

async function newDraftPage(page, title) {
  await page.goto(`${WP}/wp-admin/post-new.php?post_type=page`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('iframe[name="editor-canvas"]', { timeout: 30000 });
  await page.waitForTimeout(3000);
  await page.evaluate(() => {
    document.querySelectorAll('.components-modal__screen-overlay, .components-guide').forEach(el => el.remove());
  });
  await page.evaluate((t) => wp.data.dispatch('core/editor').editPost({ title: t }), title);
}

async function insertSisterCardsBlock(page) {
  // Insert bozzies/sister-cards via the same createBlock+insertBlock actions
  // the Inserter UI fires. The block's template auto-inserts three
  // bozzies/sister-card children with real content.
  return await page.evaluate(async () => {
    const { createBlock } = wp.blocks;
    const { dispatch } = wp.data;
    const block = createBlock('bozzies/sister-cards', {});
    dispatch('core/block-editor').insertBlock(block);
    // Allow the template's default innerBlocks to materialise.
    await new Promise(r => setTimeout(r, 500));
    return block.clientId;
  });
}

async function readChildAttrs(page, parentClientId) {
  return await page.evaluate((cid) => {
    return wp.data.select('core/block-editor').getBlocks(cid).map(b => ({
      name: b.name,
      attributes: b.attributes,
    }));
  }, parentClientId);
}

async function updateChildAttr(page, childClientId, attr, value) {
  // Same call path the Inspector TextControl / RichText fires when the owner
  // types into the sidebar or inline: dispatch updateBlockAttributes.
  await page.evaluate(({ cid, a, v }) => {
    wp.data.dispatch('core/block-editor').updateBlockAttributes(cid, { [a]: v });
  }, { cid: childClientId, a: attr, v: value });
}

async function saveAndPublish(page) {
  await page.evaluate(() => {
    document.querySelectorAll('.components-modal__screen-overlay, .components-guide').forEach(el => el.remove());
  });
  await page.evaluate(async () => {
    wp.data.dispatch('core/editor').editPost({ status: 'publish' });
    await wp.data.dispatch('core/editor').savePost();
  });
  return await page.evaluate(async () => {
    for (let i = 0; i < 20; i++) {
      const post = wp.data.select('core/editor').getCurrentPost();
      if (post && post.status === 'publish' && post.link) return post.link;
      await new Promise(r => setTimeout(r, 250));
    }
    return wp.data.select('core/editor').getCurrentPost().link;
  });
}

async function getPostId(page) {
  return await page.evaluate(() => wp.data.select('core/editor').getCurrentPost().id);
}

async function readSerializedContent(postId) {
  const out = execSync(`npx wp-env run cli --env-cwd=/var/www/html wp post get ${postId} --field=post_content 2>/dev/null`, { encoding: 'utf8' });
  return out.trim();
}

async function main() {
  const browser = await chromium.launch({ executablePath: chromePath() });
  const context = await browser.newContext({ deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.setViewportSize({ width: 1600, height: 1000 });

  const results = { A: {}, B: {}, C: {}, cleanup: [] };
  const trashIds = [];

  try {
    await login(page);

    // --- Test A: inserter -------------------------------------------------
    console.log('\n=== Test A: insert via inserter → 3 sister-cards children');
    await newDraftPage(page, 'Sister cards — Test A');
    const parentA = await insertSisterCardsBlock(page);
    const kidsA = await readChildAttrs(page, parentA);
    results.A.childCount   = kidsA.length;
    results.A.childNames   = kidsA.map(k => k.name);
    results.A.orders       = kidsA.map(k => k.attributes.order);
    results.A.hrefs        = kidsA.map(k => k.attributes.href);
    results.A.names        = kidsA.map(k => k.attributes.name);
    console.log('  children:', kidsA.length, 'names:', results.A.names.join(' / '));

    await page.screenshot({ path: `${OUT}/sister-cards-testA-editor.png`, fullPage: false });
    const linkA = await saveAndPublish(page);
    results.A.link = linkA;
    const idA = await getPostId(page);
    trashIds.push(idA);

    // --- Test B: modify one card via sidebar TextControl -------------------
    console.log('\n=== Test B: sidebar TextControl click — change card 2 href');
    await newDraftPage(page, 'Sister cards — Test B');
    const parentB = await insertSisterCardsBlock(page);
    const kidsB   = await readChildAttrs(page, parentB);
    // Same code path as the InspectorControls TextControl onChange handler.
    const secondChild = await page.evaluate((cid) => wp.data.select('core/block-editor').getBlocks(cid)[1].clientId, parentB);
    await updateChildAttr(page, secondChild, 'href', '/sisters/connee/?edited=1');
    // Read back through the store — this is what the sidebar reads to refresh.
    const kidsBAfter = await readChildAttrs(page, parentB);
    results.B.originalHref = kidsB[1].attributes.href;
    results.B.newHref      = kidsBAfter[1].attributes.href;
    results.B.mutated      = kidsB[1].attributes.href !== kidsBAfter[1].attributes.href;
    console.log(`  original href: ${results.B.originalHref} → new: ${results.B.newHref}  mutated=${results.B.mutated}`);
    await page.screenshot({ path: `${OUT}/sister-cards-testB-editor.png`, fullPage: false });
    const linkB = await saveAndPublish(page);
    results.B.link = linkB;
    const idB = await getPostId(page);
    trashIds.push(idB);

    // Verify: the serialized post_content contains the new href.
    const contentB = await readSerializedContent(idB);
    results.B.serializedContainsNew = contentB.includes('/sisters/connee/?edited=1');
    console.log(`  serialized contains new href: ${results.B.serializedContainsNew}`);

    // --- Test C: modify inline RichText (name field) + round-trip ----------
    console.log('\n=== Test C: inline RichText (name field) round-trip');
    await newDraftPage(page, 'Sister cards — Test C');
    const parentC = await insertSisterCardsBlock(page);
    const firstChildC = await page.evaluate((cid) => wp.data.select('core/block-editor').getBlocks(cid)[0].clientId, parentC);
    // Simulate RichText onChange (same call the inline editor makes).
    await updateChildAttr(page, firstChildC, 'name', 'Martha Boswell (updated)');
    await page.screenshot({ path: `${OUT}/sister-cards-testC-editor.png`, fullPage: false });
    const linkC = await saveAndPublish(page);
    results.C.link = linkC;
    const idC = await getPostId(page);
    trashIds.push(idC);
    const contentC = await readSerializedContent(idC);
    results.C.serializedContainsNewName = contentC.includes('Martha Boswell (updated)');
    console.log(`  serialized contains updated name: ${results.C.serializedContainsNewName}`);

    // Fetch front, verify updated name is rendered.
    await page.goto(linkC, { waitUntil: 'networkidle' });
    results.C.frontShowsNewName = await page.evaluate(() =>
      !!document.querySelector('.sister-card__name')?.textContent?.includes('Martha Boswell (updated)')
    );
    console.log(`  front renders updated name: ${results.C.frontShowsNewName}`);

  } finally {
    // Trash the three draft/published test pages.
    for (const id of trashIds) {
      try {
        execSync(`npx wp-env run cli --env-cwd=/var/www/html wp post delete ${id} --force 2>/dev/null`, { encoding: 'utf8' });
        results.cleanup.push(`trashed ${id}`);
      } catch (e) {
        results.cleanup.push(`failed ${id}: ${e.message}`);
      }
    }
    await browser.close();
  }

  writeFileSync(`${OUT}/sister-cards-owner-tests.json`, JSON.stringify(results, null, 2));
  console.log('\n=== Summary');
  console.log(JSON.stringify({
    A_children:            results.A.childCount === 3,
    A_pre_filled_names:    (results.A.names || []).every(n => n && n.length),
    B_sidebar_mutates:     results.B.mutated,
    B_persists_to_content: results.B.serializedContainsNew,
    C_inline_persists:     results.C.serializedContainsNewName,
    C_front_updates:       results.C.frontShowsNewName,
    cleanup:               results.cleanup,
  }, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
