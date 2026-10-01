/*
 * Owner tests for bozzies/donate-teaser:
 *   A. Insert via inserter → default attrs (align='full',
 *      eyebrow='Support the Work', ctaLabel='Donate'), 0 inner blocks.
 *   B. Set href via sidebar TextControl → confirm attribute persists into
 *      post_content JSON and rendered front <a class="btn btn--purple">
 *      href matches.
 *   C. Insert with pre-typed eyebrow/title/body/ctaLabel/href → confirm
 *      serialized JSON + rendered front DOM matches Astro's exact shape
 *      (section.section.ground-gold.donate-teaser >
 *       div.container-narrow.donate-teaser__inner >
 *       span.eyebrow.eyebrow--purple + h2.donate-teaser__title +
 *       p.donate-teaser__body + a.btn.btn--purple).
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
    const block = createBlock('bozzies/donate-teaser', a);
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
    await newDraftPage(page, 'Donate teaser — Test A');
    const clientA = await insertBlock(page);
    const attrsA = await readAttrs(page, clientA);
    const childCountA = await readChildCount(page, clientA);
    results.A.attrs = attrsA;
    results.A.childCount = childCountA;
    console.log('  attrs:', JSON.stringify(attrsA));
    console.log('  child count:', childCountA);
    trashIds.push(await getPostId(page));

    // --- Test B: sidebar TextControl → href mutation ----------------------
    console.log('\n=== Test B: sidebar href mutation');
    await newDraftPage(page, 'Donate teaser — Test B');
    const clientB = await insertBlock(page, {
      eyebrow: 'Support the Work',
      title:   'Help keep the Boswells\' legacy alive.',
      body:    "Bozzies.org is dedicated to preserving the Boswells' legacy.",
      href:    '',
      ctaLabel:'Donate',
    });
    await updateBlockAttr(page, clientB, 'href', 'https://example.com/give');
    const hrefAfter = await page.evaluate((cid) =>
      wp.data.select('core/block-editor').getBlock(cid).attributes.href
    , clientB);
    results.B.hrefAfter = hrefAfter;
    results.B.mutated = hrefAfter === 'https://example.com/give';
    console.log(`  href after sidebar update: ${hrefAfter}  mutated=${results.B.mutated}`);
    const linkB = await saveAndPublish(page);
    const idB = await getPostId(page);
    trashIds.push(idB);
    const contentB = await readContent(idB);
    results.B.serializedContainsHref = contentB.includes('"href":"https://example.com/give"') || contentB.includes('"href":"https:\\/\\/example.com\\/give"');
    console.log(`  serialized contains href: ${results.B.serializedContainsHref}`);
    await page.goto(linkB, { waitUntil: 'networkidle' });
    results.B.frontShowsHref = await page.evaluate(() => {
      const a = document.querySelector('.donate-teaser a.btn.btn--purple');
      return !!a && a.getAttribute('href') === 'https://example.com/give'
        && a.getAttribute('target') === '_blank'
        && (a.getAttribute('rel') || '').includes('noopener');
    });
    console.log(`  front <a class="btn btn--purple"> href/target/rel match: ${results.B.frontShowsHref}`);

    // --- Test C: pre-typed content ---------------------------------------
    console.log('\n=== Test C: pre-typed content');
    await newDraftPage(page, 'Donate teaser — Test C');
    await insertBlock(page, {
      eyebrow: 'Keep it Going',
      title:   'Bozzies runs on donations',
      body:    'Every contribution keeps the archive alive.',
      href:    'https://example.com/donate-c',
      ctaLabel:'Chip in',
    });
    const linkC = await saveAndPublish(page);
    const idC = await getPostId(page);
    trashIds.push(idC);
    const contentC = await readContent(idC);
    results.C.serializedHasTitle    = contentC.includes('"title":"Bozzies runs on donations"');
    results.C.serializedHasEyebrow  = contentC.includes('"eyebrow":"Keep it Going"');
    results.C.serializedHasCta      = contentC.includes('"ctaLabel":"Chip in"');
    results.C.serializedHasBody     = contentC.includes('Every contribution');
    console.log(`  serialized has title:    ${results.C.serializedHasTitle}`);
    console.log(`  serialized has eyebrow:  ${results.C.serializedHasEyebrow}`);
    console.log(`  serialized has ctaLabel: ${results.C.serializedHasCta}`);
    console.log(`  serialized has body:     ${results.C.serializedHasBody}`);
    await page.goto(linkC, { waitUntil: 'networkidle' });
    results.C.outerShape = await page.evaluate(() => !!document.querySelector(
      'section.section.ground-gold.donate-teaser > div.container-narrow.donate-teaser__inner'
    ));
    results.C.innerContent = await page.evaluate(() => {
      const inner = document.querySelector('.donate-teaser__inner');
      if (!inner) return false;
      const eb  = inner.querySelector('span.eyebrow.eyebrow--purple');
      const h2  = inner.querySelector('h2.donate-teaser__title');
      const p   = inner.querySelector('p.donate-teaser__body');
      const a   = inner.querySelector('a.btn.btn--purple');
      return eb && eb.textContent.trim() === 'Keep it Going'
        && h2 && h2.textContent.trim() === 'Bozzies runs on donations'
        && p  && p.textContent.includes('Every contribution')
        && a  && a.getAttribute('href') === 'https://example.com/donate-c'
        && a.textContent.trim() === 'Chip in';
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

  writeFileSync(`${OUT}/donate-teaser-owner-tests.json`, JSON.stringify(results, null, 2));
  console.log('\n=== Summary');
  const summary = {
    A_default_align:        results.A.attrs?.align === 'full',
    A_default_eyebrow:      results.A.attrs?.eyebrow === 'Support the Work',
    A_default_cta:          results.A.attrs?.ctaLabel === 'Donate',
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
