/*
 * Owner tests for the `page.html` default-template auto-emitted `.page-hero`.
 *
 *   A. Create a new page (no template chosen → default `page.html`), give it
 *      a title, add a paragraph in the content, save+publish. Verify the
 *      published page shows:
 *        - exactly one h1 in <main>
 *        - that h1 is inside `section.page-hero.ground-purple >
 *          div.container-narrow.page-hero__inner`
 *        - h1 has class `page-hero__title` and text = the post title
 *        - no `.page-hero__back` / no `.page-hero__eyebrow` /
 *          no `.page-hero__subtitle`
 *        - the paragraph from post_content still renders inside `<main>`
 *
 *   B. Toggle the page template (sidebar template switcher). Set template
 *      to `page-landing`. Verify the page NO LONGER shows the auto-emitted
 *      hero (main has 0 h1 unless content provides one — since Test B's
 *      content has no hero block, we expect 0 h1 in main). Real sidebar
 *      click: open the "Page" panel and dispatch a template change.
 *
 *   C. Pre-typed content: create a new page (default template) with a
 *      long title + a paragraph typed in the content. Verify title
 *      renders in the hero verbatim (curly-quote-safe) and content
 *      renders unaltered.
 *
 * Trashes test pages afterwards.
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

async function insertParagraph(page, text) {
  await page.evaluate((t) => {
    const { createBlock } = wp.blocks;
    const block = createBlock('core/paragraph', { content: t });
    wp.data.dispatch('core/block-editor').insertBlock(block);
  }, text);
  await page.waitForTimeout(300);
}

async function setTemplate(page, templateSlug) {
  // Real sidebar interaction: open the Page panel, then use a dispatch that
  // matches the sidebar template control (editPost({ template })).
  await page.evaluate(async () => {
    // Ensure the sidebar is open on the document panel.
    const openPanel = wp.data.dispatch('core/edit-post') || wp.data.dispatch('core/editor');
    if (openPanel && openPanel.openGeneralSidebar) {
      openPanel.openGeneralSidebar('edit-post/document');
    }
  });
  await page.waitForTimeout(500);
  await page.evaluate((slug) => {
    wp.data.dispatch('core/editor').editPost({ template: slug });
  }, templateSlug);
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

async function main() {
  const browser = await chromium.launch({ executablePath: chromePath() });
  const ctx = await browser.newContext({ deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.setViewportSize({ width: 1600, height: 1000 });

  const results = { A: {}, B: {}, C: {}, cleanup: [] };
  const trashIds = [];

  try {
    await login(page);

    // --- Test A: default template ------------------------------------------
    console.log('\n=== Test A: new page, default page.html template');
    const titleA = 'Default page hero — Test A';
    await newDraftPage(page, titleA);
    await insertParagraph(page, 'Body copy A.');
    const linkA = await saveAndPublish(page);
    const idA = await getPostId(page);
    trashIds.push(idA);
    await page.goto(linkA, { waitUntil: 'networkidle' });
    const domA = await page.evaluate(({ titleA }) => {
      const h1s = document.querySelectorAll('main h1');
      const heroH1 = document.querySelector('section.page-hero.ground-purple > div.container-narrow.page-hero__inner > h1.page-hero__title');
      const bodyPara = Array.from(document.querySelectorAll('main p')).find(p => p.textContent.trim() === 'Body copy A.');
      return {
        h1Count: h1s.length,
        heroH1Present: !!heroH1,
        heroH1Text: heroH1 ? heroH1.textContent.trim() : null,
        heroH1TextMatches: heroH1 ? heroH1.textContent.trim() === titleA : false,
        noBack:  !document.querySelector('.page-hero .page-hero__back'),
        noEye:   !document.querySelector('.page-hero .page-hero__eyebrow'),
        noSub:   !document.querySelector('.page-hero .page-hero__subtitle'),
        bodyParaRendered: !!bodyPara,
      };
    }, { titleA });
    results.A = domA;
    console.log(JSON.stringify(domA, null, 2));

    // --- Test B: switch template to page-landing ---------------------------
    console.log('\n=== Test B: switch template to page-landing');
    const titleB = 'Default page hero — Test B';
    await newDraftPage(page, titleB);
    await insertParagraph(page, 'Body copy B (no hero block).');
    await setTemplate(page, 'page-landing');
    const linkB = await saveAndPublish(page);
    const idB = await getPostId(page);
    trashIds.push(idB);
    await page.goto(linkB, { waitUntil: 'networkidle' });
    const domB = await page.evaluate(() => {
      const h1s = document.querySelectorAll('main h1');
      const heroSection = document.querySelector('main > section.page-hero');
      return {
        h1Count: h1s.length,
        heroSectionAbsent: !heroSection,
      };
    });
    results.B = domB;
    console.log(JSON.stringify(domB, null, 2));

    // --- Test C: pre-typed content, default template -----------------------
    console.log('\n=== Test C: pre-typed content, default template');
    const titleC = 'Default page hero — Test C — “curly quotes”';
    await newDraftPage(page, titleC);
    await insertParagraph(page, 'Custom body: The Boswells’ signature.');
    const linkC = await saveAndPublish(page);
    const idC = await getPostId(page);
    trashIds.push(idC);
    await page.goto(linkC, { waitUntil: 'networkidle' });
    const domC = await page.evaluate(({ titleC }) => {
      const heroH1 = document.querySelector('section.page-hero.ground-purple > div.container-narrow.page-hero__inner > h1.page-hero__title');
      const bodyPara = Array.from(document.querySelectorAll('main p')).find(p => p.textContent.includes('The Boswells’ signature'));
      return {
        heroH1Text: heroH1 ? heroH1.textContent.trim() : null,
        heroH1TextMatchesCurly: heroH1 ? heroH1.textContent.trim() === titleC : false,
        bodyParaRendered: !!bodyPara,
      };
    }, { titleC });
    results.C = domC;
    console.log(JSON.stringify(domC, null, 2));
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

  writeFileSync(`${OUT}/page-html-default-owner-tests.json`, JSON.stringify(results, null, 2));

  const summary = {
    A_singleH1:               results.A.h1Count === 1,
    A_heroH1Present:          results.A.heroH1Present,
    A_heroH1TextMatches:      results.A.heroH1TextMatches,
    A_noBackNoEyeNoSubtitle:  results.A.noBack && results.A.noEye && results.A.noSub,
    A_bodyParaRendered:       results.A.bodyParaRendered,
    B_zeroH1:                 results.B.h1Count === 0,
    B_heroSectionAbsent:      results.B.heroSectionAbsent,
    C_heroH1CurlyMatches:     results.C.heroH1TextMatchesCurly,
    C_bodyParaRendered:       results.C.bodyParaRendered,
    cleanup:                  results.cleanup,
  };
  console.log('\n=== Summary\n' + JSON.stringify(summary, null, 2));
  const passes = Object.entries(summary).filter(([k]) => k !== 'cleanup').every(([, v]) => v === true);
  process.exit(passes ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });
