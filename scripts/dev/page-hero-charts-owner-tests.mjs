/*
 * Owner tests for bozzies/page-hero with the new backdrop:"vinyl" option:
 *   A. Insert via inserter → default attrs (backdrop='none' by default).
 *   B. Mutate the SelectControl (backdrop → 'vinyl') via sidebar dispatch,
 *      confirm the attribute persists and the front DOM shows the vinyl
 *      music-backdrop SVG with the right opacity + color.
 *   C. Insert with pre-typed backdrop:'vinyl' + all fields, confirm the
 *      front DOM shape matches Astro's exact charts.astro L11-19 output.
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

    // --- Test A: inserter → default attrs, backdrop='none' -----------------
    console.log('\n=== Test A: insert via inserter → default attrs');
    await newDraftPage(page, 'Page hero vinyl — Test A');
    const clientA = await insertBlock(page);
    const attrsA = await readAttrs(page, clientA);
    const childCountA = await readChildCount(page, clientA);
    results.A.attrs = attrsA;
    results.A.childCount = childCountA;
    console.log('  attrs:', JSON.stringify(attrsA));
    console.log('  child count:', childCountA);
    trashIds.push(await getPostId(page));

    // --- Test B: sidebar SelectControl mutates backdrop → 'vinyl' ----------
    console.log('\n=== Test B: sidebar backdrop mutation to vinyl');
    await newDraftPage(page, 'Page hero vinyl — Test B');
    const clientB = await insertBlock(page, {
      backHref: '/media/',
      backLabel: 'Media',
      eyebrow: 'Discography',
      title: 'On the Charts',
      subtitle: 'Some summary.',
    });
    // Simulates the SelectControl onChange
    await updateBlockAttr(page, clientB, 'backdrop', 'vinyl');
    const attrsAfterB = await readAttrs(page, clientB);
    results.B.backdropAfter = attrsAfterB.backdrop;
    results.B.mutated       = attrsAfterB.backdrop === 'vinyl';
    console.log(`  backdrop after: ${attrsAfterB.backdrop}  mutated=${results.B.mutated}`);
    const linkB = await saveAndPublish(page);
    const idB = await getPostId(page);
    trashIds.push(idB);
    const contentB = await readContent(idB);
    results.B.serializedContainsBackdrop = contentB.includes('"backdrop":"vinyl"');
    console.log(`  serialized contains backdrop:  ${results.B.serializedContainsBackdrop}`);
    await page.goto(linkB, { waitUntil: 'networkidle' });
    results.B.frontShowsBackdrop = await page.evaluate(() => {
      return !!document.querySelector('.page-hero > .music-backdrop svg pattern#vinyl');
    });
    results.B.frontBackdropOpacity = await page.evaluate(() => {
      const mb = document.querySelector('.page-hero > .music-backdrop');
      return mb ? mb.getAttribute('style') : '';
    });
    console.log(`  front .music-backdrop vinyl pattern: ${results.B.frontShowsBackdrop}`);
    console.log(`  front .music-backdrop style: ${results.B.frontBackdropOpacity}`);

    // --- Test C: pre-typed content with backdrop:'vinyl' -------------------
    console.log('\n=== Test C: pre-typed content with backdrop:vinyl');
    await newDraftPage(page, 'Page hero vinyl — Test C');
    await insertBlock(page, {
      backHref: '/media/',
      backLabel: 'Media',
      eyebrow: 'Discography',
      title: 'On the Charts',
      subtitle: 'Boswell Sisters and Connee Boswell chart positions, 1931 onward.',
      backdrop: 'vinyl',
    });
    const linkC = await saveAndPublish(page);
    const idC = await getPostId(page);
    trashIds.push(idC);
    const contentC = await readContent(idC);
    results.C.serializedHasTitle    = contentC.includes('"title":"On the Charts"');
    results.C.serializedHasEyebrow  = contentC.includes('"eyebrow":"Discography"');
    results.C.serializedHasSubtitle = contentC.includes('1931 onward');
    results.C.serializedHasBackHref = contentC.includes('"backHref":"/media/"') || contentC.includes('"backHref":"\\/media\\/"');
    results.C.serializedHasBackLabel = contentC.includes('"backLabel":"Media"');
    results.C.serializedHasBackdrop = contentC.includes('"backdrop":"vinyl"');
    console.log(`  serialized has title:     ${results.C.serializedHasTitle}`);
    console.log(`  serialized has eyebrow:   ${results.C.serializedHasEyebrow}`);
    console.log(`  serialized has subtitle:  ${results.C.serializedHasSubtitle}`);
    console.log(`  serialized has backHref:  ${results.C.serializedHasBackHref}`);
    console.log(`  serialized has backLabel: ${results.C.serializedHasBackLabel}`);
    console.log(`  serialized has backdrop:  ${results.C.serializedHasBackdrop}`);
    await page.goto(linkC, { waitUntil: 'networkidle' });
    results.C.outerShape = await page.evaluate(() => !!document.querySelector(
      'section.page-hero.ground-purple > div.music-backdrop + div.container-narrow.page-hero__inner'
    ));
    results.C.vinylSvgPresent = await page.evaluate(() => !!document.querySelector(
      'section.page-hero.ground-purple > div.music-backdrop svg pattern#vinyl'
    ));
    results.C.innerContent = await page.evaluate(() => {
      const inner = document.querySelector('.page-hero__inner');
      if (!inner) return false;
      const back = inner.querySelector('a.page-hero__back');
      const eb   = inner.querySelector('span.eyebrow.page-hero__eyebrow');
      const h1   = inner.querySelector('h1.page-hero__title');
      const p    = inner.querySelector('p.page-hero__subtitle');
      return back && back.getAttribute('href') === '/media/'
        && back.textContent.trim() === '← Media'
        && eb && eb.textContent.trim() === 'Discography'
        && h1 && h1.textContent.trim() === 'On the Charts'
        && p  && p.textContent.includes('1931 onward');
    });
    console.log(`  outer DOM shape:     ${results.C.outerShape}`);
    console.log(`  vinyl svg present:   ${results.C.vinylSvgPresent}`);
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

  writeFileSync(`${OUT}/page-hero-charts-owner-tests.json`, JSON.stringify(results, null, 2));
  console.log('\n=== Summary');
  const summary = {
    A_default_align:        results.A.attrs?.align === 'full',
    A_default_backdrop:     (results.A.attrs?.backdrop ?? 'none') === 'none',
    A_no_children:          results.A.childCount === 0,
    B_sidebar_mutates:      results.B.mutated,
    B_persists_backdrop:    results.B.serializedContainsBackdrop,
    B_front_vinyl_svg:      results.B.frontShowsBackdrop,
    B_front_style_opacity:  (results.B.frontBackdropOpacity || '').includes('--mb-opacity:0.09') && (results.B.frontBackdropOpacity || '').includes('--mb-color:var(--yellow-soft)'),
    C_all_fields_persist:   !!(results.C.serializedHasTitle && results.C.serializedHasEyebrow && results.C.serializedHasSubtitle && results.C.serializedHasBackHref && results.C.serializedHasBackLabel && results.C.serializedHasBackdrop),
    C_outer_shape:          results.C.outerShape,
    C_vinyl_svg_present:    results.C.vinylSvgPresent,
    C_inner_content:        results.C.innerContent,
    cleanup:                results.cleanup,
  };
  console.log(JSON.stringify(summary, null, 2));
  const passes = Object.entries(summary).filter(([k]) => k !== 'cleanup').every(([, v]) => v === true);
  process.exit(passes ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });
