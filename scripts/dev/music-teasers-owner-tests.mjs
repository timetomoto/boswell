/*
 * Owner tests for bozzies/music-teasers + bozzies/music-teaser:
 *   A. Insert bozzies/music-teasers via inserter → container carries the
 *      "music-teasers" class in the editor and template pre-fills 3
 *      Astro-source default music-teaser children (charts + reviews +
 *      discography).
 *   B. Set the child card's href via the sidebar TextControl
 *      (updateBlockAttributes call path) → confirm attribute persists into
 *      post_content JSON and the rendered front <a class="music-teaser"> href
 *      matches.
 *   C. Insert with pre-typed eyebrow/title/body/href content → confirm
 *      serialized post_content JSON has them and the rendered front DOM
 *      matches Astro's exact shape (section.section.ground-gold.music-teasers
 *      > div.container.music-teasers__grid > a.music-teaser; each anchor
 *      > span.eyebrow.music-teaser__eyebrow + h3.music-teaser__title +
 *      p.music-teaser__body + span.music-teaser__cta).
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
      const innerBlocks = inners.map(i => createBlock('bozzies/music-teaser', i));
      block = createBlock('bozzies/music-teasers', a, innerBlocks);
    } else {
      block = createBlock('bozzies/music-teasers', a);
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
    console.log('\n=== Test A: insert via inserter → 3 default music-teaser children');
    await newDraftPage(page, 'Music teasers — Test A');
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
    console.log('  child[2]:', JSON.stringify(childrenA[2]?.attrs));
    await page.screenshot({ path: `${OUT}/music-teasers-testA-editor.png`, fullPage: false });
    trashIds.push(await getPostId(page));

    // --- Test B: sidebar TextControl → child href mutation ----------------
    console.log('\n=== Test B: sidebar href mutation on child music-teaser');
    await newDraftPage(page, 'Music teasers — Test B');
    const parentB = await insertContainer(page, {}, [
      { eyebrow: 'Discography', title: 'Boz on the Charts', body: 'Body 1.', ctaLabel: 'Explore the charts', href: '/media/charts/' },
      { eyebrow: 'Reviews',     title: 'Album reviews',     body: 'Body 2.', ctaLabel: 'Read the reviews',   href: '/media/reviews/' },
      { eyebrow: 'Discography', title: 'Every session',     body: 'Body 3.', ctaLabel: 'Browse',             href: '/media/discography/' },
    ]);
    const firstChildId = await page.evaluate((cid) => wp.data.select('core/block-editor').getBlocks(cid)[0].clientId, parentB);
    // Same call path the sidebar TextControl fires: updateBlockAttributes.
    await updateBlockAttr(page, firstChildId, 'href', '/media/discography/');
    const hrefAfter = await page.evaluate((cid) =>
      wp.data.select('core/block-editor').getBlock(cid).attributes.href
    , firstChildId);
    results.B.hrefAfter = hrefAfter;
    results.B.mutated = hrefAfter === '/media/discography/';
    console.log(`  child href after sidebar update: ${hrefAfter}  mutated=${results.B.mutated}`);
    await page.screenshot({ path: `${OUT}/music-teasers-testB-editor.png`, fullPage: false });
    const linkB = await saveAndPublish(page);
    const idB = await getPostId(page);
    trashIds.push(idB);
    const contentB = await readContent(idB);
    results.B.serializedContainsHref = contentB.includes('"href":"/media/discography/"');
    console.log(`  serialized contains href: ${results.B.serializedContainsHref}`);
    await page.goto(linkB, { waitUntil: 'networkidle' });
    results.B.frontShowsHref = await page.evaluate(() => {
      const anchors = document.querySelectorAll('a.music-teaser');
      return anchors.length >= 1 && anchors[0].getAttribute('href') === '/media/discography/';
    });
    console.log(`  front <a class="music-teaser"> matches: ${results.B.frontShowsHref}`);

    // --- Test C: pre-typed eyebrow/title/body/cta content -----------------
    console.log('\n=== Test C: pre-typed eyebrow/title/body/cta/href content');
    await newDraftPage(page, 'Music teasers — Test C');
    const parentC = await insertContainer(page, {}, [
      { eyebrow: 'Field Guide', title: 'The Session Ledger',   body: 'A curated tour of the Boswells’ Brunswick sessions.', ctaLabel: 'Open the ledger', href: '/media/ledger/' },
      { eyebrow: 'Deep Dive',   title: 'Radio pioneers',       body: 'How three sisters shaped network radio.',              ctaLabel: 'Read the study', href: '/press/radio/' },
      { eyebrow: 'Curated',     title: 'Highlights playlist',  body: 'Twenty tracks the Sisters recut across labels.',       ctaLabel: 'Listen',         href: '/media/highlights/' },
    ]);
    await page.screenshot({ path: `${OUT}/music-teasers-testC-editor.png`, fullPage: false });
    const linkC = await saveAndPublish(page);
    const idC = await getPostId(page);
    trashIds.push(idC);
    const contentC = await readContent(idC);
    results.C.serializedHasFirstTitle  = contentC.includes('"title":"The Session Ledger"');
    results.C.serializedHasSecondTitle = contentC.includes('"title":"Radio pioneers"');
    results.C.serializedHasThirdTitle  = contentC.includes('"title":"Highlights playlist"');
    results.C.serializedHasFirstBody   = contentC.includes('Brunswick sessions');
    console.log(`  serialized has first title:  ${results.C.serializedHasFirstTitle}`);
    console.log(`  serialized has second title: ${results.C.serializedHasSecondTitle}`);
    console.log(`  serialized has third title:  ${results.C.serializedHasThirdTitle}`);
    console.log(`  serialized has first body:   ${results.C.serializedHasFirstBody}`);
    await page.goto(linkC, { waitUntil: 'networkidle' });
    // Astro DOM shape:
    //   section.section.ground-gold.music-teasers > div.container.music-teasers__grid >
    //     a.music-teaser × N; each anchor > span.eyebrow.music-teaser__eyebrow +
    //     h3.music-teaser__title + p.music-teaser__body + span.music-teaser__cta
    results.C.outerShape = await page.evaluate(() => !!document.querySelector(
      'section.section.ground-gold.music-teasers > div.container.music-teasers__grid'
    ));
    results.C.threeAnchors = await page.evaluate(() => {
      const anchors = document.querySelectorAll('a.music-teaser');
      return anchors.length === 3;
    });
    results.C.firstContent = await page.evaluate(() => {
      const a = document.querySelectorAll('a.music-teaser')[0];
      if (!a) return false;
      const eb = a.querySelector('.eyebrow.music-teaser__eyebrow');
      const h3 = a.querySelector('h3.music-teaser__title');
      const p  = a.querySelector('p.music-teaser__body');
      const cta = a.querySelector('.music-teaser__cta');
      return a.getAttribute('href') === '/media/ledger/'
        && eb && eb.textContent.trim() === 'Field Guide'
        && h3 && h3.textContent.trim() === 'The Session Ledger'
        && p  && p.textContent.includes('Brunswick sessions')
        && cta && cta.textContent.includes('Open the ledger')
        && !!cta.querySelector('svg');
    });
    results.C.thirdContent = await page.evaluate(() => {
      const a = document.querySelectorAll('a.music-teaser')[2];
      if (!a) return false;
      const eb = a.querySelector('.eyebrow.music-teaser__eyebrow');
      const h3 = a.querySelector('h3.music-teaser__title');
      const p  = a.querySelector('p.music-teaser__body');
      const cta = a.querySelector('.music-teaser__cta');
      return a.getAttribute('href') === '/media/highlights/'
        && eb && eb.textContent.trim() === 'Curated'
        && h3 && h3.textContent.trim() === 'Highlights playlist'
        && p  && p.textContent.includes('recut across labels')
        && cta && cta.textContent.includes('Listen')
        && !!cta.querySelector('svg');
    });
    console.log(`  outer DOM shape:   ${results.C.outerShape}`);
    console.log(`  three anchors:     ${results.C.threeAnchors}`);
    console.log(`  first content:     ${results.C.firstContent}`);
    console.log(`  third content:     ${results.C.thirdContent}`);
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

  writeFileSync(`${OUT}/music-teasers-owner-tests.json`, JSON.stringify(results, null, 2));
  console.log('\n=== Summary');
  const summary = {
    A_container_align:      results.A.attrs?.align === 'full',
    A_three_default_kids:   results.A.childCount === 3,
    A_first_child_defaults: results.A.firstChildEyebrow === 'Discography' && results.A.firstChildTitle === 'Boz on the Charts',
    B_sidebar_mutates:      results.B.mutated,
    B_persists:             results.B.serializedContainsHref,
    B_front_href:           results.B.frontShowsHref,
    C_all_titles_persist:   !!(results.C.serializedHasFirstTitle && results.C.serializedHasSecondTitle && results.C.serializedHasThirdTitle && results.C.serializedHasFirstBody),
    C_outer_shape:          results.C.outerShape,
    C_three_anchors:        results.C.threeAnchors,
    C_content_renders:      !!(results.C.firstContent && results.C.thirdContent),
    cleanup:                results.cleanup,
  };
  console.log(JSON.stringify(summary, null, 2));
  const passes = Object.entries(summary).filter(([k]) => k !== 'cleanup').every(([, v]) => v === true);
  process.exit(passes ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });
