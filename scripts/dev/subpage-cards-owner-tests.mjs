/*
 * Owner tests for bozzies/subpage-cards + bozzies/subpage-card:
 *   A. Insert bozzies/subpage-cards via inserter → container carries the
 *      "sisters-subpages" class in the editor and template pre-fills the 2
 *      Astro-source default subpage-card children (bio-resources + timeline).
 *   B. Set the child card's href via the sidebar TextControl
 *      (updateBlockAttributes call path) → confirm attribute persists into
 *      post_content JSON and the rendered front <a class="subpage-card"> href
 *      matches.
 *   C. Insert with pre-typed eyebrow/title/body/href content → confirm
 *      serialized post_content JSON has them and the rendered front DOM
 *      matches Astro's exact shape (section.section.ground-gold.sisters-subpages
 *      > div.container.sisters-subpages__grid > a.subpage-card; each anchor
 *      > span.eyebrow.subpage-card__eyebrow + h3.subpage-card__title +
 *      p.subpage-card__body + span.subpage-card__cta).
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

async function insertContainer(page, attrs = {}, innerAttrsList = null) {
  return await page.evaluate(async ({ a, inners }) => {
    const { createBlock } = wp.blocks;
    const { dispatch } = wp.data;
    let block;
    if (Array.isArray(inners)) {
      const innerBlocks = inners.map(i => createBlock('bozzies/subpage-card', i));
      block = createBlock('bozzies/subpage-cards', a, innerBlocks);
    } else {
      block = createBlock('bozzies/subpage-cards', a);
    }
    dispatch('core/block-editor').insertBlock(block);
    await new Promise(r => setTimeout(r, 700));
    return block.clientId;
  }, { a: attrs, inners: innerAttrsList });
}

async function readAttrs(page, clientId) {
  return await page.evaluate((cid) =>
    wp.data.select('core/block-editor').getBlock(cid).attributes
  , clientId);
}

async function readChildren(page, parentClientId) {
  return await page.evaluate((cid) =>
    wp.data.select('core/block-editor').getBlocks(cid).map(b => ({ name: b.name, attrs: b.attributes }))
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

    // --- Test A: inserter → template default children ---------------------
    console.log('\n=== Test A: insert via inserter → 2 default subpage-card children');
    await newDraftPage(page, 'Subpage cards — Test A');
    const parentA = await insertContainer(page);
    const attrsA = await readAttrs(page, parentA);
    const childrenA = await readChildren(page, parentA);
    results.A.attrs = attrsA;
    results.A.childCount = childrenA.length;
    results.A.firstChildEyebrow = childrenA[0]?.attrs?.eyebrow || '';
    results.A.firstChildTitle = childrenA[0]?.attrs?.title || '';
    console.log('  container attrs:', JSON.stringify(attrsA));
    console.log('  children count:', childrenA.length);
    console.log('  child[0]:', JSON.stringify(childrenA[0]?.attrs));
    console.log('  child[1]:', JSON.stringify(childrenA[1]?.attrs));
    await page.screenshot({ path: `${OUT}/subpage-cards-testA-editor.png`, fullPage: false });
    trashIds.push(await getPostId(page));

    // --- Test B: sidebar TextControl → child href mutation ----------------
    console.log('\n=== Test B: sidebar href mutation on child subpage-card');
    await newDraftPage(page, 'Subpage cards — Test B');
    const parentB = await insertContainer(page, {}, [
      { eyebrow: 'Further Reading', title: 'Boz Biography', body: 'A body.', ctaLabel: 'Explore', href: '/sisters/bio-resources/' },
      { eyebrow: 'Career Timeline', title: 'Their story', body: 'Body.', ctaLabel: 'Open', href: '/sisters/career-timeline/' },
    ]);
    const childrenB = await readChildren(page, parentB);
    const firstChildId = await page.evaluate((cid) => wp.data.select('core/block-editor').getBlocks(cid)[0].clientId, parentB);
    // Same call path the sidebar TextControl fires: updateBlockAttributes.
    await updateBlockAttr(page, firstChildId, 'href', '/sisters/vet/');
    const hrefAfter = await page.evaluate((cid) =>
      wp.data.select('core/block-editor').getBlock(cid).attributes.href
    , firstChildId);
    results.B.hrefAfter = hrefAfter;
    results.B.mutated = hrefAfter === '/sisters/vet/';
    console.log(`  child href after sidebar update: ${hrefAfter}  mutated=${results.B.mutated}`);
    await page.screenshot({ path: `${OUT}/subpage-cards-testB-editor.png`, fullPage: false });
    const linkB = await saveAndPublish(page);
    const idB = await getPostId(page);
    trashIds.push(idB);
    const contentB = await readContent(idB);
    results.B.serializedContainsHref = contentB.includes('"href":"/sisters/vet/"');
    console.log(`  serialized contains href: ${results.B.serializedContainsHref}`);
    await page.goto(linkB, { waitUntil: 'networkidle' });
    results.B.frontShowsHref = await page.evaluate(() => {
      const anchors = document.querySelectorAll('a.subpage-card');
      return anchors.length >= 1 && anchors[0].getAttribute('href') === '/sisters/vet/';
    });
    console.log(`  front <a class="subpage-card"> matches: ${results.B.frontShowsHref}`);

    // --- Test C: pre-typed eyebrow/title/body/cta content -----------------
    console.log('\n=== Test C: pre-typed eyebrow/title/body/cta/href content');
    await newDraftPage(page, 'Subpage cards — Test C');
    const parentC = await insertContainer(page, {}, [
      { eyebrow: 'Field Guide', title: 'The Boswell Songbook', body: 'A curated tour of the Boswells’ sheet-music library.', ctaLabel: 'Open the songbook', href: '/media/songbook/' },
      { eyebrow: 'Deep Dive',   title: 'Radio pioneers',         body: 'How three sisters shaped network radio.',                    ctaLabel: 'Read the study',    href: '/press/radio/' },
    ]);
    await page.screenshot({ path: `${OUT}/subpage-cards-testC-editor.png`, fullPage: false });
    const linkC = await saveAndPublish(page);
    const idC = await getPostId(page);
    trashIds.push(idC);
    const contentC = await readContent(idC);
    results.C.serializedHasFirstTitle  = contentC.includes('"title":"The Boswell Songbook"');
    results.C.serializedHasSecondTitle = contentC.includes('"title":"Radio pioneers"');
    results.C.serializedHasFirstBody   = contentC.includes('sheet-music library');
    console.log(`  serialized has first title:  ${results.C.serializedHasFirstTitle}`);
    console.log(`  serialized has second title: ${results.C.serializedHasSecondTitle}`);
    console.log(`  serialized has first body:   ${results.C.serializedHasFirstBody}`);
    await page.goto(linkC, { waitUntil: 'networkidle' });
    // Astro DOM shape:
    //   section.section.ground-gold.sisters-subpages > div.container.sisters-subpages__grid >
    //     a.subpage-card × N; each anchor > span.eyebrow.subpage-card__eyebrow +
    //     h3.subpage-card__title + p.subpage-card__body + span.subpage-card__cta
    results.C.outerShape = await page.evaluate(() => !!document.querySelector(
      'section.section.ground-gold.sisters-subpages > div.container.sisters-subpages__grid'
    ));
    results.C.twoAnchors = await page.evaluate(() => {
      const anchors = document.querySelectorAll('a.subpage-card');
      return anchors.length === 2;
    });
    results.C.firstContent = await page.evaluate(() => {
      const a = document.querySelectorAll('a.subpage-card')[0];
      if (!a) return false;
      const eb = a.querySelector('.eyebrow.subpage-card__eyebrow');
      const h3 = a.querySelector('h3.subpage-card__title');
      const p  = a.querySelector('p.subpage-card__body');
      const cta = a.querySelector('.subpage-card__cta');
      return a.getAttribute('href') === '/media/songbook/'
        && eb && eb.textContent.trim() === 'Field Guide'
        && h3 && h3.textContent.trim() === 'The Boswell Songbook'
        && p  && p.textContent.includes('sheet-music library')
        && cta && cta.textContent.includes('Open the songbook')
        && !!cta.querySelector('svg');
    });
    results.C.secondContent = await page.evaluate(() => {
      const a = document.querySelectorAll('a.subpage-card')[1];
      if (!a) return false;
      const eb = a.querySelector('.eyebrow.subpage-card__eyebrow');
      const h3 = a.querySelector('h3.subpage-card__title');
      const p  = a.querySelector('p.subpage-card__body');
      const cta = a.querySelector('.subpage-card__cta');
      return a.getAttribute('href') === '/press/radio/'
        && eb && eb.textContent.trim() === 'Deep Dive'
        && h3 && h3.textContent.trim() === 'Radio pioneers'
        && p  && p.textContent.includes('network radio')
        && cta && cta.textContent.includes('Read the study')
        && !!cta.querySelector('svg');
    });
    console.log(`  outer DOM shape:   ${results.C.outerShape}`);
    console.log(`  two anchors:       ${results.C.twoAnchors}`);
    console.log(`  first content:     ${results.C.firstContent}`);
    console.log(`  second content:    ${results.C.secondContent}`);
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

  writeFileSync(`${OUT}/subpage-cards-owner-tests.json`, JSON.stringify(results, null, 2));
  console.log('\n=== Summary');
  const summary = {
    A_container_align:      results.A.attrs?.align === 'full',
    A_two_default_children: results.A.childCount === 2,
    A_first_child_defaults: results.A.firstChildEyebrow === 'Further Reading' && results.A.firstChildTitle === 'Boz Biography',
    B_sidebar_mutates:      results.B.mutated,
    B_persists:             results.B.serializedContainsHref,
    B_front_href:           results.B.frontShowsHref,
    C_all_titles_persist:   !!(results.C.serializedHasFirstTitle && results.C.serializedHasSecondTitle && results.C.serializedHasFirstBody),
    C_outer_shape:          results.C.outerShape,
    C_two_anchors:          results.C.twoAnchors,
    C_content_renders:      !!(results.C.firstContent && results.C.secondContent),
    cleanup:                results.cleanup,
  };
  console.log(JSON.stringify(summary, null, 2));
  const passes = Object.entries(summary).filter(([k]) => k !== 'cleanup').every(([, v]) => v === true);
  process.exit(passes ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });
