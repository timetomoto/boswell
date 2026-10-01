/*
 * Owner tests for bozzies/see-also:
 *   A. Insert bozzies/see-also via inserter → default attrs (eyebrow="See also",
 *      ctaLabel="Explore", align="full"), 0 inner blocks (attributes-only).
 *   B. Set href via sidebar TextControl (updateBlockAttributes call path) →
 *      confirm attribute persists into post_content JSON and rendered front
 *      <a class="see-also__card"> href matches.
 *   C. Insert with pre-typed eyebrow/title/body/ctaLabel/href → confirm
 *      serialized post_content JSON has them and rendered front DOM matches
 *      Astro's exact shape (section.section.ground-gold.see-also >
 *      div.container.see-also__grid > a.see-also__card >
 *      span.eyebrow.see-also__eyebrow + h2.see-also__title +
 *      p.see-also__body + span.see-also__cta > svg).
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
    const block = createBlock('bozzies/see-also', a);
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
    await newDraftPage(page, 'See also — Test A');
    const clientA = await insertBlock(page);
    const attrsA = await readAttrs(page, clientA);
    const childCountA = await readChildCount(page, clientA);
    results.A.attrs = attrsA;
    results.A.childCount = childCountA;
    console.log('  attrs:', JSON.stringify(attrsA));
    console.log('  child count:', childCountA);
    await page.screenshot({ path: `${OUT}/see-also-testA-editor.png`, fullPage: false });
    trashIds.push(await getPostId(page));

    // --- Test B: sidebar TextControl → href mutation ----------------------
    console.log('\n=== Test B: sidebar href mutation');
    await newDraftPage(page, 'See also — Test B');
    const clientB = await insertBlock(page, {
      eyebrow: 'See also',
      title:   'The full discography',
      body:    'Body copy.',
      href:    '/media/discography/',
      ctaLabel:'Browse the sessions',
    });
    // Same call path the sidebar TextControl fires: updateBlockAttributes.
    await updateBlockAttr(page, clientB, 'href', '/media/charts/');
    const hrefAfter = await page.evaluate((cid) =>
      wp.data.select('core/block-editor').getBlock(cid).attributes.href
    , clientB);
    results.B.hrefAfter = hrefAfter;
    results.B.mutated = hrefAfter === '/media/charts/';
    console.log(`  href after sidebar update: ${hrefAfter}  mutated=${results.B.mutated}`);
    await page.screenshot({ path: `${OUT}/see-also-testB-editor.png`, fullPage: false });
    const linkB = await saveAndPublish(page);
    const idB = await getPostId(page);
    trashIds.push(idB);
    const contentB = await readContent(idB);
    results.B.serializedContainsHref = contentB.includes('"href":"/media/charts/"');
    console.log(`  serialized contains href: ${results.B.serializedContainsHref}`);
    await page.goto(linkB, { waitUntil: 'networkidle' });
    results.B.frontShowsHref = await page.evaluate(() => {
      const a = document.querySelector('a.see-also__card');
      return a && a.getAttribute('href') === '/media/charts/';
    });
    console.log(`  front <a class="see-also__card"> href matches: ${results.B.frontShowsHref}`);

    // --- Test C: pre-typed content ---------------------------------------
    console.log('\n=== Test C: pre-typed content');
    await newDraftPage(page, 'See also — Test C');
    await insertBlock(page, {
      eyebrow: 'Field Guide',
      title:   'Chart positions',
      body:    'The discography catalogs every session; charts show how the records actually sold.',
      href:    '/media/charts/',
      ctaLabel:'Open the charts',
    });
    await page.screenshot({ path: `${OUT}/see-also-testC-editor.png`, fullPage: false });
    const linkC = await saveAndPublish(page);
    const idC = await getPostId(page);
    trashIds.push(idC);
    const contentC = await readContent(idC);
    results.C.serializedHasTitle    = contentC.includes('"title":"Chart positions"');
    results.C.serializedHasEyebrow  = contentC.includes('"eyebrow":"Field Guide"');
    results.C.serializedHasCta      = contentC.includes('"ctaLabel":"Open the charts"');
    results.C.serializedHasBody     = contentC.includes('every session');
    console.log(`  serialized has title:    ${results.C.serializedHasTitle}`);
    console.log(`  serialized has eyebrow:  ${results.C.serializedHasEyebrow}`);
    console.log(`  serialized has ctaLabel: ${results.C.serializedHasCta}`);
    console.log(`  serialized has body:     ${results.C.serializedHasBody}`);
    await page.goto(linkC, { waitUntil: 'networkidle' });
    results.C.outerShape = await page.evaluate(() => !!document.querySelector(
      'section.section.ground-gold.see-also > div.container.see-also__grid > a.see-also__card'
    ));
    results.C.innerContent = await page.evaluate(() => {
      const a = document.querySelector('a.see-also__card');
      if (!a) return false;
      const eb  = a.querySelector('.eyebrow.see-also__eyebrow');
      const h2  = a.querySelector('h2.see-also__title');
      const p   = a.querySelector('p.see-also__body');
      const cta = a.querySelector('.see-also__cta');
      return a.getAttribute('href') === '/media/charts/'
        && eb && eb.textContent.trim() === 'Field Guide'
        && h2 && h2.textContent.trim() === 'Chart positions'
        && p  && p.textContent.includes('every session')
        && cta && cta.textContent.includes('Open the charts')
        && !!cta.querySelector('svg');
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

  writeFileSync(`${OUT}/see-also-owner-tests.json`, JSON.stringify(results, null, 2));
  console.log('\n=== Summary');
  const summary = {
    A_default_align:        results.A.attrs?.align === 'full',
    A_default_eyebrow:      results.A.attrs?.eyebrow === 'See also',
    A_default_cta:          results.A.attrs?.ctaLabel === 'Explore',
    A_no_children:          results.A.childCount === 0,
    B_sidebar_mutates:      results.B.mutated,
    B_persists:             results.B.serializedContainsHref,
    B_front_href:           results.B.frontShowsHref,
    C_all_fields_persist:   !!(results.C.serializedHasTitle && results.C.serializedHasEyebrow && results.C.serializedHasCta && results.C.serializedHasBody),
    C_outer_shape:          results.C.outerShape,
    C_inner_content:        results.C.innerContent,
    cleanup:                results.cleanup,
  };
  console.log(JSON.stringify(summary, null, 2));
  const passes = Object.entries(summary).filter(([k]) => k !== 'cleanup').every(([, v]) => v === true);
  process.exit(passes ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });
