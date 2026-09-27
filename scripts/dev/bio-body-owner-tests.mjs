/*
 * Owner tests for bozzies/bio-body:
 *   A. Insert via block inserter (createBlock + insertBlock) → default
 *      template (core/heading + core/paragraph) appears inside .prose.
 *   B. Set portraitAlt via the Advanced sidebar (updateBlockAttributes call
 *      path used by the sidebar TextareaControl) → confirm attribute
 *      persists into post_content and the rendered <img alt="">.
 *   C. Insert with pre-typed inner blocks (a heading + two paragraphs) and
 *      portrait attributes → confirm serialized post_content + rendered
 *      front both show the DOM shape and prose text.
 *
 * Runs against local wp-env as the throwaway `astroshot` administrator.
 * Trashes the test pages afterward.
 *
 * Usage: node scripts/dev/bio-body-owner-tests.mjs
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

const TEST_PORTRAIT_URL = `${WP}/wp-content/uploads/2026/09/martha-portrait.jpg`;
const TEST_PORTRAIT_ID  = 65;

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

async function insertBioBody(page, attrs = {}, innerBlocks = null) {
  return await page.evaluate(async ({ a, inner }) => {
    const { createBlock } = wp.blocks;
    const { dispatch } = wp.data;
    let children = null;
    if (inner) {
      children = inner.map(([n, at]) => createBlock(n, at || {}));
    }
    const block = createBlock('bozzies/bio-body', a, children || []);
    dispatch('core/block-editor').insertBlock(block);
    await new Promise(r => setTimeout(r, 500));
    return block.clientId;
  }, { a: attrs, inner: innerBlocks });
}

async function readChildren(page, parentClientId) {
  return await page.evaluate((cid) => {
    return wp.data.select('core/block-editor').getBlocks(cid).map(b => ({
      name: b.name,
      attributes: b.attributes,
    }));
  }, parentClientId);
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

    // --- Test A: inserter → default template ------------------------------
    console.log('\n=== Test A: insert via inserter → default template');
    await newDraftPage(page, 'Bio body — Test A');
    const parentA = await insertBioBody(page);
    const kidsA = await readChildren(page, parentA);
    results.A.childCount = kidsA.length;
    results.A.childNames = kidsA.map(k => k.name);
    console.log('  children:', kidsA.length, 'names:', results.A.childNames.join(' / '));
    await page.screenshot({ path: `${OUT}/bio-body-testA-editor.png`, fullPage: false });
    const linkA = await saveAndPublish(page);
    results.A.link = linkA;
    trashIds.push(await getPostId(page));

    // --- Test B: sidebar TextareaControl → portraitAlt mutation -----------
    console.log('\n=== Test B: sidebar portraitAlt mutation');
    await newDraftPage(page, 'Bio body — Test B');
    const parentB = await insertBioBody(page, {
      portraitId: TEST_PORTRAIT_ID,
      portraitUrl: TEST_PORTRAIT_URL,
      portraitAlt: '',
      portraitCaption: '',
    });
    // Same call path the Advanced/Portrait sidebar TextareaControl fires:
    // updateBlockAttributes with { portraitAlt: … }.
    await updateBlockAttr(page, parentB, 'portraitAlt', 'Owner-provided alt for the sister portrait');
    const altAfter = await page.evaluate((cid) =>
      wp.data.select('core/block-editor').getBlock(cid).attributes.portraitAlt
    , parentB);
    results.B.portraitAlt = altAfter;
    results.B.mutated = altAfter === 'Owner-provided alt for the sister portrait';
    console.log(`  portraitAlt after sidebar update: ${altAfter}  mutated=${results.B.mutated}`);
    await page.screenshot({ path: `${OUT}/bio-body-testB-editor.png`, fullPage: false });
    const linkB = await saveAndPublish(page);
    const idB = await getPostId(page);
    trashIds.push(idB);
    const contentB = await readContent(idB);
    results.B.serializedContainsAlt = contentB.includes('"portraitAlt":"Owner-provided alt for the sister portrait"');
    console.log(`  serialized contains portraitAlt: ${results.B.serializedContainsAlt}`);
    await page.goto(linkB, { waitUntil: 'networkidle' });
    results.B.frontHasAlt = await page.evaluate(() => {
      const img = document.querySelector('.bio-portrait img');
      return img && img.getAttribute('alt') === 'Owner-provided alt for the sister portrait';
    });
    console.log(`  front <img alt=""> matches: ${results.B.frontHasAlt}`);

    // --- Test C: pre-typed inner blocks + portrait --------------------------
    console.log('\n=== Test C: pre-typed prose inner blocks + portrait');
    await newDraftPage(page, 'Bio body — Test C');
    const parentC = await insertBioBody(page, {
      portraitId: TEST_PORTRAIT_ID,
      portraitUrl: TEST_PORTRAIT_URL,
      portraitAlt: 'Portrait of Test Sister',
      portraitCaption: 'Test Sister',
    }, [
      [ 'core/heading', { level: 2, content: 'Music' } ],
      [ 'core/paragraph', { content: 'She played piano with a thundering left hand.' } ],
      [ 'core/paragraph', { content: 'A second paragraph of prose.' } ],
    ]);
    await page.screenshot({ path: `${OUT}/bio-body-testC-editor.png`, fullPage: false });
    const linkC = await saveAndPublish(page);
    const idC = await getPostId(page);
    trashIds.push(idC);
    const contentC = await readContent(idC);
    results.C.serializedHasHeading   = contentC.includes('<h2 class="wp-block-heading">Music</h2>');
    results.C.serializedHasFirstPara = contentC.includes('She played piano with a thundering left hand.');
    results.C.serializedHasCaption   = contentC.includes('"portraitCaption":"Test Sister"');
    console.log(`  serialized has heading:   ${results.C.serializedHasHeading}`);
    console.log(`  serialized has 1st para:  ${results.C.serializedHasFirstPara}`);
    console.log(`  serialized has caption:   ${results.C.serializedHasCaption}`);
    await page.goto(linkC, { waitUntil: 'networkidle' });
    // DOM shape: <section.section.ground-paper.bio-body>
    //             <div.container.bio-body__layout>
    //               <figure.bio-portrait><img><figcaption.bio-portrait__caption>
    //               <div.prose>…prose…</div>
    results.C.domShape = await page.evaluate(() => !!document.querySelector(
      'section.section.ground-paper.bio-body > div.container.bio-body__layout > figure.bio-portrait > img + figcaption.bio-portrait__caption'
    ));
    results.C.proseSibling = await page.evaluate(() => !!document.querySelector(
      'div.container.bio-body__layout > figure.bio-portrait + div.prose'
    ));
    results.C.proseHeading = await page.evaluate(() => {
      const h = document.querySelector('.bio-body .prose h2');
      return h && h.textContent.trim() === 'Music';
    });
    results.C.proseText = await page.evaluate(() => {
      const ps = Array.from(document.querySelectorAll('.bio-body .prose p'));
      return ps.some(p => p.textContent.includes('She played piano with a thundering left hand.'));
    });
    console.log(`  DOM shape:                ${results.C.domShape}`);
    console.log(`  prose sibling of figure:  ${results.C.proseSibling}`);
    console.log(`  prose renders heading:    ${results.C.proseHeading}`);
    console.log(`  prose renders paragraph:  ${results.C.proseText}`);
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

  writeFileSync(`${OUT}/bio-body-owner-tests.json`, JSON.stringify(results, null, 2));
  console.log('\n=== Summary');
  const summary = {
    A_children_count_ok:  results.A.childCount === 2,
    A_child_names_ok:     JSON.stringify(results.A.childNames || []) === JSON.stringify([ 'core/heading', 'core/paragraph' ]),
    B_sidebar_mutates:    results.B.mutated,
    B_persists:           results.B.serializedContainsAlt,
    B_front_alt:          results.B.frontHasAlt,
    C_inline_persists:    !!(results.C.serializedHasHeading && results.C.serializedHasFirstPara && results.C.serializedHasCaption),
    C_dom_shape:          results.C.domShape,
    C_prose_sibling:      results.C.proseSibling,
    C_prose_renders:      !!(results.C.proseHeading && results.C.proseText),
    cleanup:              results.cleanup,
  };
  console.log(JSON.stringify(summary, null, 2));
  const passes = Object.entries(summary).filter(([k]) => k !== 'cleanup').every(([, v]) => v === true);
  process.exit(passes ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });
