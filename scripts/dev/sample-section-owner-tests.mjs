/*
 * Owner tests for bozzies/sample-section:
 *   A. Insert via inserter → default attrs (align='full', empty eyebrow/
 *      title/body, href default '/media/lessons/1/', ctaLabel 'Play
 *      Lesson 1'), 0 inner blocks.
 *   B. Mutate the sidebar `Lesson URL` TextControl via the same store
 *      dispatch (updateBlockAttributes on `href`), select the block so
 *      the Inspector opens, publish, and confirm the mutated href
 *      persists in post_content JSON and lands on the front `a.sample__cta`.
 *   C. Insert with pre-typed eyebrow/title/body/href/ctaLabel → confirm
 *      serialized JSON + rendered front DOM matches Astro's exact shape
 *      (section.section.ground-paper.sample-section > div.music-backdrop
 *       + div.container-narrow.sample__inner > span.eyebrow.eyebrow--purple
 *       + h2.sample__title + p.sample__body + a.sample__cta[href]
 *       (containing an svg + text label)).
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
    const block = createBlock('bozzies/sample-section', a);
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
    await newDraftPage(page, 'Sample section — Test A');
    const clientA = await insertBlock(page);
    const attrsA = await readAttrs(page, clientA);
    const childCountA = await readChildCount(page, clientA);
    results.A.attrs = attrsA;
    results.A.childCount = childCountA;
    console.log('  attrs:', JSON.stringify(attrsA));
    console.log('  child count:', childCountA);
    trashIds.push(await getPostId(page));

    // --- Test B: sidebar `Lesson URL` mutate + select block --------------
    console.log('\n=== Test B: sidebar TextControl mutate + block-select for Inspector');
    await newDraftPage(page, 'Sample section — Test B');
    const clientB = await insertBlock(page, {
      eyebrow:  'Sample the Sound',
      title:    'Test title.',
      body:     'Test body.',
      href:     '/media/lessons/lesson-1/',
      ctaLabel: 'Play Lesson 1',
    });
    await selectBlock(page, clientB); // Inspector opens; no throw = ok.
    await updateBlockAttr(page, clientB, 'href', '/media/lessons/lesson-3/');
    const hrefAfter = await page.evaluate((cid) =>
      wp.data.select('core/block-editor').getBlock(cid).attributes.href
    , clientB);
    results.B.hrefAfter = hrefAfter;
    results.B.mutated = hrefAfter === '/media/lessons/lesson-3/';
    console.log(`  href after update: ${hrefAfter}  mutated=${results.B.mutated}`);
    const linkB = await saveAndPublish(page);
    const idB = await getPostId(page);
    trashIds.push(idB);
    const contentB = await readContent(idB);
    results.B.serializedContainsHref = contentB.includes('"href":"/media/lessons/lesson-3/"');
    console.log(`  serialized contains href: ${results.B.serializedContainsHref}`);
    await page.goto(linkB, { waitUntil: 'networkidle' });
    results.B.frontShowsHref = await page.evaluate(() => {
      const a = document.querySelector('.sample-section a.sample__cta');
      return !!a && a.getAttribute('href') === '/media/lessons/lesson-3/';
    });
    console.log(`  front a.sample__cta[href] matches: ${results.B.frontShowsHref}`);

    // --- Test C: pre-typed content ---------------------------------------
    console.log('\n=== Test C: pre-typed content');
    await newDraftPage(page, 'Sample section — Test C');
    await insertBlock(page, {
      eyebrow:  'Sample the Sound',
      title:    'Cynthia Lucas walks you through Lesson 1.',
      body:     'A short audio series about the Boswell blend.',
      href:     '/media/lessons/lesson-1/',
      ctaLabel: 'Play Lesson 1 — The Blend',
    });
    const linkC = await saveAndPublish(page);
    const idC = await getPostId(page);
    trashIds.push(idC);
    const contentC = await readContent(idC);
    results.C.serializedHasEyebrow  = contentC.includes('"eyebrow":"Sample the Sound"');
    results.C.serializedHasTitle    = contentC.includes('"title":"Cynthia Lucas walks you through Lesson 1."');
    results.C.serializedHasBody     = contentC.includes('"body":"A short audio series about the Boswell blend."');
    results.C.serializedHasHref     = contentC.includes('"href":"/media/lessons/lesson-1/"');
    results.C.serializedHasCtaLabel = contentC.includes('"ctaLabel":"Play Lesson 1 \\u002d\\u002d The Blend"') || contentC.includes('"ctaLabel":"Play Lesson 1 — The Blend"');
    console.log(`  serialized has eyebrow:  ${results.C.serializedHasEyebrow}`);
    console.log(`  serialized has title:    ${results.C.serializedHasTitle}`);
    console.log(`  serialized has body:     ${results.C.serializedHasBody}`);
    console.log(`  serialized has href:     ${results.C.serializedHasHref}`);
    console.log(`  serialized has ctaLabel: ${results.C.serializedHasCtaLabel}`);
    await page.goto(linkC, { waitUntil: 'networkidle' });
    results.C.outerShape = await page.evaluate(() => !!document.querySelector(
      'section.section.ground-paper.sample-section > div.music-backdrop + div.container-narrow.sample__inner'
    ));
    results.C.innerContent = await page.evaluate(() => {
      const inner = document.querySelector('.sample-section .container-narrow.sample__inner');
      if (!inner) return false;
      const eb = inner.querySelector('span.eyebrow.eyebrow--purple');
      const h  = inner.querySelector('h2.sample__title');
      const p  = inner.querySelector('p.sample__body');
      const cta = inner.querySelector('a.sample__cta');
      const svg = cta && cta.querySelector('svg');
      return eb && eb.textContent.trim() === 'Sample the Sound'
        && h && h.textContent.trim() === 'Cynthia Lucas walks you through Lesson 1.'
        && p && p.textContent.trim() === 'A short audio series about the Boswell blend.'
        && cta && cta.getAttribute('href') === '/media/lessons/lesson-1/'
        && cta.textContent.replace(/\s+/g, ' ').trim().endsWith('Play Lesson 1 — The Blend')
        && !!svg;
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

  writeFileSync(`${OUT}/sample-section-owner-tests.json`, JSON.stringify(results, null, 2));
  console.log('\n=== Summary');
  const summary = {
    A_default_align:      results.A.attrs?.align === 'full',
    A_default_eyebrow:    results.A.attrs?.eyebrow === '',
    A_default_title:      results.A.attrs?.title === '',
    A_default_body:       results.A.attrs?.body === '',
    A_default_href:       results.A.attrs?.href === '/media/lessons/1/',
    A_default_ctaLabel:   results.A.attrs?.ctaLabel === 'Play Lesson 1',
    A_no_children:        results.A.childCount === 0,
    B_attr_mutates:       results.B.mutated,
    B_persists:           results.B.serializedContainsHref,
    B_front_href:         results.B.frontShowsHref,
    C_all_fields_persist: !!(results.C.serializedHasEyebrow && results.C.serializedHasTitle && results.C.serializedHasBody && results.C.serializedHasHref && results.C.serializedHasCtaLabel),
    C_outer_shape:        results.C.outerShape,
    C_inner_content:      results.C.innerContent,
    cleanup:              results.cleanup,
  };
  console.log(JSON.stringify(summary, null, 2));
  const passes = Object.entries(summary).filter(([k]) => k !== 'cleanup').every(([, v]) => v === true);
  process.exit(passes ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });
