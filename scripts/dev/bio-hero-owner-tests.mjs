/*
 * Owner tests for bozzies/bio-hero:
 *   A. Insert via block inserter (createBlock + insertBlock) → block appears
 *      with the expected attribute defaults and no inner blocks.
 *   B. Set backLabel via the sidebar TextControl (updateBlockAttributes call
 *      path) → confirm attribute persists into post_content JSON and the
 *      rendered front <a class="bio-hero__back"> shows the new label.
 *   C. Insert with pre-typed nickname/name/pullQuote/attribution → confirm
 *      serialized post_content JSON has all four, and the rendered front
 *      DOM matches Astro's exact shape (section.bio-hero.ground-purple >
 *      div.music-backdrop + div.container-narrow.bio-hero__inner >
 *      a.bio-hero__back + span.eyebrow.bio-hero__eyebrow + h1.bio-hero__name
 *      + blockquote.bio-hero__quote > cite).
 *
 * Runs against local wp-env as the throwaway `astroshot` administrator.
 * Trashes the test pages afterward.
 *
 * Usage: node scripts/dev/bio-hero-owner-tests.mjs
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

async function insertBioHero(page, attrs = {}) {
  return await page.evaluate(async (a) => {
    const { createBlock } = wp.blocks;
    const { dispatch } = wp.data;
    const block = createBlock('bozzies/bio-hero', a);
    dispatch('core/block-editor').insertBlock(block);
    await new Promise(r => setTimeout(r, 500));
    return block.clientId;
  }, attrs);
}

async function readAttrs(page, clientId) {
  return await page.evaluate((cid) =>
    wp.data.select('core/block-editor').getBlock(cid).attributes
  , clientId);
}

async function readChildren(page, parentClientId) {
  return await page.evaluate((cid) =>
    wp.data.select('core/block-editor').getBlocks(cid).map(b => b.name)
  , parentClientId);
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

    // --- Test A: inserter → default attributes, no inner blocks -----------
    console.log('\n=== Test A: insert via inserter → default attributes');
    await newDraftPage(page, 'Bio hero — Test A');
    const parentA = await insertBioHero(page);
    const attrsA = await readAttrs(page, parentA);
    const childrenA = await readChildren(page, parentA);
    results.A.attrs = attrsA;
    results.A.childCount = childrenA.length;
    console.log('  attrs:', JSON.stringify(attrsA));
    console.log('  children:', childrenA.length);
    await page.screenshot({ path: `${OUT}/bio-hero-testA-editor.png`, fullPage: false });
    trashIds.push(await getPostId(page));

    // --- Test B: sidebar TextControl → backLabel mutation -----------------
    console.log('\n=== Test B: sidebar backLabel mutation');
    await newDraftPage(page, 'Bio hero — Test B');
    const parentB = await insertBioHero(page, {
      nickname: 'TestNick', name: 'Test Sister',
      pullQuote: 'A quotable line for the test.',
      pullQuoteAttribution: 'A Reviewer',
    });
    // Same call path the sidebar TextControl fires: updateBlockAttributes.
    await updateBlockAttr(page, parentB, 'backLabel', 'All Sisters');
    const labelAfter = await page.evaluate((cid) =>
      wp.data.select('core/block-editor').getBlock(cid).attributes.backLabel
    , parentB);
    results.B.backLabelAfter = labelAfter;
    results.B.mutated = labelAfter === 'All Sisters';
    console.log(`  backLabel after sidebar update: ${labelAfter}  mutated=${results.B.mutated}`);
    await page.screenshot({ path: `${OUT}/bio-hero-testB-editor.png`, fullPage: false });
    const linkB = await saveAndPublish(page);
    const idB = await getPostId(page);
    trashIds.push(idB);
    const contentB = await readContent(idB);
    results.B.serializedContainsLabel = contentB.includes('"backLabel":"All Sisters"');
    console.log(`  serialized contains backLabel: ${results.B.serializedContainsLabel}`);
    await page.goto(linkB, { waitUntil: 'networkidle' });
    results.B.frontShowsLabel = await page.evaluate(() => {
      const a = document.querySelector('a.bio-hero__back');
      return a && a.textContent.trim() === '← All Sisters';
    });
    console.log(`  front <a class="bio-hero__back"> matches: ${results.B.frontShowsLabel}`);

    // --- Test C: pre-typed nickname/name/pullQuote/attribution ------------
    console.log('\n=== Test C: pre-typed inline fields');
    await newDraftPage(page, 'Bio hero — Test C');
    const parentC = await insertBioHero(page, {
      nickname: 'TBoz',
      name: 'Test Boswell',
      pullQuote: 'They danced through microphone and static alike.',
      pullQuoteAttribution: 'A Fictional Historian',
    });
    await page.screenshot({ path: `${OUT}/bio-hero-testC-editor.png`, fullPage: false });
    const linkC = await saveAndPublish(page);
    const idC = await getPostId(page);
    trashIds.push(idC);
    const contentC = await readContent(idC);
    results.C.serializedHasNickname = contentC.includes('"nickname":"TBoz"');
    results.C.serializedHasName     = contentC.includes('"name":"Test Boswell"');
    results.C.serializedHasQuote    = contentC.includes('"pullQuote":"They danced through microphone and static alike."');
    results.C.serializedHasAttr     = contentC.includes('"pullQuoteAttribution":"A Fictional Historian"');
    console.log(`  serialized has nickname:      ${results.C.serializedHasNickname}`);
    console.log(`  serialized has name:          ${results.C.serializedHasName}`);
    console.log(`  serialized has pullQuote:     ${results.C.serializedHasQuote}`);
    console.log(`  serialized has attribution:   ${results.C.serializedHasAttr}`);
    await page.goto(linkC, { waitUntil: 'networkidle' });
    // Astro DOM shape:
    //   section.bio-hero.ground-purple >
    //     div.music-backdrop + div.container-narrow.bio-hero__inner
    //     bio-hero__inner > a.bio-hero__back + span.eyebrow.bio-hero__eyebrow
    //                     + h1.bio-hero__name + blockquote.bio-hero__quote > cite
    results.C.outerShape = await page.evaluate(() => !!document.querySelector(
      'section.bio-hero.ground-purple > div.music-backdrop + div.container-narrow.bio-hero__inner'
    ));
    results.C.innerShape = await page.evaluate(() => !!document.querySelector(
      'div.container-narrow.bio-hero__inner > a.bio-hero__back'
    ));
    results.C.nicknameSpan = await page.evaluate(() => {
      const el = document.querySelector('span.eyebrow.bio-hero__eyebrow');
      return el && el.textContent.trim() === 'TBoz';
    });
    results.C.nameHeading = await page.evaluate(() => {
      const el = document.querySelector('h1.bio-hero__name');
      return el && el.textContent.trim() === 'Test Boswell';
    });
    results.C.quoteBlock = await page.evaluate(() => {
      const bq = document.querySelector('blockquote.bio-hero__quote');
      if (!bq) return false;
      const cite = bq.querySelector('cite');
      const hasBody = bq.textContent.includes('They danced through microphone and static alike.');
      const hasCite = cite && cite.textContent.trim() === '— A Fictional Historian';
      return hasBody && hasCite;
    });
    console.log(`  outer DOM shape:              ${results.C.outerShape}`);
    console.log(`  inner DOM shape:              ${results.C.innerShape}`);
    console.log(`  nickname span renders:        ${results.C.nicknameSpan}`);
    console.log(`  name h1 renders:              ${results.C.nameHeading}`);
    console.log(`  blockquote + cite render:     ${results.C.quoteBlock}`);
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

  writeFileSync(`${OUT}/bio-hero-owner-tests.json`, JSON.stringify(results, null, 2));
  console.log('\n=== Summary');
  const summary = {
    A_default_attrs_ok:   (results.A.attrs?.backHref === '/sisters/') && (results.A.attrs?.backLabel === 'The Sisters') && (results.A.attrs?.nickname === '') && (results.A.attrs?.name === ''),
    A_no_children:        results.A.childCount === 0,
    B_sidebar_mutates:    results.B.mutated,
    B_persists:           results.B.serializedContainsLabel,
    B_front_label:        results.B.frontShowsLabel,
    C_all_attrs_persist:  !!(results.C.serializedHasNickname && results.C.serializedHasName && results.C.serializedHasQuote && results.C.serializedHasAttr),
    C_outer_shape:        results.C.outerShape,
    C_inner_shape:        results.C.innerShape,
    C_content_renders:    !!(results.C.nicknameSpan && results.C.nameHeading && results.C.quoteBlock),
    cleanup:              results.cleanup,
  };
  console.log(JSON.stringify(summary, null, 2));
  const passes = Object.entries(summary).filter(([k]) => k !== 'cleanup').every(([, v]) => v === true);
  process.exit(passes ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });
