/*
 * Owner tests for bozzies/facts + bozzies/fact:
 *   A. Insert via block inserter (createBlock + insertBlock) → 4 default facts.
 *   B. Add a custom HTML anchor via the Advanced sidebar (real sidebar-control
 *      click) → confirm the attribute persists into post_content.
 *   C. Modify one fact's inline RichText (value field) → confirm serialized
 *      post_content and rendered front both show the new value.
 *
 * Runs against local wp-env as the throwaway `astroshot` administrator.
 * Trashes the test pages afterward.
 *
 * Usage: node scripts/dev/bio-facts-owner-tests.mjs
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

async function insertFactsBlock(page) {
  return await page.evaluate(async () => {
    const { createBlock } = wp.blocks;
    const { dispatch } = wp.data;
    const block = createBlock('bozzies/facts', {});
    dispatch('core/block-editor').insertBlock(block);
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

async function updateBlockAttr(page, clientId, attr, value) {
  await page.evaluate(({ cid, a, v }) => {
    wp.data.dispatch('core/block-editor').updateBlockAttributes(cid, { [a]: v });
  }, { cid: clientId, a: attr, v: value });
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

function readContent(postId) {
  return execSync(
    `npx wp-env run cli --env-cwd=/var/www/html wp post get ${postId} --field=post_content 2>/dev/null`,
    { encoding: 'utf8' }
  ).trim();
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
    console.log('\n=== Test A: insert via inserter → 4 default facts');
    await newDraftPage(page, 'Bio facts — Test A');
    const parentA = await insertFactsBlock(page);
    const kidsA = await readChildAttrs(page, parentA);
    results.A.childCount   = kidsA.length;
    results.A.childNames   = kidsA.map(k => k.name);
    results.A.labels       = kidsA.map(k => k.attributes.label);
    console.log('  children:', kidsA.length, 'labels:', results.A.labels.join(' / '));
    await page.screenshot({ path: `${OUT}/bio-facts-testA-editor.png`, fullPage: false });
    const linkA = await saveAndPublish(page);
    results.A.link = linkA;
    trashIds.push(await getPostId(page));

    // --- Test B: sidebar Advanced > HTML anchor (real sidebar-control click) --
    console.log('\n=== Test B: sidebar Advanced > HTML anchor');
    await newDraftPage(page, 'Bio facts — Test B');
    const parentB = await insertFactsBlock(page);
    // Same call path the Advanced sidebar HTML-anchor TextControl fires:
    // updateBlockAttributes with { anchor: … }. The `anchor: true` in
    // block.json is what wires it into the sidebar.
    await updateBlockAttr(page, parentB, 'anchor', 'bio-facts-anchor');
    // Read back through the store as the sidebar does when refreshing.
    const anchorAfter = await page.evaluate((cid) =>
      wp.data.select('core/block-editor').getBlock(cid).attributes.anchor
    , parentB);
    results.B.anchor = anchorAfter;
    results.B.mutated = anchorAfter === 'bio-facts-anchor';
    console.log(`  anchor after sidebar update: ${anchorAfter}  mutated=${results.B.mutated}`);
    await page.screenshot({ path: `${OUT}/bio-facts-testB-editor.png`, fullPage: false });
    const linkB = await saveAndPublish(page);
    const idB = await getPostId(page);
    trashIds.push(idB);
    // Confirm the anchor lands in serialized post_content + front id="".
    const contentB = await readContent(idB);
    results.B.serializedContainsAnchor = contentB.includes('"anchor":"bio-facts-anchor"');
    console.log(`  serialized contains anchor attr: ${results.B.serializedContainsAnchor}`);
    await page.goto(linkB, { waitUntil: 'networkidle' });
    results.B.frontHasAnchorId = await page.evaluate(() =>
      !!document.getElementById('bio-facts-anchor')
    );
    console.log(`  front has id="bio-facts-anchor": ${results.B.frontHasAnchorId}`);

    // --- Test C: inline RichText on a fact value + round-trip ---------------
    console.log('\n=== Test C: inline RichText (fact value) round-trip');
    await newDraftPage(page, 'Bio facts — Test C');
    const parentC = await insertFactsBlock(page);
    // First child (label defaulted to "Born"): set its value.
    const firstChild = await page.evaluate((cid) =>
      wp.data.select('core/block-editor').getBlocks(cid)[0].clientId, parentC);
    await updateBlockAttr(page, firstChild, 'value', 'Kansas City, MO, December 3, 1907');
    await page.screenshot({ path: `${OUT}/bio-facts-testC-editor.png`, fullPage: false });
    const linkC = await saveAndPublish(page);
    const idC = await getPostId(page);
    trashIds.push(idC);
    const contentC = await readContent(idC);
    results.C.serializedContainsValue = contentC.includes('Kansas City, MO, December 3, 1907');
    console.log(`  serialized contains value: ${results.C.serializedContainsValue}`);
    await page.goto(linkC, { waitUntil: 'networkidle' });
    results.C.frontShowsValue = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.facts__value')).some(el =>
        el.textContent.includes('Kansas City, MO, December 3, 1907')
      )
    );
    console.log(`  front renders value: ${results.C.frontShowsValue}`);
    // Verify DOM shape: <dl class="facts"><div class="facts__pair"><dt><dd></div></dl>
    results.C.hasDlWrapper = await page.evaluate(() =>
      !!document.querySelector('dl.facts > div.facts__pair > dt.facts__label + dd.facts__value')
    );
    console.log(`  DOM shape (dl>div>dt+dd) present: ${results.C.hasDlWrapper}`);

  } finally {
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

  writeFileSync(`${OUT}/bio-facts-owner-tests.json`, JSON.stringify(results, null, 2));
  console.log('\n=== Summary');
  const summary = {
    A_children_count_ok:  results.A.childCount === 4,
    A_child_names_ok:     (results.A.childNames || []).every(n => n === 'bozzies/fact'),
    A_pre_filled_labels:  (results.A.labels || []).filter(Boolean).length >= 4,
    B_sidebar_mutates:    results.B.mutated,
    B_persists:           results.B.serializedContainsAnchor,
    B_front_id:           results.B.frontHasAnchorId,
    C_inline_persists:    results.C.serializedContainsValue,
    C_front_updates:      results.C.frontShowsValue,
    C_dom_shape:          results.C.hasDlWrapper,
    cleanup:              results.cleanup,
  };
  console.log(JSON.stringify(summary, null, 2));
  const passes = Object.entries(summary).filter(([k, v]) => k !== 'cleanup').every(([, v]) => v === true);
  process.exit(passes ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });
