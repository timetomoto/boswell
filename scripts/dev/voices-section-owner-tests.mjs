/*
 * Owner tests for bozzies/voices-section:
 *   A. Insert via inserter → default attrs (align='full', empty
 *      eyebrow/title), 1 default inner block (the placeholder paragraph
 *      reading "[Quotes carousel: interactive block pending]").
 *   B. Mutate `title` via updateBlockAttributes (Inspector-equivalent
 *      store dispatch — this block has no bespoke sidebar controls
 *      because eyebrow + title are inline RichText), select the block so
 *      the Inspector opens (no throw = ok), publish, and confirm the
 *      mutated title persists in post_content JSON and lands on the
 *      front `h2.voices-section__title`.
 *   C. Insert with pre-typed eyebrow/title and a body child overriding
 *      the default template → confirm serialized JSON contains both head
 *      attrs and the child, and the rendered front DOM matches Astro's
 *      exact shape (section.section.ground-purple.voices-section >
 *      div.music-backdrop + div.container > header.voices-section__head
 *      [span.eyebrow.voices-section__eyebrow +
 *       h2.voices-section__title] + body content).
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

async function insertBlock(page, attrs = {}, children = null) {
  return await page.evaluate(async ({ a, ch }) => {
    const { createBlock } = wp.blocks;
    const { dispatch } = wp.data;
    const inner = ch ? ch.map(c => createBlock(c.name, c.attributes || {})) : undefined;
    const block = createBlock('bozzies/voices-section', a, inner);
    dispatch('core/block-editor').insertBlock(block);
    await new Promise(r => setTimeout(r, 700));
    return block.clientId;
  }, { a: attrs, ch: children });
}

async function readAttrs(page, clientId) {
  return await page.evaluate((cid) =>
    wp.data.select('core/block-editor').getBlock(cid).attributes
  , clientId);
}

async function readChildren(page, parentClientId) {
  return await page.evaluate((cid) => {
    const kids = wp.data.select('core/block-editor').getBlocks(cid);
    return kids.map(k => ({ name: k.name, attributes: k.attributes }));
  }, parentClientId);
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

    // --- Test A: inserter → default attrs, 1 default inner block ----------
    console.log('\n=== Test A: insert via inserter → default attrs, default template');
    await newDraftPage(page, 'Voices section — Test A');
    const clientA = await insertBlock(page);
    const attrsA = await readAttrs(page, clientA);
    const childrenA = await readChildren(page, clientA);
    results.A.attrs = attrsA;
    results.A.children = childrenA;
    console.log('  attrs:', JSON.stringify(attrsA));
    console.log('  children count:', childrenA.length);
    console.log('  first child:', childrenA[0]?.name, JSON.stringify(childrenA[0]?.attributes).slice(0, 120));
    trashIds.push(await getPostId(page));

    // --- Test B: sidebar Inspector-style mutate + select block --------------
    console.log('\n=== Test B: mutate title via store dispatch + block-select for Inspector');
    await newDraftPage(page, 'Voices section — Test B');
    const clientB = await insertBlock(page, {
      eyebrow: 'In Their Words',
      title:   'Test title.',
    });
    await selectBlock(page, clientB); // Inspector opens; no throw = ok.
    await updateBlockAttr(page, clientB, 'title', 'MUTATED via store dispatch.');
    const titleAfter = await page.evaluate((cid) =>
      wp.data.select('core/block-editor').getBlock(cid).attributes.title
    , clientB);
    results.B.titleAfter = titleAfter;
    results.B.mutated = titleAfter === 'MUTATED via store dispatch.';
    console.log(`  title after update: ${titleAfter}  mutated=${results.B.mutated}`);
    const linkB = await saveAndPublish(page);
    const idB = await getPostId(page);
    trashIds.push(idB);
    const contentB = await readContent(idB);
    results.B.serializedContainsTitle = contentB.includes('"title":"MUTATED via store dispatch."');
    console.log(`  serialized contains title: ${results.B.serializedContainsTitle}`);
    await page.goto(linkB, { waitUntil: 'networkidle' });
    results.B.frontShowsTitle = await page.evaluate(() => {
      const h = document.querySelector('.voices-section h2.voices-section__title');
      return !!h && h.textContent.trim() === 'MUTATED via store dispatch.';
    });
    console.log(`  front h2.voices-section__title matches: ${results.B.frontShowsTitle}`);

    // --- Test C: pre-typed content --------------------------------------
    console.log('\n=== Test C: pre-typed content');
    await newDraftPage(page, 'Voices section — Test C');
    await insertBlock(
      page,
      {
        eyebrow: 'In Their Words',
        title:   'What the world has said about the Boswells',
      },
      [
        { name: 'core/paragraph', attributes: { align: 'center', content: 'C-body-paragraph.' } },
      ]
    );
    const linkC = await saveAndPublish(page);
    const idC = await getPostId(page);
    trashIds.push(idC);
    const contentC = await readContent(idC);
    results.C.serializedHasEyebrow = contentC.includes('"eyebrow":"In Their Words"');
    results.C.serializedHasTitle   = contentC.includes('"title":"What the world has said about the Boswells"');
    results.C.serializedHasBody    = contentC.includes('C-body-paragraph.');
    console.log(`  serialized has eyebrow: ${results.C.serializedHasEyebrow}`);
    console.log(`  serialized has title:   ${results.C.serializedHasTitle}`);
    console.log(`  serialized has body:    ${results.C.serializedHasBody}`);
    await page.goto(linkC, { waitUntil: 'networkidle' });
    results.C.outerShape = await page.evaluate(() => !!document.querySelector(
      'section.section.ground-purple.voices-section > div.music-backdrop + div.container'
    ));
    results.C.headContent = await page.evaluate(() => {
      const head = document.querySelector('.voices-section .voices-section__head');
      if (!head) return false;
      const eb = head.querySelector('span.eyebrow.voices-section__eyebrow');
      const h  = head.querySelector('h2.voices-section__title');
      return eb && eb.textContent.trim() === 'In Their Words'
        && h && h.textContent.trim() === 'What the world has said about the Boswells';
    });
    results.C.bodyRendered = await page.evaluate(() =>
      !!document.querySelector('.voices-section .container p') &&
      document.querySelector('.voices-section .container').textContent.includes('C-body-paragraph.')
    );
    console.log(`  outer DOM shape: ${results.C.outerShape}`);
    console.log(`  head content:    ${results.C.headContent}`);
    console.log(`  body rendered:   ${results.C.bodyRendered}`);
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

  writeFileSync(`${OUT}/voices-section-owner-tests.json`, JSON.stringify(results, null, 2));
  console.log('\n=== Summary');
  const summary = {
    A_default_align:       results.A.attrs?.align === 'full',
    A_default_eyebrow:     results.A.attrs?.eyebrow === '',
    A_default_title:       results.A.attrs?.title === '',
    A_one_child:           (results.A.children || []).length === 1,
    A_child_is_paragraph:  results.A.children?.[0]?.name === 'core/paragraph',
    B_attr_mutates:        results.B.mutated,
    B_persists:            results.B.serializedContainsTitle,
    B_front_title:         results.B.frontShowsTitle,
    C_all_fields_persist:  !!(results.C.serializedHasEyebrow && results.C.serializedHasTitle && results.C.serializedHasBody),
    C_outer_shape:         results.C.outerShape,
    C_head_content:        results.C.headContent,
    C_body_rendered:       results.C.bodyRendered,
    cleanup:               results.cleanup,
  };
  console.log(JSON.stringify(summary, null, 2));
  const passes = Object.entries(summary).filter(([k]) => k !== 'cleanup').every(([, v]) => v === true);
  process.exit(passes ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });
