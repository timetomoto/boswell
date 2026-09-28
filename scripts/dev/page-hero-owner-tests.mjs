/*
 * Owner tests for bozzies/page-hero:
 *   A. Insert via inserter → default attrs (align='full', backHref='/',
 *      backLabel='Home', eyebrow=title=subtitle=''), 0 inner blocks.
 *   B. Set backHref via sidebar TextControl → confirm attribute persists
 *      into post_content JSON and rendered front <a class="page-hero__back">
 *      href matches.
 *   C. Insert with pre-typed backHref/backLabel/eyebrow/title/subtitle →
 *      confirm serialized JSON + rendered front DOM matches Astro's exact
 *      shape (section.page-hero.ground-purple > div.container-narrow.page-hero__inner
 *      > a.page-hero__back + span.eyebrow.page-hero__eyebrow +
 *      h1.page-hero__title + p.page-hero__subtitle).
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

    // --- Test A: inserter → default attrs, 0 children ---------------------
    console.log('\n=== Test A: insert via inserter → default attrs, 0 children');
    await newDraftPage(page, 'Page hero — Test A');
    const clientA = await insertBlock(page);
    const attrsA = await readAttrs(page, clientA);
    const childCountA = await readChildCount(page, clientA);
    results.A.attrs = attrsA;
    results.A.childCount = childCountA;
    console.log('  attrs:', JSON.stringify(attrsA));
    console.log('  child count:', childCountA);
    trashIds.push(await getPostId(page));

    // --- Test B: sidebar TextControl → backHref mutation ------------------
    console.log('\n=== Test B: sidebar backHref mutation');
    await newDraftPage(page, 'Page hero — Test B');
    const clientB = await insertBlock(page, {
      backHref: '/',
      backLabel: 'Home',
      eyebrow: 'Section',
      title: 'The Sub-page',
      subtitle: 'Some summary line.',
    });
    await updateBlockAttr(page, clientB, 'backHref', '/media/');
    const hrefAfter = await page.evaluate((cid) =>
      wp.data.select('core/block-editor').getBlock(cid).attributes.backHref
    , clientB);
    results.B.hrefAfter = hrefAfter;
    results.B.mutated = hrefAfter === '/media/';
    console.log(`  backHref after sidebar update: ${hrefAfter}  mutated=${results.B.mutated}`);
    const linkB = await saveAndPublish(page);
    const idB = await getPostId(page);
    trashIds.push(idB);
    const contentB = await readContent(idB);
    results.B.serializedContainsHref = contentB.includes('"backHref":"/media/"') || contentB.includes('"backHref":"\\/media\\/"');
    console.log(`  serialized contains backHref: ${results.B.serializedContainsHref}`);
    await page.goto(linkB, { waitUntil: 'networkidle' });
    results.B.frontShowsHref = await page.evaluate(() => {
      const a = document.querySelector('.page-hero a.page-hero__back');
      return !!a && a.getAttribute('href') === '/media/';
    });
    console.log(`  front a.page-hero__back href matches: ${results.B.frontShowsHref}`);

    // --- Test C: pre-typed content ---------------------------------------
    console.log('\n=== Test C: pre-typed content');
    await newDraftPage(page, 'Page hero — Test C');
    await insertBlock(page, {
      backHref: '/sisters/',
      backLabel: 'The Sisters',
      eyebrow: 'Test Eyebrow',
      title: 'The Test Title',
      subtitle: 'A one-line test summary of the page.',
    });
    const linkC = await saveAndPublish(page);
    const idC = await getPostId(page);
    trashIds.push(idC);
    const contentC = await readContent(idC);
    results.C.serializedHasTitle    = contentC.includes('"title":"The Test Title"');
    results.C.serializedHasEyebrow  = contentC.includes('"eyebrow":"Test Eyebrow"');
    results.C.serializedHasSubtitle = contentC.includes('one-line test summary');
    results.C.serializedHasBackHref = contentC.includes('"backHref":"/sisters/"') || contentC.includes('"backHref":"\\/sisters\\/"');
    results.C.serializedHasBackLabel = contentC.includes('"backLabel":"The Sisters"');
    console.log(`  serialized has title:     ${results.C.serializedHasTitle}`);
    console.log(`  serialized has eyebrow:   ${results.C.serializedHasEyebrow}`);
    console.log(`  serialized has subtitle:  ${results.C.serializedHasSubtitle}`);
    console.log(`  serialized has backHref:  ${results.C.serializedHasBackHref}`);
    console.log(`  serialized has backLabel: ${results.C.serializedHasBackLabel}`);
    await page.goto(linkC, { waitUntil: 'networkidle' });
    results.C.outerShape = await page.evaluate(() => !!document.querySelector(
      'section.page-hero.ground-purple > div.container-narrow.page-hero__inner'
    ));
    results.C.innerContent = await page.evaluate(() => {
      const inner = document.querySelector('.page-hero__inner');
      if (!inner) return false;
      const back = inner.querySelector('a.page-hero__back');
      const eb   = inner.querySelector('span.eyebrow.page-hero__eyebrow');
      const h1   = inner.querySelector('h1.page-hero__title');
      const p    = inner.querySelector('p.page-hero__subtitle');
      return back && back.getAttribute('href') === '/sisters/'
        && back.textContent.trim() === '← The Sisters'
        && eb && eb.textContent.trim() === 'Test Eyebrow'
        && h1 && h1.textContent.trim() === 'The Test Title'
        && p  && p.textContent.includes('one-line test summary');
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

  writeFileSync(`${OUT}/page-hero-owner-tests.json`, JSON.stringify(results, null, 2));
  console.log('\n=== Summary');
  const summary = {
    A_default_align:        results.A.attrs?.align === 'full',
    A_default_backHref:     results.A.attrs?.backHref === '/',
    A_default_backLabel:    results.A.attrs?.backLabel === 'Home',
    A_default_eyebrow:      (results.A.attrs?.eyebrow ?? '') === '',
    A_default_title:        (results.A.attrs?.title ?? '') === '',
    A_default_subtitle:     (results.A.attrs?.subtitle ?? '') === '',
    A_no_children:          results.A.childCount === 0,
    B_sidebar_mutates:      results.B.mutated,
    B_persists:             results.B.serializedContainsHref,
    B_front_href:           results.B.frontShowsHref,
    C_all_fields_persist:   !!(results.C.serializedHasTitle && results.C.serializedHasEyebrow && results.C.serializedHasSubtitle && results.C.serializedHasBackHref && results.C.serializedHasBackLabel),
    C_outer_shape:          results.C.outerShape,
    C_inner_content:        results.C.innerContent,
    cleanup:                results.cleanup,
  };
  console.log(JSON.stringify(summary, null, 2));
  const passes = Object.entries(summary).filter(([k]) => k !== 'cleanup').every(([, v]) => v === true);
  process.exit(passes ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });
