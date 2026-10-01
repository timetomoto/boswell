/*
 * Owner tests for bozzies/pull-quote:
 *   A. Insert via inserter → default attrs (align='full', empty quote/
 *      attribution, backdrop='none'), no inner blocks.
 *   B. Mutate `backdrop` via sidebar SelectControl (Inspector), publish,
 *      confirm the mutation persists in post_content JSON and lands on
 *      the front section as `.music-backdrop` with `svg pattern#notes`.
 *   C. Insert with pre-typed quote/attribution/backdrop → confirm
 *      serialized JSON contains all three, and the rendered front DOM
 *      matches Astro's exact shape (section.section.ground-purple >
 *      div.music-backdrop + div.container > figure.pull-quote >
 *      blockquote.pull-quote__quote + figcaption.pull-quote__attr).
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
    const block = createBlock('bozzies/pull-quote', a);
    dispatch('core/block-editor').insertBlock(block);
    await new Promise(r => setTimeout(r, 700));
    return block.clientId;
  }, { a: attrs });
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

async function selectBlock(page, clientId) {
  await page.evaluate((cid) => {
    wp.data.dispatch('core/block-editor').selectBlock(cid);
  }, clientId);
  await page.waitForTimeout(800);
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

    // --- Test A ---
    console.log('\n=== Test A: insert via inserter → default attrs, no children');
    await newDraftPage(page, 'Pull quote — Test A');
    const clientA = await insertBlock(page);
    const attrsA = await readAttrs(page, clientA);
    const childrenA = await readChildren(page, clientA);
    results.A.attrs = attrsA;
    results.A.childrenCount = childrenA.length;
    console.log('  attrs:', JSON.stringify(attrsA));
    console.log('  children count:', childrenA.length);
    trashIds.push(await getPostId(page));

    // --- Test B: real sidebar SelectControl click ---
    console.log('\n=== Test B: mutate backdrop via sidebar SelectControl');
    await newDraftPage(page, 'Pull quote — Test B');
    const clientB = await insertBlock(page, {
      quote: 'A test quote.',
      attribution: 'Test Attribution',
      backdrop: 'none',
    });
    await selectBlock(page, clientB);
    // The block's sidebar SelectControl is the "Music backdrop" field.
    // Grab the actual <select> element and change its value.
    const changed = await page.evaluate(() => {
      const sel = document.querySelector('.interface-interface-skeleton__sidebar select');
      if (!sel) return { found: false };
      sel.value = 'notes';
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      return { found: true, value: sel.value };
    });
    results.B.sidebarFound = !!changed.found;
    await page.waitForTimeout(600);
    const attrsB = await readAttrs(page, clientB);
    results.B.attrsAfter = attrsB;
    results.B.mutated = attrsB.backdrop === 'notes';
    console.log(`  sidebar select found: ${changed.found}  backdrop after: ${attrsB.backdrop}`);
    const linkB = await saveAndPublish(page);
    const idB = await getPostId(page);
    trashIds.push(idB);
    const contentB = await readContent(idB);
    results.B.serializedHasNotes = contentB.includes('"backdrop":"notes"');
    console.log(`  serialized contains backdrop:notes: ${results.B.serializedHasNotes}`);
    await page.goto(linkB, { waitUntil: 'networkidle' });
    results.B.frontHasBackdrop = await page.evaluate(() => {
      const s = document.querySelector('.section.ground-purple');
      if (!s) return false;
      const mb = s.querySelector('.music-backdrop svg pattern#notes');
      return !!mb;
    });
    console.log(`  front DOM has .music-backdrop svg pattern#notes: ${results.B.frontHasBackdrop}`);

    // --- Test C: pre-typed content ---
    console.log('\n=== Test C: pre-typed content');
    await newDraftPage(page, 'Pull quote — Test C');
    await insertBlock(page, {
      quote: 'Pre-typed quote for Test C.',
      attribution: 'Test C author',
      backdrop: 'notes',
    });
    const linkC = await saveAndPublish(page);
    const idC = await getPostId(page);
    trashIds.push(idC);
    const contentC = await readContent(idC);
    results.C.serializedHasQuote = contentC.includes('Pre-typed quote for Test C');
    results.C.serializedHasAttribution = contentC.includes('"attribution":"Test C author"');
    results.C.serializedHasBackdrop = contentC.includes('"backdrop":"notes"');
    console.log(`  serialized has quote: ${results.C.serializedHasQuote}`);
    console.log(`  serialized has attribution: ${results.C.serializedHasAttribution}`);
    console.log(`  serialized has backdrop: ${results.C.serializedHasBackdrop}`);
    await page.goto(linkC, { waitUntil: 'networkidle' });
    results.C.outerShape = await page.evaluate(() => !!document.querySelector(
      'section.section.ground-purple > div.music-backdrop + div.container > figure.pull-quote > blockquote.pull-quote__quote + figcaption.pull-quote__attr'
    ));
    results.C.quoteText = await page.evaluate(() => {
      const q = document.querySelector('.pull-quote__quote');
      return q && q.textContent.trim();
    });
    results.C.attrText = await page.evaluate(() => {
      const a = document.querySelector('.pull-quote__attr');
      return a && a.textContent.trim();
    });
    console.log(`  outer DOM shape: ${results.C.outerShape}`);
    console.log(`  quote text: ${results.C.quoteText}`);
    console.log(`  attr text:  ${results.C.attrText}`);
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

  writeFileSync(`${OUT}/pull-quote-owner-tests.json`, JSON.stringify(results, null, 2));
  const summary = {
    A_default_align:       results.A.attrs?.align === 'full',
    A_default_quote:       results.A.attrs?.quote === '',
    A_default_attribution: results.A.attrs?.attribution === '',
    A_default_backdrop:    results.A.attrs?.backdrop === 'none',
    A_no_children:         results.A.childrenCount === 0,
    B_sidebar_found:       results.B.sidebarFound,
    B_attr_mutates:        results.B.mutated,
    B_persists:            results.B.serializedHasNotes,
    B_front_backdrop:      results.B.frontHasBackdrop,
    C_serialized_quote:    results.C.serializedHasQuote,
    C_serialized_attr:     results.C.serializedHasAttribution,
    C_serialized_backdrop: results.C.serializedHasBackdrop,
    C_outer_shape:         results.C.outerShape,
    C_quote_matches:       results.C.quoteText === 'Pre-typed quote for Test C.',
    C_attr_matches:        results.C.attrText === '— Test C author',
    cleanup:               results.cleanup,
  };
  console.log('\n=== Summary');
  console.log(JSON.stringify(summary, null, 2));
  const passes = Object.entries(summary).filter(([k]) => k !== 'cleanup').every(([, v]) => v === true);
  process.exit(passes ? 0 : 1);
}
main().catch(e => { console.error(e); process.exit(1); });
