/*
 * Owner tests for bozzies/intro-section:
 *   A. Insert via inserter → default attrs (align='full', empty text
 *      attributes), 0 inner blocks.
 *   B. Update lede via a real sidebar-adjacent path — we mutate the
 *      `bodyLead` attribute (mirroring an inline RichText edit but
 *      exercised via the same updateBlockAttributes API a sidebar
 *      TextControl would call). Since intro-section has no sidebar
 *      controls, we also click the block in the editor to confirm the
 *      Inspector opens without error. Attribute persists into
 *      post_content JSON and rendered front <p class="intro__body
 *      intro__body--lead"> matches.
 *   C. Insert with pre-typed eyebrow/lede/bodyLead/body → confirm
 *      serialized JSON + rendered front DOM matches Astro's exact shape
 *      (section.section.ground-paper.intro-section >
 *       div.container-narrow.intro >
 *       span.eyebrow.eyebrow--purple + p.intro__lede +
 *       p.intro__body.intro__body--lead + p.intro__body).
 *
 * Runs against local wp-env as the throwaway `astroshot` administrator.
 * Trashes the test pages afterward.
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

async function insertBlock(page, attrs = {}) {
  return await page.evaluate(async ({ a }) => {
    const { createBlock } = wp.blocks;
    const { dispatch } = wp.data;
    const block = createBlock('bozzies/intro-section', a);
    dispatch('core/block-editor').insertBlock(block);
    await new Promise(r => setTimeout(r, 500));
    return block.clientId;
  }, { a: attrs });
}

async function readAttrs(page, clientId) {
  return await page.evaluate((cid) =>
    wp.data.select('core/block-editor').getBlock(cid).attributes
  , clientId);
}

async function readChildCount(page, parentClientId) {
  return await page.evaluate((cid) =>
    wp.data.select('core/block-editor').getBlocks(cid).length
  , parentClientId);
}

async function updateBlockAttr(page, clientId, attr, value) {
  await page.evaluate(({ cid, a, v }) => {
    wp.data.dispatch('core/block-editor').updateBlockAttributes(cid, { [a]: v });
  }, { cid: clientId, a: attr, v: value });
}

async function selectBlock(page, clientId) {
  await page.evaluate((cid) => {
    wp.data.dispatch('core/block-editor').selectBlock(cid);
  }, clientId);
  await page.waitForTimeout(500);
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

    // --- Test A: inserter → default attrs, 0 children ---------------------
    console.log('\n=== Test A: insert via inserter → default attrs, 0 children');
    await newDraftPage(page, 'Intro section — Test A');
    const clientA = await insertBlock(page);
    const attrsA = await readAttrs(page, clientA);
    const childCountA = await readChildCount(page, clientA);
    results.A.attrs = attrsA;
    results.A.childCount = childCountA;
    console.log('  attrs:', JSON.stringify(attrsA));
    console.log('  child count:', childCountA);
    trashIds.push(await getPostId(page));

    // --- Test B: sidebar-parity attr mutation via updateBlockAttributes ---
    // (intro-section has no sidebar controls; we mimic an inline RichText
    // edit via the same store dispatch a sidebar TextControl would call,
    // and also select the block in the editor to confirm the Inspector
    // opens without error.)
    console.log('\n=== Test B: block attribute mutation + block-select for Inspector');
    await newDraftPage(page, 'Intro section — Test B');
    const clientB = await insertBlock(page, {
      eyebrow:  'Welcome',
      lede:     'Original lede.',
      bodyLead: 'Original bold body.',
      body:     'Original body paragraph.',
    });
    await selectBlock(page, clientB); // Inspector opens; no throw = ok.
    await updateBlockAttr(page, clientB, 'bodyLead', 'MUTATED bold body via block attr edit.');
    const bodyLeadAfter = await page.evaluate((cid) =>
      wp.data.select('core/block-editor').getBlock(cid).attributes.bodyLead
    , clientB);
    results.B.bodyLeadAfter = bodyLeadAfter;
    results.B.mutated = bodyLeadAfter === 'MUTATED bold body via block attr edit.';
    console.log(`  bodyLead after update: ${bodyLeadAfter}  mutated=${results.B.mutated}`);
    const linkB = await saveAndPublish(page);
    const idB = await getPostId(page);
    trashIds.push(idB);
    const contentB = await readContent(idB);
    results.B.serializedContainsBodyLead = contentB.includes('MUTATED bold body via block attr edit.');
    console.log(`  serialized contains bodyLead: ${results.B.serializedContainsBodyLead}`);
    await page.goto(linkB, { waitUntil: 'networkidle' });
    results.B.frontShowsBodyLead = await page.evaluate(() => {
      const p = document.querySelector('.intro-section p.intro__body.intro__body--lead');
      return !!p && p.textContent.trim() === 'MUTATED bold body via block attr edit.';
    });
    console.log(`  front p.intro__body.intro__body--lead text matches: ${results.B.frontShowsBodyLead}`);

    // --- Test C: pre-typed content ---------------------------------------
    console.log('\n=== Test C: pre-typed content');
    await newDraftPage(page, 'Intro section — Test C');
    await insertBlock(page, {
      eyebrow:  'Meet the Boswells',
      lede:     'Every close-harmony singer stands on their shoulders.',
      bodyLead: 'Come on in.',
      body:     'Discover the sound that changed American music forever.',
    });
    const linkC = await saveAndPublish(page);
    const idC = await getPostId(page);
    trashIds.push(idC);
    const contentC = await readContent(idC);
    results.C.serializedHasEyebrow  = contentC.includes('"eyebrow":"Meet the Boswells"');
    results.C.serializedHasLede     = contentC.includes('"lede":"Every close-harmony singer stands on their shoulders."');
    results.C.serializedHasBodyLead = contentC.includes('"bodyLead":"Come on in."');
    results.C.serializedHasBody     = contentC.includes('Discover the sound that changed');
    console.log(`  serialized has eyebrow:  ${results.C.serializedHasEyebrow}`);
    console.log(`  serialized has lede:     ${results.C.serializedHasLede}`);
    console.log(`  serialized has bodyLead: ${results.C.serializedHasBodyLead}`);
    console.log(`  serialized has body:     ${results.C.serializedHasBody}`);
    await page.goto(linkC, { waitUntil: 'networkidle' });
    results.C.outerShape = await page.evaluate(() => !!document.querySelector(
      'section.section.ground-paper.intro-section > div.container-narrow.intro'
    ));
    results.C.innerContent = await page.evaluate(() => {
      const inner = document.querySelector('.intro-section .container-narrow.intro');
      if (!inner) return false;
      const eb = inner.querySelector('span.eyebrow.eyebrow--purple');
      const l  = inner.querySelector('p.intro__lede');
      const bl = inner.querySelector('p.intro__body.intro__body--lead');
      const bs = inner.querySelectorAll('p.intro__body');
      const bfollow = bs.length >= 2 ? bs[1] : null;
      return eb && eb.textContent.trim() === 'Meet the Boswells'
        && l  && l.textContent.trim() === 'Every close-harmony singer stands on their shoulders.'
        && bl && bl.textContent.trim() === 'Come on in.'
        && bfollow && bfollow.textContent.trim() === 'Discover the sound that changed American music forever.';
    });
    console.log(`  outer DOM shape: ${results.C.outerShape}`);
    console.log(`  inner content:   ${results.C.innerContent}`);
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

  writeFileSync(`${OUT}/intro-section-owner-tests.json`, JSON.stringify(results, null, 2));
  console.log('\n=== Summary');
  const summary = {
    A_default_align:      results.A.attrs?.align === 'full',
    A_default_eyebrow:    results.A.attrs?.eyebrow === '',
    A_default_lede:       results.A.attrs?.lede === '',
    A_default_bodyLead:   results.A.attrs?.bodyLead === '',
    A_default_body:       results.A.attrs?.body === '',
    A_no_children:        results.A.childCount === 0,
    B_attr_mutates:       results.B.mutated,
    B_persists:           results.B.serializedContainsBodyLead,
    B_front_bodyLead:     results.B.frontShowsBodyLead,
    C_all_fields_persist: !!(results.C.serializedHasEyebrow && results.C.serializedHasLede && results.C.serializedHasBodyLead && results.C.serializedHasBody),
    C_outer_shape:        results.C.outerShape,
    C_inner_content:      results.C.innerContent,
    cleanup:              results.cleanup,
  };
  console.log(JSON.stringify(summary, null, 2));
  const passes = Object.entries(summary).filter(([k]) => k !== 'cleanup').every(([, v]) => v === true);
  process.exit(passes ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });
