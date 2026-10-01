/*
 * Owner tests for bozzies/about-cta:
 *   A. Insert bozzies/about-cta via inserter → default attrs (eyebrow="Get in touch",
 *      contactLabel="Contact", donateLabel="Donate", align="full"), 0 inner blocks.
 *   B. Set donateHref via sidebar TextControl (updateBlockAttributes call path) →
 *      confirm attribute persists into post_content JSON and rendered front
 *      a.btn.btn--gold href matches.
 *   C. Insert with pre-typed eyebrow/title/body/contactHref/donateHref etc. →
 *      confirm serialized post_content JSON has them and rendered front DOM
 *      matches Astro's exact shape:
 *        section.section.ground-gold.about-cta >
 *        div.container.about-cta__inner >
 *        header.about-cta__head[span.eyebrow.about-cta__eyebrow +
 *                              h2.about-cta__title + p.about-cta__body] +
 *        div.about-cta__actions[a.btn.btn--outline + a.btn.btn--gold]
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
    const block = createBlock('bozzies/about-cta', a);
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
    await newDraftPage(page, 'About CTA — Test A');
    const clientA = await insertBlock(page);
    const attrsA = await readAttrs(page, clientA);
    const childCountA = await readChildCount(page, clientA);
    results.A.attrs = attrsA;
    results.A.childCount = childCountA;
    console.log('  attrs:', JSON.stringify(attrsA));
    console.log('  child count:', childCountA);
    trashIds.push(await getPostId(page));

    // --- Test B: sidebar TextControl → donateHref mutation ----------------
    console.log('\n=== Test B: sidebar donateHref mutation');
    await newDraftPage(page, 'About CTA — Test B');
    const clientB = await insertBlock(page, {
      eyebrow: 'Get in touch',
      title:   'Have something to share, or want to help?',
      body:    'Body copy.',
      contactHref: 'mailto:hi@example.com',
      contactLabel:'Contact',
      donateHref:  '',
      donateLabel: 'Donate',
    });
    await updateBlockAttr(page, clientB, 'donateHref', 'https://example.com/give');
    const hrefAfter = await page.evaluate((cid) =>
      wp.data.select('core/block-editor').getBlock(cid).attributes.donateHref
    , clientB);
    results.B.hrefAfter = hrefAfter;
    results.B.mutated = hrefAfter === 'https://example.com/give';
    console.log(`  donateHref after sidebar update: ${hrefAfter}  mutated=${results.B.mutated}`);
    const linkB = await saveAndPublish(page);
    const idB = await getPostId(page);
    trashIds.push(idB);
    const contentB = await readContent(idB);
    results.B.serializedContainsHref = contentB.includes('"donateHref":"https://example.com/give"');
    console.log(`  serialized contains donateHref: ${results.B.serializedContainsHref}`);
    await page.goto(linkB, { waitUntil: 'networkidle' });
    results.B.frontShowsHref = await page.evaluate(() => {
      const a = document.querySelector('a.btn.btn--gold');
      return a && a.getAttribute('href') === 'https://example.com/give'
        && a.getAttribute('target') === '_blank'
        && a.getAttribute('rel') === 'noopener noreferrer';
    });
    console.log(`  front a.btn.btn--gold href/target/rel match: ${results.B.frontShowsHref}`);

    // --- Test C: pre-typed content ---------------------------------------
    console.log('\n=== Test C: pre-typed content');
    await newDraftPage(page, 'About CTA — Test C');
    await insertBlock(page, {
      eyebrow: 'Reach out',
      title:   'Send us a message.',
      body:    'We love hearing from listeners, family, and archivists — say hello and tell us what you found.',
      contactHref: 'mailto:hello@example.com',
      contactLabel:'Say hello',
      donateHref:  'https://donate.example.com/',
      donateLabel: 'Chip in',
    });
    const linkC = await saveAndPublish(page);
    const idC = await getPostId(page);
    trashIds.push(idC);
    const contentC = await readContent(idC);
    results.C.serializedHasTitle       = contentC.includes('"title":"Send us a message."');
    results.C.serializedHasEyebrow     = contentC.includes('"eyebrow":"Reach out"');
    results.C.serializedHasContact     = contentC.includes('"contactHref":"mailto:hello@example.com"');
    results.C.serializedHasDonate      = contentC.includes('"donateHref":"https://donate.example.com/"');
    results.C.serializedHasContactLabel = contentC.includes('"contactLabel":"Say hello"');
    results.C.serializedHasDonateLabel  = contentC.includes('"donateLabel":"Chip in"');
    results.C.serializedHasBody        = contentC.includes('hearing from listeners');
    console.log(`  serialized has title:         ${results.C.serializedHasTitle}`);
    console.log(`  serialized has eyebrow:       ${results.C.serializedHasEyebrow}`);
    console.log(`  serialized has contactHref:   ${results.C.serializedHasContact}`);
    console.log(`  serialized has donateHref:    ${results.C.serializedHasDonate}`);
    console.log(`  serialized has contactLabel:  ${results.C.serializedHasContactLabel}`);
    console.log(`  serialized has donateLabel:   ${results.C.serializedHasDonateLabel}`);
    console.log(`  serialized has body:          ${results.C.serializedHasBody}`);
    await page.goto(linkC, { waitUntil: 'networkidle' });
    results.C.outerShape = await page.evaluate(() => !!document.querySelector(
      'section.section.ground-gold.about-cta > div.container.about-cta__inner > header.about-cta__head'
    ));
    results.C.innerContent = await page.evaluate(() => {
      const sec = document.querySelector('.about-cta');
      if (!sec) return false;
      const eb   = sec.querySelector('header.about-cta__head > span.eyebrow.about-cta__eyebrow');
      const h2   = sec.querySelector('header.about-cta__head > h2.about-cta__title');
      const p    = sec.querySelector('header.about-cta__head > p.about-cta__body');
      const acts = sec.querySelector('div.about-cta__actions');
      const outline = acts && acts.querySelector('a.btn.btn--outline');
      const gold    = acts && acts.querySelector('a.btn.btn--gold');
      return eb && eb.textContent.trim() === 'Reach out'
        && h2 && h2.textContent.trim() === 'Send us a message.'
        && p  && p.textContent.includes('hearing from listeners')
        && outline && outline.getAttribute('href') === 'mailto:hello@example.com'
        && outline.textContent.trim() === 'Say hello'
        && gold && gold.getAttribute('href') === 'https://donate.example.com/'
        && gold.textContent.trim() === 'Chip in'
        && gold.getAttribute('target') === '_blank'
        && gold.getAttribute('rel') === 'noopener noreferrer';
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

  writeFileSync(`${OUT}/about-cta-owner-tests.json`, JSON.stringify(results, null, 2));
  console.log('\n=== Summary');
  const summary = {
    A_default_align:        results.A.attrs?.align === 'full',
    A_default_eyebrow:      results.A.attrs?.eyebrow === 'Get in touch',
    A_default_contact:      results.A.attrs?.contactLabel === 'Contact',
    A_default_donate:       results.A.attrs?.donateLabel === 'Donate',
    A_no_children:          results.A.childCount === 0,
    B_sidebar_mutates:      results.B.mutated,
    B_persists:             results.B.serializedContainsHref,
    B_front_href:           results.B.frontShowsHref,
    C_all_fields_persist:   !!(results.C.serializedHasTitle && results.C.serializedHasEyebrow && results.C.serializedHasContact && results.C.serializedHasDonate && results.C.serializedHasContactLabel && results.C.serializedHasDonateLabel && results.C.serializedHasBody),
    C_outer_shape:          results.C.outerShape,
    C_inner_content:        results.C.innerContent,
    cleanup:                results.cleanup,
  };
  console.log(JSON.stringify(summary, null, 2));
  const passes = Object.entries(summary).filter(([k]) => k !== 'cleanup').every(([, v]) => v === true);
  process.exit(passes ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });
