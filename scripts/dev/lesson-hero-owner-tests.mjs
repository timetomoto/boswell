/*
 * Owner tests for bozzies/lesson-hero:
 *   A. Insert via inserter → default attrs (align='full', empty eyebrow/
 *      title/summary, backHref '/media/', backLabel 'Media'), 0 inner blocks.
 *   B. Real sidebar DOM click into the "Back link" > "Destination" TextControl:
 *      locate label, walk to its input, dispatch native input+change events,
 *      confirm the store attr mutates, publish, confirm the mutated backHref
 *      persists in post_content and lands on the front `a.lesson-hero__back`.
 *   C. Insert with pre-typed eyebrow/title/summary/backHref/backLabel →
 *      confirm serialized JSON + rendered front DOM matches Astro's exact
 *      shape (section.lesson-hero.ground-purple > div.music-backdrop
 *       + div.container-narrow.lesson-hero__inner > a.lesson-hero__back
 *       + span.eyebrow.lesson-hero__eyebrow + h1.lesson-hero__title
 *       + p.lesson-hero__summary).
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
    const block = createBlock('bozzies/lesson-hero', a);
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

async function selectBlock(page, clientId) {
  await page.evaluate((cid) => {
    wp.data.dispatch('core/block-editor').selectBlock(cid);
  }, clientId);
  await page.waitForTimeout(700);
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
    await newDraftPage(page, 'Lesson hero — Test A');
    const clientA = await insertBlock(page);
    const attrsA = await readAttrs(page, clientA);
    const childCountA = await readChildCount(page, clientA);
    results.A.attrs = attrsA;
    results.A.childCount = childCountA;
    console.log('  attrs:', JSON.stringify(attrsA));
    console.log('  child count:', childCountA);
    trashIds.push(await getPostId(page));

    // --- Test B: REAL sidebar DOM click → mutate Destination TextControl --
    console.log('\n=== Test B: real sidebar TextControl mutation (Destination)');
    await newDraftPage(page, 'Lesson hero — Test B');
    const clientB = await insertBlock(page, {
      eyebrow:   'Lesson 01',
      title:     'The Blend',
      summary:   'Test summary body.',
      backHref:  '/media/',
      backLabel: 'Media',
    });
    await selectBlock(page, clientB);
    // Ensure the block-editor sidebar is open (some setups collapse it).
    await page.evaluate(async () => {
      const store = wp.data.dispatch('core/edit-post') || wp.data.dispatch('core/editor');
      if (store && store.openGeneralSidebar) {
        try { store.openGeneralSidebar('edit-post/block'); } catch (e) {}
      }
      await new Promise(r => setTimeout(r, 600));
    });
    const newBackHref = '/media/lessons/lesson-3/';
    const sidebarMutated = await page.evaluate(async (val) => {
      const SIDEBAR = '.editor-block-inspector, .interface-complementary-area, .block-editor-block-inspector';
      // The "Back link" panel has initialOpen:true, so no toggle needed —
      // but call it defensively if collapsed.
      const panelButtons = Array.from(document.querySelectorAll(`${SIDEBAR} .components-button.components-panel__body-toggle`));
      const backPanel = panelButtons.find(b => (b.textContent || '').trim() === 'Back link');
      if (backPanel && backPanel.getAttribute('aria-expanded') === 'false') backPanel.click();
      await new Promise(r => setTimeout(r, 400));
      // Find the "Destination" TextControl label, walk to input.
      const labels = Array.from(document.querySelectorAll(`${SIDEBAR} .components-base-control__label, ${SIDEBAR} label`));
      const destLabel = labels.find(l => (l.textContent || '').trim() === 'Destination');
      const controlWrap = destLabel && (destLabel.closest('.components-base-control') || destLabel.parentElement);
      const input = controlWrap && controlWrap.querySelector('input');
      if (!input) {
        return {
          ok: false,
          reason: 'no input',
          panelCount: panelButtons.length,
          labelCount: labels.length,
          labels: labels.slice(0, 20).map(l => (l.textContent || '').trim()),
        };
      }
      input.focus();
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeSetter.call(input, val);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.dispatchEvent(new Event('blur', { bubbles: true }));
      await new Promise(r => setTimeout(r, 500));
      return { ok: true };
    }, newBackHref);
    results.B.sidebarInteraction = sidebarMutated;
    console.log('  sidebar interaction:', JSON.stringify(sidebarMutated));
    const attrsAfter = await readAttrs(page, clientB);
    results.B.backHrefAfter = attrsAfter.backHref;
    results.B.mutated = attrsAfter.backHref === newBackHref;
    console.log(`  backHref after: ${results.B.backHrefAfter}  mutated=${results.B.mutated}`);
    const linkB = await saveAndPublish(page);
    const idB = await getPostId(page);
    trashIds.push(idB);
    const contentB = await readContent(idB);
    results.B.serializedContainsHref = contentB.includes('"backHref":"/media/lessons/lesson-3/"');
    console.log(`  serialized contains backHref: ${results.B.serializedContainsHref}`);
    await page.goto(linkB, { waitUntil: 'networkidle' });
    results.B.frontShowsHref = await page.evaluate(() => {
      const a = document.querySelector('.lesson-hero a.lesson-hero__back');
      return !!a && a.getAttribute('href') === '/media/lessons/lesson-3/';
    });
    console.log(`  front a.lesson-hero__back[href] matches: ${results.B.frontShowsHref}`);

    // --- Test C: pre-typed content ---------------------------------------
    console.log('\n=== Test C: pre-typed content');
    await newDraftPage(page, 'Lesson hero — Test C');
    await insertBlock(page, {
      eyebrow:   'Lesson 03',
      title:     'The Riffs',
      summary:   'The instrumental-style rhythmic figures the Boswells pulled off with their voices.',
      backHref:  '/media/lessons/',
      backLabel: 'Back to Media',
    });
    const linkC = await saveAndPublish(page);
    const idC = await getPostId(page);
    trashIds.push(idC);
    const contentC = await readContent(idC);
    results.C.serializedHasEyebrow    = contentC.includes('"eyebrow":"Lesson 03"');
    results.C.serializedHasTitle      = contentC.includes('"title":"The Riffs"');
    results.C.serializedHasSummary    = contentC.includes('The instrumental-style rhythmic figures');
    results.C.serializedHasBackHref   = contentC.includes('"backHref":"/media/lessons/"');
    results.C.serializedHasBackLabel  = contentC.includes('"backLabel":"Back to Media"');
    console.log(`  serialized has eyebrow:   ${results.C.serializedHasEyebrow}`);
    console.log(`  serialized has title:     ${results.C.serializedHasTitle}`);
    console.log(`  serialized has summary:   ${results.C.serializedHasSummary}`);
    console.log(`  serialized has backHref:  ${results.C.serializedHasBackHref}`);
    console.log(`  serialized has backLabel: ${results.C.serializedHasBackLabel}`);
    await page.goto(linkC, { waitUntil: 'networkidle' });
    results.C.outerShape = await page.evaluate(() => !!document.querySelector(
      'section.lesson-hero.ground-purple > div.music-backdrop + div.container-narrow.lesson-hero__inner'
    ));
    results.C.innerContent = await page.evaluate(() => {
      const inner = document.querySelector('.lesson-hero .container-narrow.lesson-hero__inner');
      if (!inner) return false;
      const back = inner.querySelector('a.lesson-hero__back');
      const eb   = inner.querySelector('span.eyebrow.lesson-hero__eyebrow');
      const h    = inner.querySelector('h1.lesson-hero__title');
      const p    = inner.querySelector('p.lesson-hero__summary');
      return back && back.getAttribute('href') === '/media/lessons/'
        && back.textContent.trim() === '← Back to Media'
        && eb   && eb.textContent.trim() === 'Lesson 03'
        && h    && h.textContent.trim() === 'The Riffs'
        && p    && p.textContent.trim().startsWith('The instrumental-style rhythmic figures');
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

  writeFileSync(`${OUT}/lesson-hero-owner-tests.json`, JSON.stringify(results, null, 2));
  console.log('\n=== Summary');
  const summary = {
    A_default_align:      results.A.attrs?.align === 'full',
    A_default_eyebrow:    results.A.attrs?.eyebrow === '',
    A_default_title:      results.A.attrs?.title === '',
    A_default_summary:    results.A.attrs?.summary === '',
    A_default_backHref:   results.A.attrs?.backHref === '/media/',
    A_default_backLabel:  results.A.attrs?.backLabel === 'Media',
    A_no_children:        results.A.childCount === 0,
    B_sidebar_ok:         results.B.sidebarInteraction?.ok === true,
    B_attr_mutates:       results.B.mutated,
    B_persists:           results.B.serializedContainsHref,
    B_front_href:         results.B.frontShowsHref,
    C_all_fields_persist: !!(results.C.serializedHasEyebrow && results.C.serializedHasTitle && results.C.serializedHasSummary && results.C.serializedHasBackHref && results.C.serializedHasBackLabel),
    C_outer_shape:        results.C.outerShape,
    C_inner_content:      results.C.innerContent,
    cleanup:              results.cleanup,
  };
  console.log(JSON.stringify(summary, null, 2));
  const passes = Object.entries(summary).filter(([k]) => k !== 'cleanup').every(([, v]) => v === true);
  process.exit(passes ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });
