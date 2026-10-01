/*
 * Owner tests for bozzies/page-hero with the new ground:"gold" option:
 *   A. Insert via inserter → default attrs (ground='purple' by default).
 *   B. Mutate the SelectControl (ground → 'gold') via sidebar dispatch,
 *      confirm the attribute persists and the front DOM shows the
 *      .ground-gold class + the .eyebrow.eyebrow--purple eyebrow variant.
 *   C. Insert with pre-typed ground:'gold' + all fields, confirm the
 *      front DOM shape matches Astro's exact bio-resources.astro L12-19
 *      output.
 *
 * Runs against local wp-env as throwaway `astroshot`.
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
    const block = createBlock('bozzies/page-hero', a);
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

    // --- Test A: inserter → default attrs, ground='purple' -----------------
    console.log('\n=== Test A: insert via inserter → default attrs');
    await newDraftPage(page, 'Page hero gold — Test A');
    const clientA = await insertBlock(page);
    const attrsA = await readAttrs(page, clientA);
    const childCountA = await readChildCount(page, clientA);
    results.A.attrs = attrsA;
    results.A.childCount = childCountA;
    console.log('  attrs:', JSON.stringify(attrsA));
    console.log('  child count:', childCountA);
    trashIds.push(await getPostId(page));

    // --- Test B: sidebar SelectControl mutates ground → 'gold' ------------
    console.log('\n=== Test B: sidebar ground mutation to gold');
    await newDraftPage(page, 'Page hero gold — Test B');
    const clientB = await insertBlock(page, {
      backHref: '/sisters/',
      backLabel: 'The Sisters',
      eyebrow: 'A Family Affair',
      title: 'Boz Biography',
      subtitle: 'Some summary.',
    });
    await updateBlockAttr(page, clientB, 'ground', 'gold');
    const attrsAfterB = await readAttrs(page, clientB);
    results.B.groundAfter = attrsAfterB.ground;
    results.B.mutated     = attrsAfterB.ground === 'gold';
    console.log(`  ground after: ${attrsAfterB.ground}  mutated=${results.B.mutated}`);
    const linkB = await saveAndPublish(page);
    const idB = await getPostId(page);
    trashIds.push(idB);
    const contentB = await readContent(idB);
    results.B.serializedContainsGround = contentB.includes('"ground":"gold"');
    console.log(`  serialized contains ground:  ${results.B.serializedContainsGround}`);
    await page.goto(linkB, { waitUntil: 'networkidle' });
    results.B.frontShowsGoldClass = await page.evaluate(() => {
      return !!document.querySelector('section.page-hero.ground-gold');
    });
    results.B.frontShowsPurpleEyebrow = await page.evaluate(() => {
      return !!document.querySelector('section.page-hero.ground-gold .eyebrow.eyebrow--purple');
    });
    results.B.frontHasNoPageHeroEyebrow = await page.evaluate(() => {
      // On the gold hero, .page-hero__eyebrow should NOT be used.
      return !document.querySelector('section.page-hero.ground-gold .page-hero__eyebrow');
    });
    console.log(`  front section.ground-gold: ${results.B.frontShowsGoldClass}`);
    console.log(`  front .eyebrow--purple:    ${results.B.frontShowsPurpleEyebrow}`);
    console.log(`  front no .page-hero__eyebrow: ${results.B.frontHasNoPageHeroEyebrow}`);

    // --- Test C: pre-typed content with ground:'gold' ---------------------
    console.log('\n=== Test C: pre-typed content with ground:gold');
    await newDraftPage(page, 'Page hero gold — Test C');
    await insertBlock(page, {
      backHref: '/sisters/',
      backLabel: 'The Sisters',
      eyebrow: 'A Family Affair',
      title: 'Boz Biography',
      subtitle: 'The definitive family biography of the Boswell Sisters.',
      ground: 'gold',
    });
    const linkC = await saveAndPublish(page);
    const idC = await getPostId(page);
    trashIds.push(idC);
    const contentC = await readContent(idC);
    results.C.serializedHasTitle    = contentC.includes('"title":"Boz Biography"');
    results.C.serializedHasEyebrow  = contentC.includes('"eyebrow":"A Family Affair"');
    results.C.serializedHasSubtitle = contentC.includes('The definitive family biography');
    results.C.serializedHasBackHref = contentC.includes('"backHref":"/sisters/"') || contentC.includes('"backHref":"\\/sisters\\/"');
    results.C.serializedHasBackLabel = contentC.includes('"backLabel":"The Sisters"');
    results.C.serializedHasGround = contentC.includes('"ground":"gold"');
    console.log(`  serialized has title:     ${results.C.serializedHasTitle}`);
    console.log(`  serialized has eyebrow:   ${results.C.serializedHasEyebrow}`);
    console.log(`  serialized has subtitle:  ${results.C.serializedHasSubtitle}`);
    console.log(`  serialized has backHref:  ${results.C.serializedHasBackHref}`);
    console.log(`  serialized has backLabel: ${results.C.serializedHasBackLabel}`);
    console.log(`  serialized has ground:    ${results.C.serializedHasGround}`);
    await page.goto(linkC, { waitUntil: 'networkidle' });
    results.C.outerShape = await page.evaluate(() => !!document.querySelector(
      'section.page-hero.ground-gold > div.container-narrow.page-hero__inner'
    ));
    results.C.innerContent = await page.evaluate(() => {
      const inner = document.querySelector('.page-hero__inner');
      if (!inner) return false;
      const back = inner.querySelector('a.page-hero__back');
      const eb   = inner.querySelector('span.eyebrow.eyebrow--purple');
      const h1   = inner.querySelector('h1.page-hero__title');
      const p    = inner.querySelector('p.page-hero__subtitle');
      return back && back.getAttribute('href') === '/sisters/'
        && back.textContent.trim() === '← The Sisters'
        && eb && eb.textContent.trim() === 'A Family Affair'
        && h1 && h1.textContent.trim() === 'Boz Biography'
        && p  && p.textContent.includes('definitive family biography');
    });
    console.log(`  outer DOM shape:     ${results.C.outerShape}`);
    console.log(`  inner content:       ${results.C.innerContent}`);
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

  writeFileSync(`${OUT}/page-hero-bio-resources-owner-tests.json`, JSON.stringify(results, null, 2));
  console.log('\n=== Summary');
  const summary = {
    A_default_align:        results.A.attrs?.align === 'full',
    A_default_ground:       (results.A.attrs?.ground ?? 'purple') === 'purple',
    A_default_backdrop:     (results.A.attrs?.backdrop ?? 'none') === 'none',
    A_no_children:          results.A.childCount === 0,
    B_sidebar_mutates:      results.B.mutated,
    B_persists_ground:      results.B.serializedContainsGround,
    B_front_gold_class:     results.B.frontShowsGoldClass,
    B_front_purple_eyebrow: results.B.frontShowsPurpleEyebrow,
    B_no_page_hero_eyebrow: results.B.frontHasNoPageHeroEyebrow,
    C_all_fields_persist:   !!(results.C.serializedHasTitle && results.C.serializedHasEyebrow && results.C.serializedHasSubtitle && results.C.serializedHasBackHref && results.C.serializedHasBackLabel && results.C.serializedHasGround),
    C_outer_shape:          results.C.outerShape,
    C_inner_content:        results.C.innerContent,
    cleanup:                results.cleanup,
  };
  console.log(JSON.stringify(summary, null, 2));
  const passes = Object.entries(summary).filter(([k]) => k !== 'cleanup').every(([, v]) => v === true);
  process.exit(passes ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });
