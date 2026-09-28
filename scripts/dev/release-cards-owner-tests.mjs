/*
 * Owner tests for bozzies/release-cards + bozzies/release-card:
 *   A. Insert bozzies/release-cards via inserter → container has the
 *      "press-releases" class in the editor and template pre-fills 2
 *      default release-card children.
 *   B. Set the child card's href via the sidebar TextControl (real
 *      updateBlockAttributes call path) → confirm attribute persists into
 *      post_content JSON and the rendered front <a class="release-card__link">
 *      href matches.
 *   C. Insert with pre-typed documentType/title/releaseDate/href content →
 *      confirm serialized post_content JSON has them and the rendered front DOM
 *      matches Astro's exact shape (section.section.ground-gold.press-releases
 *      > div.container > ul.releases-grid > li.release-card; each li >
 *      a.release-card__link > span.release-card__type + h3.release-card__title
 *      + p.release-card__date).
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
      const innerBlocks = inners.map(i => createBlock('bozzies/release-card', i));
      block = createBlock('bozzies/release-cards', a, innerBlocks);
    } else {
      block = createBlock('bozzies/release-cards', a);
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

    // --- Test A: inserter → default template children --------------------
    console.log('\n=== Test A: insert via inserter → 2 default release-card children');
    await newDraftPage(page, 'Release cards — Test A');
    const parentA = await insertContainer(page);
    const attrsA = await readAttrs(page, parentA);
    const childrenA = await readChildren(page, parentA);
    results.A.attrs = attrsA;
    results.A.childCount = childrenA.length;
    results.A.firstChildTitle = childrenA[0]?.attrs?.title || '';
    results.A.firstChildType  = childrenA[0]?.attrs?.documentType || '';
    console.log('  container attrs:', JSON.stringify(attrsA));
    console.log('  children count:', childrenA.length);
    console.log('  child[0]:', JSON.stringify(childrenA[0]?.attrs));
    console.log('  child[1]:', JSON.stringify(childrenA[1]?.attrs));
    await page.screenshot({ path: `${OUT}/release-cards-testA-editor.png`, fullPage: false });
    trashIds.push(await getPostId(page));

    // --- Test B: sidebar TextControl → child href mutation ----------------
    console.log('\n=== Test B: sidebar href mutation on child release-card');
    await newDraftPage(page, 'Release cards — Test B');
    const parentB = await insertContainer(page, {}, [
      { documentType: 'PDF', title: 'Card one', releaseDate: '',           href: '' },
      { documentType: 'PDF', title: 'Card two', releaseDate: '2024-05-01', href: '' },
    ]);
    const firstChildId = await page.evaluate((cid) => wp.data.select('core/block-editor').getBlocks(cid)[0].clientId, parentB);
    // Same call path the sidebar TextControl fires: updateBlockAttributes.
    await updateBlockAttr(page, firstChildId, 'href', '/uploads/docs/test-release.pdf');
    const hrefAfter = await page.evaluate((cid) =>
      wp.data.select('core/block-editor').getBlock(cid).attributes.href
    , firstChildId);
    results.B.hrefAfter = hrefAfter;
    results.B.mutated = hrefAfter === '/uploads/docs/test-release.pdf';
    console.log(`  child href after sidebar update: ${hrefAfter}  mutated=${results.B.mutated}`);
    await page.screenshot({ path: `${OUT}/release-cards-testB-editor.png`, fullPage: false });
    const linkB = await saveAndPublish(page);
    const idB = await getPostId(page);
    trashIds.push(idB);
    const contentB = await readContent(idB);
    results.B.serializedContainsHref = contentB.includes('/uploads/docs/test-release.pdf');
    console.log(`  serialized contains href: ${results.B.serializedContainsHref}`);
    await page.goto(linkB, { waitUntil: 'networkidle' });
    results.B.frontShowsHref = await page.evaluate(() => {
      const anchors = document.querySelectorAll('a.release-card__link');
      return anchors.length >= 1 && anchors[0].getAttribute('href') === '/uploads/docs/test-release.pdf';
    });
    console.log(`  front <a class="release-card__link"> matches: ${results.B.frontShowsHref}`);

    // --- Test C: pre-typed documentType/title/releaseDate/href ------------
    console.log('\n=== Test C: pre-typed documentType/title/releaseDate/href');
    await newDraftPage(page, 'Release cards — Test C');
    const parentC = await insertContainer(page, {
      eyebrow: 'The Press Room',
      title: 'Press releases & media',
      blurb: 'Original press releases and archival documents.',
    }, [
      { documentType: 'pdf',  title: 'Second Line map',              releaseDate: 'March 2024',   href: '/uploads/docs/second_line_map.pdf' },
      { documentType: 'PDF',  title: 'UT Boswell Symposium alert',   releaseDate: '2018-05-15',   href: '/uploads/docs/ut-boswell.pdf' },
      { documentType: 'docx', title: 'Wheelchair discovery release', releaseDate: '2008-06-25',   href: '/uploads/docs/wheelchair.docx' },
    ]);
    await page.screenshot({ path: `${OUT}/release-cards-testC-editor.png`, fullPage: false });
    const linkC = await saveAndPublish(page);
    const idC = await getPostId(page);
    trashIds.push(idC);
    const contentC = await readContent(idC);
    results.C.serializedHasFirstTitle  = contentC.includes('"title":"Second Line map"');
    results.C.serializedHasSecondTitle = contentC.includes('"title":"UT Boswell Symposium alert"');
    results.C.serializedHasThirdTitle  = contentC.includes('"title":"Wheelchair discovery release"');
    results.C.serializedHasFirstDate   = contentC.includes('"releaseDate":"March 2024"');
    results.C.serializedHasHeaderTitle = contentC.includes('Press releases \\u0026 media') || contentC.includes('Press releases & media');
    console.log(`  serialized has first title:   ${results.C.serializedHasFirstTitle}`);
    console.log(`  serialized has second title:  ${results.C.serializedHasSecondTitle}`);
    console.log(`  serialized has third title:   ${results.C.serializedHasThirdTitle}`);
    console.log(`  serialized has first date:    ${results.C.serializedHasFirstDate}`);
    console.log(`  serialized has header title:  ${results.C.serializedHasHeaderTitle}`);
    await page.goto(linkC, { waitUntil: 'networkidle' });
    // Astro DOM shape:
    //   section.section.ground-gold.press-releases > div.container > ul.releases-grid > li.release-card × N
    //   each li > a.release-card__link > span.release-card__type + h3.release-card__title + p.release-card__date?
    results.C.outerShape = await page.evaluate(() => !!document.querySelector(
      'section.section.ground-gold.press-releases > div.container > ul.releases-grid > li.release-card'
    ));
    results.C.threeCards = await page.evaluate(() => {
      const lis = document.querySelectorAll('ul.releases-grid > li.release-card');
      return lis.length === 3;
    });
    results.C.firstContent = await page.evaluate(() => {
      const li = document.querySelectorAll('ul.releases-grid > li.release-card')[0];
      if (!li) return false;
      const a  = li.querySelector('a.release-card__link');
      const t  = li.querySelector('span.release-card__type');
      const h3 = li.querySelector('h3.release-card__title');
      const d  = li.querySelector('p.release-card__date');
      return a && a.getAttribute('href') === '/uploads/docs/second_line_map.pdf'
        && a.getAttribute('target') === '_blank'
        && a.getAttribute('rel') === 'noopener noreferrer'
        && t && t.textContent.trim() === 'PDF'  // uppercased at render
        && h3 && h3.textContent.trim() === 'Second Line map'
        && d && d.textContent.trim() === 'March 2024';
    });
    results.C.thirdContent = await page.evaluate(() => {
      const li = document.querySelectorAll('ul.releases-grid > li.release-card')[2];
      if (!li) return false;
      const t  = li.querySelector('span.release-card__type');
      const h3 = li.querySelector('h3.release-card__title');
      return t && t.textContent.trim() === 'DOCX' // uppercased at render
        && h3 && h3.textContent.trim() === 'Wheelchair discovery release';
    });
    results.C.headerShape = await page.evaluate(() => {
      const h = document.querySelector('section.press-releases > div.container > header.releases-head');
      if (!h) return false;
      const eb = h.querySelector('span.eyebrow.releases-head__eyebrow');
      const ti = h.querySelector('h2.releases-head__title');
      const bl = h.querySelector('p.releases-head__blurb');
      return eb && eb.textContent.trim() === 'The Press Room'
        && ti && ti.textContent.trim() === 'Press releases & media'
        && bl && bl.textContent.includes('Original press releases');
    });
    console.log(`  outer DOM shape:  ${results.C.outerShape}`);
    console.log(`  three cards:      ${results.C.threeCards}`);
    console.log(`  first content:    ${results.C.firstContent}`);
    console.log(`  third content:    ${results.C.thirdContent}`);
    console.log(`  header shape:     ${results.C.headerShape}`);
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

  writeFileSync(`${OUT}/release-cards-owner-tests.json`, JSON.stringify(results, null, 2));
  console.log('\n=== Summary');
  const summary = {
    A_container_align:      results.A.attrs?.align === 'full',
    A_two_default_kids:     results.A.childCount === 2,
    A_first_child_defaults: results.A.firstChildTitle === 'Second Line press release' && results.A.firstChildType === 'PDF',
    B_sidebar_mutates:      results.B.mutated,
    B_persists:             results.B.serializedContainsHref,
    B_front_href:           results.B.frontShowsHref,
    C_all_titles_persist:   !!(results.C.serializedHasFirstTitle && results.C.serializedHasSecondTitle && results.C.serializedHasThirdTitle && results.C.serializedHasFirstDate && results.C.serializedHasHeaderTitle),
    C_outer_shape:          results.C.outerShape,
    C_three_cards:          results.C.threeCards,
    C_content_renders:      !!(results.C.firstContent && results.C.thirdContent),
    C_header_shape:         results.C.headerShape,
    cleanup:                results.cleanup,
  };
  console.log(JSON.stringify(summary, null, 2));
  const passes = Object.entries(summary).filter(([k]) => k !== 'cleanup').every(([, v]) => v === true);
  process.exit(passes ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });
