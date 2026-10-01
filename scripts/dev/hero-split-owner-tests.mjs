/*
 * Owner tests for bozzies/hero-split:
 *   A. Insert via inserter → default attrs (align='full', height='tall',
 *      all text attrs empty, no image).
 *   B. Set imageCredit via sidebar TextControl → confirm attribute
 *      persists into post_content JSON and rendered front
 *      <p class="hero__credit hero__credit--split"><span>…</span></p> shows
 *      the new value. Toggle height via sidebar SelectControl and confirm
 *      the front section carries .hero--medium.
 *   C. Insert with pre-typed title/subtitle/tagline/eyebrow/imageCredit +
 *      an image reference → confirm serialized JSON + rendered front DOM
 *      matches Astro's exact hero--split shape:
 *        section.hero.hero--split.hero--tall.hero--center
 *          > div.hero__split
 *            > div.hero__image-panel
 *              > img.hero__image.hero__image--split
 *              > div.hero__tint.hero__tint--gradient
 *              > div.hero__frame (4 svg corners)
 *              > p.hero__credit.hero__credit--split > span
 *            > div.hero__text-panel
 *              > div.hero__text-inner
 *                > span.eyebrow.hero__eyebrow
 *                > h1.hero__title.hero__title--split
 *                > div.hero__glyph
 *                > p.hero__subtitle.hero__subtitle--split
 *                > p.hero__tagline
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
const OUT = resolve(__dirname, '../../_screens/hero-split-verify');
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
    const block = createBlock('bozzies/hero-split', a);
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
    await newDraftPage(page, 'Hero split — Test A');
    const clientA = await insertBlock(page);
    const attrsA = await readAttrs(page, clientA);
    const childCountA = await readChildCount(page, clientA);
    results.A.attrs = attrsA;
    results.A.childCount = childCountA;
    console.log('  attrs:', JSON.stringify(attrsA));
    console.log('  child count:', childCountA);
    trashIds.push(await getPostId(page));

    // --- Test B: sidebar imageCredit + height mutation --------------------
    console.log('\n=== Test B: sidebar imageCredit + height mutation');
    await newDraftPage(page, 'Hero split — Test B');
    const clientB = await insertBlock(page, {
      title: 'Meet the Boswells',
      subtitle: 'Martha, Connie and Vet.',
      imageCredit: 'c. 1932',
      height: 'tall',
      image: { id: 45, url: 'http://localhost:8888/wp-content/uploads/2026/09/boswell.jpg', alt: 'Portrait' },
      imageAlt: 'Portrait',
    });
    await updateBlockAttr(page, clientB, 'imageCredit', 'PRESERVE ME');
    await updateBlockAttr(page, clientB, 'height', 'medium');
    const attrsAfterB = await readAttrs(page, clientB);
    results.B.creditAfter = attrsAfterB.imageCredit;
    results.B.heightAfter = attrsAfterB.height;
    results.B.mutated = attrsAfterB.imageCredit === 'PRESERVE ME' && attrsAfterB.height === 'medium';
    console.log(`  imageCredit=${attrsAfterB.imageCredit}  height=${attrsAfterB.height}  mutated=${results.B.mutated}`);
    const linkB = await saveAndPublish(page);
    const idB = await getPostId(page);
    trashIds.push(idB);
    const contentB = await readContent(idB);
    results.B.serializedContainsCredit = contentB.includes('"imageCredit":"PRESERVE ME"');
    results.B.serializedContainsHeight = contentB.includes('"height":"medium"');
    console.log(`  serialized contains imageCredit: ${results.B.serializedContainsCredit}`);
    console.log(`  serialized contains height:      ${results.B.serializedContainsHeight}`);
    await page.goto(linkB, { waitUntil: 'networkidle' });
    results.B.frontHasMediumHeight = await page.evaluate(() =>
      !!document.querySelector('section.hero.hero--split.hero--medium')
    );
    results.B.frontHasCredit = await page.evaluate(() => {
      const p = document.querySelector('.hero__credit.hero__credit--split > span');
      return !!p && p.textContent.trim() === 'PRESERVE ME';
    });
    console.log(`  front section has .hero--medium: ${results.B.frontHasMediumHeight}`);
    console.log(`  front credit reads "PRESERVE ME": ${results.B.frontHasCredit}`);

    // --- Test C: pre-typed content ---------------------------------------
    console.log('\n=== Test C: pre-typed content');
    await newDraftPage(page, 'Hero split — Test C');
    await insertBlock(page, {
      eyebrow: 'Test eyebrow',
      title: 'Hero split test title',
      subtitle: 'A supporting subtitle here.',
      tagline: 'Optional tagline copy.',
      imageCredit: 'Credit © 2026',
      height: 'tall',
      image: { id: 45, url: 'http://localhost:8888/wp-content/uploads/2026/09/boswell.jpg', alt: 'Portrait alt for test C' },
      imageAlt: 'Portrait alt for test C',
    });
    const linkC = await saveAndPublish(page);
    const idC = await getPostId(page);
    trashIds.push(idC);
    const contentC = await readContent(idC);
    results.C.serializedHasTitle       = contentC.includes('"title":"Hero split test title"');
    results.C.serializedHasSubtitle    = contentC.includes('"subtitle":"A supporting subtitle here."');
    results.C.serializedHasTagline     = contentC.includes('"tagline":"Optional tagline copy."');
    results.C.serializedHasEyebrow     = contentC.includes('"eyebrow":"Test eyebrow"');
    results.C.serializedHasImageCredit = contentC.includes('"imageCredit":"Credit \\u00a9 2026"') || contentC.includes('"imageCredit":"Credit © 2026"');
    results.C.serializedHasImageId     = contentC.includes('"id":45');
    console.log(`  serialized has title:       ${results.C.serializedHasTitle}`);
    console.log(`  serialized has subtitle:    ${results.C.serializedHasSubtitle}`);
    console.log(`  serialized has tagline:     ${results.C.serializedHasTagline}`);
    console.log(`  serialized has eyebrow:     ${results.C.serializedHasEyebrow}`);
    console.log(`  serialized has imageCredit: ${results.C.serializedHasImageCredit}`);
    console.log(`  serialized has image id:    ${results.C.serializedHasImageId}`);
    await page.goto(linkC, { waitUntil: 'networkidle' });
    results.C.outerShape = await page.evaluate(() => !!document.querySelector(
      'section.hero.hero--split.hero--tall.hero--center > div.hero__split > div.hero__image-panel'
    ));
    results.C.innerContent = await page.evaluate(() => {
      const inner = document.querySelector('.hero__text-inner');
      if (!inner) return false;
      const eb  = inner.querySelector('span.eyebrow.hero__eyebrow');
      const h1  = inner.querySelector('h1.hero__title.hero__title--split');
      const gl  = inner.querySelector('div.hero__glyph');
      const sub = inner.querySelector('p.hero__subtitle.hero__subtitle--split');
      const tag = inner.querySelector('p.hero__tagline');
      return eb && eb.textContent.trim() === 'Test eyebrow'
        && h1 && h1.textContent.trim() === 'Hero split test title'
        && gl
        && sub && sub.textContent.trim() === 'A supporting subtitle here.'
        && tag && tag.textContent.trim() === 'Optional tagline copy.';
    });
    results.C.imagePanel = await page.evaluate(() => {
      const img = document.querySelector('.hero__image-panel > img.hero__image.hero__image--split');
      const tint = document.querySelector('.hero__image-panel > .hero__tint.hero__tint--gradient');
      const frame = document.querySelector('.hero__image-panel > .hero__frame');
      const corners = document.querySelectorAll('.hero__frame > svg.hero__frame-corner');
      const credit = document.querySelector('.hero__image-panel > p.hero__credit.hero__credit--split > span');
      return !!img && !!tint && !!frame && corners.length === 4
        && !!credit && credit.textContent.trim() === 'Credit © 2026';
    });
    console.log(`  outer DOM shape:  ${results.C.outerShape}`);
    console.log(`  text panel:       ${results.C.innerContent}`);
    console.log(`  image panel:      ${results.C.imagePanel}`);
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

  writeFileSync(`${OUT}/hero-split-owner-tests.json`, JSON.stringify(results, null, 2));
  console.log('\n=== Summary');
  const summary = {
    A_default_align:      results.A.attrs?.align === 'full',
    A_default_height:     results.A.attrs?.height === 'tall',
    A_empty_title:        results.A.attrs?.title === '',
    A_empty_subtitle:     results.A.attrs?.subtitle === '',
    A_no_image:           !results.A.attrs?.image,
    A_no_children:        results.A.childCount === 0,
    B_sidebar_mutates:    results.B.mutated,
    B_persists_credit:    results.B.serializedContainsCredit,
    B_persists_height:    results.B.serializedContainsHeight,
    B_front_medium:       results.B.frontHasMediumHeight,
    B_front_credit:       results.B.frontHasCredit,
    C_all_fields_persist: !!(results.C.serializedHasTitle && results.C.serializedHasSubtitle && results.C.serializedHasTagline && results.C.serializedHasEyebrow && results.C.serializedHasImageCredit && results.C.serializedHasImageId),
    C_outer_shape:        results.C.outerShape,
    C_text_panel:         results.C.innerContent,
    C_image_panel:        results.C.imagePanel,
    cleanup:              results.cleanup,
  };
  console.log(JSON.stringify(summary, null, 2));
  const passes = Object.entries(summary).filter(([k]) => k !== 'cleanup').every(([, v]) => v === true);
  process.exit(passes ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });
