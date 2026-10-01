/*
 * Owner tests for the photo hero:
 *   A. Insert the "Photo hero" pattern (bozzies/hero-photo) via the inserter
 *      → confirms the resulting bozzies/section block carries heroPhoto=true,
 *      Astro classes on inner blocks (.eyebrow.hero__eyebrow, .hero__title,
 *      .hero__subtitle), and a backgroundImage attribute pre-filled.
 *   B. Toggle the "Photo hero" sidebar switch off → confirm heroPhoto flips
 *      to false, inner blocks are preserved (owner content never wiped), and
 *      re-enable → attributes restore. Save → confirm the front page renders
 *      the ordinary bozzies-section wrapper when off, and Astro's `.hero`
 *      DOM when on.
 *   C. Insert a bozzies/section with pre-typed content (heroPhoto:true +
 *      eyebrow/title/subtitle inner blocks + backgroundImage) → confirm
 *      the front-end DOM matches Astro's exact `.hero.hero--full-bleed`
 *      shape (section > .hero__image-wrap > img + .hero__tint + .hero__scrim,
 *      .hero__frame, .hero__content.container > .hero__eyebrow + .hero__title
 *      + .hero__subtitle + .hero__glyph).
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
const OUT = resolve(__dirname, '../../_screens/photo-hero-verify');
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
  await page.waitForTimeout(3500);
  await page.evaluate(() => {
    document.querySelectorAll('.components-modal__screen-overlay, .components-guide').forEach(el => el.remove());
  });
  await page.evaluate((t) => wp.data.dispatch('core/editor').editPost({ title: t }), title);
}

async function insertPattern(page, slug) {
  // Read the registered pattern from wp.data (core) and insert it.
  return await page.evaluate(async (patternSlug) => {
    // Wait for the block-patterns to be loaded into the store.
    const getPatterns = () => wp.data.select('core').getBlockPatterns() || [];
    for (let i = 0; i < 40 && getPatterns().length === 0; i++) {
      await new Promise(r => setTimeout(r, 250));
    }
    const patterns = getPatterns();
    const p = patterns.find(x => x.name === patternSlug);
    if (!p) throw new Error(`pattern ${patternSlug} not found (had ${patterns.length})`);
    const blocks = wp.blocks.parse(p.content);
    wp.data.dispatch('core/block-editor').insertBlocks(blocks);
    await new Promise(r => setTimeout(r, 500));
    const inserted = wp.data.select('core/block-editor').getBlocks();
    return inserted[inserted.length - 1].clientId;
  }, slug);
}

async function insertBlock(page, name, attrs, inner = []) {
  return await page.evaluate(async ({ n, a, i }) => {
    const { createBlock } = wp.blocks;
    const innerBlocks = i.map((c) => createBlock(c.name, c.attrs || {}, []));
    const block = createBlock(n, a, innerBlocks);
    wp.data.dispatch('core/block-editor').insertBlock(block);
    await new Promise(r => setTimeout(r, 500));
    return block.clientId;
  }, { n: name, a: attrs, i: inner });
}

async function readAttrs(page, clientId) {
  return await page.evaluate((cid) =>
    wp.data.select('core/block-editor').getBlock(cid).attributes
  , clientId);
}

async function readInnerBlockNames(page, clientId) {
  return await page.evaluate((cid) =>
    wp.data.select('core/block-editor').getBlocks(cid).map((b) => ({ name: b.name, attrs: b.attributes }))
  , clientId);
}

async function updateBlockAttr(page, clientId, patch) {
  await page.evaluate(({ cid, p }) => {
    wp.data.dispatch('core/block-editor').updateBlockAttributes(cid, p);
  }, { cid: clientId, p: patch });
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
    for (let i = 0; i < 40; i++) {
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

    // --- Test A: insert pattern from inserter ---------------------------
    console.log('\n=== Test A: inserter pattern → heroPhoto=true, Astro classes on inner blocks');
    await newDraftPage(page, 'Photo hero — Test A');
    const clientA = await insertPattern(page, 'bozzies/hero-photo');
    const attrsA = await readAttrs(page, clientA);
    const innerA = await readInnerBlockNames(page, clientA);
    results.A.attrs = attrsA;
    results.A.inner = innerA;
    results.A.heroPhoto      = attrsA.heroPhoto === true;
    results.A.heroFrame      = attrsA.heroFrame === true;
    results.A.backgroundStyle = attrsA.backgroundStyle === 'ink';
    results.A.hasBgImage     = !!(attrsA.backgroundImage && attrsA.backgroundImage.url);
    results.A.innerCount     = innerA.length === 3;
    results.A.eyebrowClass   = /(?:^|\s)hero__eyebrow(?:\s|$)/.test(innerA[0]?.attrs?.className || '');
    results.A.titleClass     = /(?:^|\s)hero__title(?:\s|$)/.test(innerA[1]?.attrs?.className || '');
    results.A.subtitleClass  = /(?:^|\s)hero__subtitle(?:\s|$)/.test(innerA[2]?.attrs?.className || '');
    console.log(`  heroPhoto=${attrsA.heroPhoto}  heroFrame=${attrsA.heroFrame}  bgStyle=${attrsA.backgroundStyle}  bgImage=${results.A.hasBgImage}`);
    console.log(`  inner: ${innerA.map(b => `${b.name} .${b.attrs?.className || ''}`).join(' | ')}`);
    trashIds.push(await getPostId(page));

    // --- Test B: sidebar toggle heroPhoto off → inner content preserved --
    console.log('\n=== Test B: sidebar toggle heroPhoto off → inner content preserved');
    await newDraftPage(page, 'Photo hero — Test B');
    const clientB = await insertPattern(page, 'bozzies/hero-photo');
    // Set a distinctive title so we can prove content isn't wiped on toggle.
    const innerBefore = await readInnerBlockNames(page, clientB);
    const titleBlockId = await page.evaluate((cid) => {
      return wp.data.select('core/block-editor').getBlocks(cid)[1].clientId;
    }, clientB);
    await page.evaluate(({ tid }) => {
      wp.data.dispatch('core/block-editor').updateBlockAttributes(tid, { content: 'PRESERVE ME' });
    }, { tid: titleBlockId });
    // Toggle off.
    await updateBlockAttr(page, clientB, { heroPhoto: false });
    const attrsBOff = await readAttrs(page, clientB);
    const innerBOff = await readInnerBlockNames(page, clientB);
    results.B.toggledOff  = attrsBOff.heroPhoto === false;
    results.B.contentKept = innerBOff.some(b => (b.attrs?.content || '').includes('PRESERVE ME'));
    console.log(`  toggled off: ${results.B.toggledOff}  content preserved: ${results.B.contentKept}`);
    // Toggle back on.
    await updateBlockAttr(page, clientB, { heroPhoto: true });
    const attrsBOn = await readAttrs(page, clientB);
    const innerBOn = await readInnerBlockNames(page, clientB);
    results.B.toggledOn      = attrsBOn.heroPhoto === true;
    results.B.contentKeptOn  = innerBOn.some(b => (b.attrs?.content || '').includes('PRESERVE ME'));
    console.log(`  re-toggled on: ${results.B.toggledOn}  content still preserved: ${results.B.contentKeptOn}`);
    const linkB = await saveAndPublish(page);
    const idB = await getPostId(page);
    trashIds.push(idB);
    await page.goto(linkB, { waitUntil: 'networkidle' });
    results.B.frontHeroSection = await page.evaluate(() =>
      !!document.querySelector('section.wp-block-bozzies-section.is-hero-photo')
    );
    results.B.frontEyebrow = await page.evaluate(() =>
      !!document.querySelector('.hero__content .eyebrow.hero__eyebrow')
    );
    results.B.frontTitleText = await page.evaluate(() => {
      const h1 = document.querySelector('h1.hero__title');
      return h1 && h1.textContent.trim() === 'PRESERVE ME';
    });
    console.log(`  front .is-hero-photo: ${results.B.frontHeroSection}  eyebrow: ${results.B.frontEyebrow}  title kept: ${results.B.frontTitleText}`);

    // --- Test C: pre-typed content ---------------------------------------
    console.log('\n=== Test C: pre-typed content → Astro DOM shape on front');
    await newDraftPage(page, 'Photo hero — Test C');
    const clientC = await insertBlock(page, 'bozzies/section', {
      backgroundStyle: 'ink',
      width: 'container',
      headingWidth: 'container',
      spacing: 'spacious',
      overlayColor: '#181615',
      overlayStrength: 55,
      heroFrame: true,
      imageGrayscale: true,
      imageZoom: true,
      heroPhoto: true,
      align: 'full',
      backgroundImage: {
        id: 62,
        url: 'http://localhost:8888/wp-content/uploads/2026/09/Boswell_Sisters_1932.jpg',
        alt: 'Test hero image.'
      },
    }, [
      { name: 'core/paragraph', attrs: { className: 'eyebrow hero__eyebrow', content: 'Test Eyebrow' } },
      { name: 'core/heading',   attrs: { level: 1, className: 'hero__title', content: 'Test Title' } },
      { name: 'core/paragraph', attrs: { className: 'hero__subtitle', content: 'Test subtitle text.' } },
    ]);
    const linkC = await saveAndPublish(page);
    const idC = await getPostId(page);
    trashIds.push(idC);
    const contentC = readContent(idC);
    results.C.serializedHasHeroPhoto = contentC.includes('"heroPhoto":true');
    results.C.serializedHasBgImage   = contentC.includes('Boswell_Sisters_1932.jpg');
    results.C.serializedHasEyebrow   = contentC.includes('Test Eyebrow');
    results.C.serializedHasTitle     = contentC.includes('Test Title');
    results.C.serializedHasSubtitle  = contentC.includes('Test subtitle text.');
    console.log(`  serialized heroPhoto:${results.C.serializedHasHeroPhoto} bgImage:${results.C.serializedHasBgImage} eyebrow:${results.C.serializedHasEyebrow} title:${results.C.serializedHasTitle} subtitle:${results.C.serializedHasSubtitle}`);
    await page.goto(linkC, { waitUntil: 'networkidle' });
    results.C.outerShape = await page.evaluate(() => {
      return !!document.querySelector('section.wp-block-bozzies-section.is-hero-photo.hero.hero--full-bleed');
    });
    results.C.imageWrap = await page.evaluate(() => {
      const w = document.querySelector('.hero__image-wrap');
      if (!w) return false;
      return !!w.querySelector('img.hero__image')
          && !!w.querySelector('.hero__tint')
          && !!w.querySelector('.hero__scrim');
    });
    results.C.frameCorners = await page.evaluate(() => {
      return document.querySelectorAll('.hero__frame .hero__frame-corner').length === 4;
    });
    results.C.content = await page.evaluate(() => {
      const c = document.querySelector('.hero__content.container');
      if (!c) return false;
      const eb = c.querySelector('.eyebrow.hero__eyebrow');
      const h1 = c.querySelector('h1.hero__title');
      const p  = c.querySelector('p.hero__subtitle');
      const g  = c.querySelector('.hero__glyph svg');
      return eb && eb.textContent.trim() === 'Test Eyebrow'
        && h1 && h1.textContent.trim() === 'Test Title'
        && p  && p.textContent.includes('Test subtitle text.')
        && !!g;
    });
    console.log(`  outer shape: ${results.C.outerShape}  image-wrap: ${results.C.imageWrap}  4 corners: ${results.C.frameCorners}  content: ${results.C.content}`);
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

  writeFileSync(`${OUT}/photo-hero-owner-tests.json`, JSON.stringify(results, null, 2));
  console.log('\n=== Summary');
  const summary = {
    A_heroPhoto_on:       results.A.heroPhoto,
    A_heroFrame_on:       results.A.heroFrame,
    A_bg_style_ink:       results.A.backgroundStyle,
    A_has_bg_image:       results.A.hasBgImage,
    A_three_inner_blocks: results.A.innerCount,
    A_eyebrow_class:      results.A.eyebrowClass,
    A_title_class:        results.A.titleClass,
    A_subtitle_class:     results.A.subtitleClass,
    B_toggle_off:         results.B.toggledOff,
    B_content_preserved:  results.B.contentKept,
    B_toggle_on:          results.B.toggledOn,
    B_content_preserved_on: results.B.contentKeptOn,
    B_front_hero_section: results.B.frontHeroSection,
    B_front_eyebrow:      results.B.frontEyebrow,
    B_front_title_kept:   results.B.frontTitleText,
    C_serialized_heroPhoto: results.C.serializedHasHeroPhoto,
    C_serialized_bg:      results.C.serializedHasBgImage,
    C_serialized_eyebrow: results.C.serializedHasEyebrow,
    C_serialized_title:   results.C.serializedHasTitle,
    C_serialized_subtitle: results.C.serializedHasSubtitle,
    C_outer_shape:        results.C.outerShape,
    C_image_wrap_layers:  results.C.imageWrap,
    C_four_frame_corners: results.C.frameCorners,
    C_content_shape:      results.C.content,
    cleanup:              results.cleanup,
  };
  console.log(JSON.stringify(summary, null, 2));
  const passes = Object.entries(summary).filter(([k]) => k !== 'cleanup').every(([, v]) => v === true);
  process.exit(passes ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });
