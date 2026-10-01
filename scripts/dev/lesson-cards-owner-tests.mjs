/*
 * Owner tests for bozzies/lesson-cards + bozzies/lesson-card:
 *   A. Insert bozzies/lesson-cards via inserter → container carries the
 *      "lessons-grid" class in the editor and template pre-fills 5
 *      Astro-source default lesson-card children (5 audio lessons).
 *   B. Set the child card's href via the sidebar TextControl
 *      (updateBlockAttributes call path) → confirm attribute persists into
 *      post_content JSON and the rendered front <a class="lesson-card__link">
 *      href matches.
 *   C. Insert with pre-typed order/title/summary/href content → confirm
 *      serialized post_content JSON has them and the rendered front DOM
 *      matches Astro's exact shape (section.section.ground-paper.lessons-grid
 *      > div.container > header.lessons-grid__head + ol.lessons-cards >
 *      li.lesson-card; each li > a.lesson-card__link containing num/body/cta).
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
      const innerBlocks = inners.map(i => createBlock('bozzies/lesson-card', i));
      block = createBlock('bozzies/lesson-cards', a, innerBlocks);
    } else {
      block = createBlock('bozzies/lesson-cards', a);
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
    console.log('\n=== Test A: insert via inserter → 5 default lesson-card children');
    await newDraftPage(page, 'Lesson cards — Test A');
    const parentA = await insertContainer(page);
    const attrsA = await readAttrs(page, parentA);
    const childrenA = await readChildren(page, parentA);
    results.A.attrs = attrsA;
    results.A.childCount = childrenA.length;
    results.A.firstChildOrder = childrenA[0]?.attrs?.order;
    results.A.firstChildTitle = childrenA[0]?.attrs?.title || '';
    results.A.fifthChildOrder = childrenA[4]?.attrs?.order;
    results.A.fifthChildTitle = childrenA[4]?.attrs?.title || '';
    console.log('  container attrs:', JSON.stringify(attrsA));
    console.log('  children count:', childrenA.length);
    console.log('  child[0]:', JSON.stringify(childrenA[0]?.attrs));
    console.log('  child[4]:', JSON.stringify(childrenA[4]?.attrs));
    await page.screenshot({ path: `${OUT}/lesson-cards-testA-editor.png`, fullPage: false });
    trashIds.push(await getPostId(page));

    // --- Test B: sidebar TextControl → child href mutation ----------------
    console.log('\n=== Test B: sidebar href mutation on child lesson-card');
    await newDraftPage(page, 'Lesson cards — Test B');
    const parentB = await insertContainer(page, { eyebrow: 'Audio Lessons', title: 'Five keys', lede: 'Lede B.' }, [
      { order: 1, title: 'The Blend',  summary: 'Body 1.', href: '/media/lessons/lesson-1/' },
      { order: 2, title: 'The Tempo',  summary: 'Body 2.', href: '/media/lessons/lesson-2/' },
    ]);
    const firstChildId = await page.evaluate((cid) => wp.data.select('core/block-editor').getBlocks(cid)[0].clientId, parentB);
    // Same call path the sidebar TextControl fires: updateBlockAttributes.
    await updateBlockAttr(page, firstChildId, 'href', '/media/lessons/lesson-5/');
    const hrefAfter = await page.evaluate((cid) =>
      wp.data.select('core/block-editor').getBlock(cid).attributes.href
    , firstChildId);
    results.B.hrefAfter = hrefAfter;
    results.B.mutated = hrefAfter === '/media/lessons/lesson-5/';
    console.log(`  child href after sidebar update: ${hrefAfter}  mutated=${results.B.mutated}`);
    await page.screenshot({ path: `${OUT}/lesson-cards-testB-editor.png`, fullPage: false });
    const linkB = await saveAndPublish(page);
    const idB = await getPostId(page);
    trashIds.push(idB);
    const contentB = await readContent(idB);
    results.B.serializedContainsHref = contentB.includes('"href":"/media/lessons/lesson-5/"');
    console.log(`  serialized contains href: ${results.B.serializedContainsHref}`);
    await page.goto(linkB, { waitUntil: 'networkidle' });
    results.B.frontShowsHref = await page.evaluate(() => {
      const anchors = document.querySelectorAll('a.lesson-card__link');
      return anchors.length >= 1 && anchors[0].getAttribute('href') === '/media/lessons/lesson-5/';
    });
    console.log(`  front <a class="lesson-card__link"> matches: ${results.B.frontShowsHref}`);

    // --- Test C: pre-typed order/title/summary/href content ---------------
    console.log('\n=== Test C: pre-typed order/title/summary/href content');
    await newDraftPage(page, 'Lesson cards — Test C');
    const parentC = await insertContainer(page, { eyebrow: 'Field Guide', title: 'Three lessons', lede: 'Curated study set.' }, [
      { order: 7, title: 'Session Ledger',    summary: 'A curated tour of Brunswick sessions.', href: '/media/ledger/' },
      { order: 8, title: 'Radio pioneers',    summary: 'How three sisters shaped network radio.', href: '/press/radio/' },
      { order: 9, title: 'Highlights playlist', summary: 'Twenty tracks the Sisters recut.',   href: '/media/highlights/' },
    ]);
    await page.screenshot({ path: `${OUT}/lesson-cards-testC-editor.png`, fullPage: false });
    const linkC = await saveAndPublish(page);
    const idC = await getPostId(page);
    trashIds.push(idC);
    const contentC = await readContent(idC);
    results.C.serializedHasFirstTitle  = contentC.includes('"title":"Session Ledger"');
    results.C.serializedHasSecondTitle = contentC.includes('"title":"Radio pioneers"');
    results.C.serializedHasThirdTitle  = contentC.includes('"title":"Highlights playlist"');
    results.C.serializedHasSevenOrder  = contentC.includes('"order":7');
    results.C.serializedHasHeaderEyebrow = contentC.includes('"eyebrow":"Field Guide"');
    console.log(`  serialized has first title:   ${results.C.serializedHasFirstTitle}`);
    console.log(`  serialized has second title:  ${results.C.serializedHasSecondTitle}`);
    console.log(`  serialized has third title:   ${results.C.serializedHasThirdTitle}`);
    console.log(`  serialized has order=7:       ${results.C.serializedHasSevenOrder}`);
    console.log(`  serialized has header eyebrow: ${results.C.serializedHasHeaderEyebrow}`);
    await page.goto(linkC, { waitUntil: 'networkidle' });
    // Astro DOM shape:
    //   section.section.ground-paper.lessons-grid > div.container >
    //     header.lessons-grid__head + ol.lessons-cards > li.lesson-card × N;
    //   each li > a.lesson-card__link with .lesson-card__num + .lesson-card__body + .lesson-card__cta
    results.C.outerShape = await page.evaluate(() => !!document.querySelector(
      'section.section.ground-paper.lessons-grid > div.container > ol.lessons-cards'
    ));
    results.C.headerShape = await page.evaluate(() => {
      const head = document.querySelector('section.lessons-grid > div.container > header.lessons-grid__head');
      if (!head) return false;
      const eb = head.querySelector('.eyebrow');
      const h2 = head.querySelector('h2.lessons-grid__title');
      const p  = head.querySelector('p.lessons-grid__lede');
      return !!(eb && eb.textContent.trim() === 'Field Guide'
        && h2 && h2.textContent.trim() === 'Three lessons'
        && p  && p.textContent.trim() === 'Curated study set.');
    });
    results.C.threeCards = await page.evaluate(() => {
      const cards = document.querySelectorAll('li.lesson-card');
      return cards.length === 3;
    });
    results.C.firstContent = await page.evaluate(() => {
      const li = document.querySelectorAll('li.lesson-card')[0];
      if (!li) return false;
      const a   = li.querySelector('a.lesson-card__link');
      const numL = li.querySelector('.lesson-card__num-label');
      const numV = li.querySelector('.lesson-card__num-value');
      const h3  = li.querySelector('h3.lesson-card__title');
      const p   = li.querySelector('p.lesson-card__summary');
      const cta = li.querySelector('.lesson-card__cta');
      return a && a.getAttribute('href') === '/media/ledger/'
        && numL && numL.textContent.trim() === 'Lesson'
        && numV && numV.textContent.trim() === '07'
        && h3 && h3.textContent.trim() === 'Session Ledger'
        && p  && p.textContent.includes('Brunswick')
        && cta && cta.textContent.includes('Listen')
        && !!cta.querySelector('svg');
    });
    results.C.thirdContent = await page.evaluate(() => {
      const li = document.querySelectorAll('li.lesson-card')[2];
      if (!li) return false;
      const a   = li.querySelector('a.lesson-card__link');
      const numV = li.querySelector('.lesson-card__num-value');
      const h3  = li.querySelector('h3.lesson-card__title');
      return a && a.getAttribute('href') === '/media/highlights/'
        && numV && numV.textContent.trim() === '09'
        && h3 && h3.textContent.trim() === 'Highlights playlist';
    });
    console.log(`  outer DOM shape:     ${results.C.outerShape}`);
    console.log(`  header DOM shape:    ${results.C.headerShape}`);
    console.log(`  three cards:         ${results.C.threeCards}`);
    console.log(`  first content:       ${results.C.firstContent}`);
    console.log(`  third content:       ${results.C.thirdContent}`);
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

  writeFileSync(`${OUT}/lesson-cards-owner-tests.json`, JSON.stringify(results, null, 2));
  console.log('\n=== Summary');
  const summary = {
    A_container_align:       results.A.attrs?.align === 'full',
    A_five_default_kids:     results.A.childCount === 5,
    A_first_child_defaults:  results.A.firstChildOrder === 1 && results.A.firstChildTitle === 'The Blend',
    A_fifth_child_defaults:  results.A.fifthChildOrder === 5 && results.A.fifthChildTitle.startsWith('Scatting'),
    B_sidebar_mutates:       results.B.mutated,
    B_persists:              results.B.serializedContainsHref,
    B_front_href:            results.B.frontShowsHref,
    C_all_titles_persist:    !!(results.C.serializedHasFirstTitle && results.C.serializedHasSecondTitle && results.C.serializedHasThirdTitle),
    C_order_persists:        results.C.serializedHasSevenOrder,
    C_header_persists:       results.C.serializedHasHeaderEyebrow,
    C_outer_shape:           results.C.outerShape,
    C_header_shape:          results.C.headerShape,
    C_three_cards:           results.C.threeCards,
    C_content_renders:       !!(results.C.firstContent && results.C.thirdContent),
    cleanup:                 results.cleanup,
  };
  console.log(JSON.stringify(summary, null, 2));
  const passes = Object.entries(summary).filter(([k]) => k !== 'cleanup').every(([, v]) => v === true);
  process.exit(passes ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });
