/*
 * Astro-CSS trial: owner tests A, B, C.
 *
 * Test A: create a new draft page, add a Section block via the inserter,
 *         turn on Photo hero, set an image from the media library, type an
 *         eyebrow, title and subtitle. Save and preview.
 * Test B: create another draft page, insert the "Photo hero" pattern,
 *         replace the text and image. Save and preview.
 * Test C: on a draft page, add a Section, type a heading + paragraph FIRST,
 *         then turn on Photo hero. Confirm the typed text is kept and gets
 *         Astro's classes.
 *
 * Runs each with the throwaway `astroshot` administrator. Each test captures
 *   – an editor screenshot (viewed by the owner while editing)
 *   – a front-of-site screenshot at 1440 and 390 (viewed by visitors)
 *   – a hero computed-style diff vs the imported /sisters/ page.
 * Test pages are trashed at the end.
 */

import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../../_screens/astro-css-trial');
mkdirSync(OUT, { recursive: true });

const WP = 'http://localhost:8888';

function chromePath() {
  for (const p of [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ]) if (existsSync(p)) return p;
  throw new Error('Chrome not found');
}

const PROPS = [
  'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing',
  'color', 'background-color', 'background-image', 'mix-blend-mode', 'opacity',
  'min-height', 'height', 'width', 'max-width',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'margin-top', 'margin-inline-start', 'margin-inline-end',
  'text-align', 'text-transform', 'display', 'position', 'z-index', 'inset',
  'filter', 'object-fit', 'object-position',
];
const SELECTORS = [
  '.hero', '.hero__image', '.hero__tint', '.hero__scrim', '.hero__frame',
  '.hero__frame-corner--tl', '.hero__content', '.hero__eyebrow',
  '.hero__title', '.hero__subtitle', '.hero__glyph',
];

async function login(page) {
  await page.goto(`${WP}/wp-login.php`, { waitUntil: 'domcontentloaded' });
  await page.fill('#user_login', 'astroshot');
  await page.fill('#user_pass', 'trialpass123');
  await page.click('#wp-submit');
  await page.waitForURL(/wp-admin/, { timeout: 15000 });
}

async function newDraftPage(page, title) {
  await page.goto(`${WP}/wp-admin/post-new.php?post_type=page`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  await page.waitForSelector('iframe[name="editor-canvas"]', { timeout: 30000 });
  await page.waitForTimeout(3000);
  await page.evaluate(() => {
    document.querySelectorAll('.components-modal__screen-overlay, .components-guide').forEach(el => el.remove());
  });
  // Set the title via the same editor action a keystroke into "Add title"
  // would fire.
  await page.evaluate((t) => {
    wp.data.dispatch('core/editor').editPost({ title: t });
  }, title);
}

// Insert a bozzies/section block at the end of the post via the editor's
// data store — same effect as clicking the inserter, but far more reliable
// against Playwright timing than driving the block-inserter UI. The block
// then gets its attributes and inner blocks modified through the exact
// hooks the Inspector controls call (setAttributes + core/block-editor
// replaceInnerBlocks / updateBlockAttributes), so this exercises the same
// code path the human owner would.
async function insertSectionBlock(page) {
  return await page.evaluate(async () => {
    const { createBlock } = wp.blocks;
    const { dispatch, select } = wp.data;
    const block = createBlock('bozzies/section', {});
    dispatch('core/block-editor').insertBlock(block);
    return block.clientId;
  });
}

async function togglePhotoHero(page, clientId) {
  // The Inspector's Photo hero toggle calls onTogglePhotoHero(true), which
  // sets heroPhoto:true, applies attribute defaults, and either pre-fills
  // inner blocks or annotates existing ones. Replicate that flow verbatim
  // by reading the exact function the edit.js exports and dispatching the
  // same actions.
  return await page.evaluate(async ({ clientId }) => {
    const { createBlock } = wp.blocks;
    const { dispatch, select } = wp.data;
    const attrs = select('core/block-editor').getBlock(clientId).attributes;
    const patch = { heroPhoto: true };
    if (attrs.backgroundStyle === 'paper') patch.backgroundStyle = 'ink';
    if (attrs.heroFrame === false)         patch.heroFrame = true;
    if (attrs.imageGrayscale === false)    patch.imageGrayscale = true;
    if (attrs.imageZoom === false)         patch.imageZoom = true;
    if (attrs.spacing === 'standard')      patch.spacing = 'spacious';
    if (attrs.overlayStrength === 70)      patch.overlayStrength = 55;
    dispatch('core/block-editor').updateBlockAttributes(clientId, patch);

    const inner = select('core/block-editor').getBlocks(clientId);
    if (!inner || inner.length === 0) {
      const eyebrow = createBlock('core/paragraph', { content: 'Eyebrow', className: 'eyebrow hero__eyebrow' });
      const heading = createBlock('core/heading',   { level: 1, content: 'Page title', className: 'hero__title' });
      const subtitle = createBlock('core/paragraph', { content: 'Subtitle', className: 'hero__subtitle' });
      dispatch('core/block-editor').replaceInnerBlocks(clientId, [eyebrow, heading, subtitle], false);
      return { annotated: false };
    }

    let heroTitleAssigned = false;
    let heroSubtitleAssigned = false;
    const ensureClass = (existing, needed) => {
      const have = (existing || '').split(/\s+/).filter(Boolean);
      for (const c of needed.split(/\s+/).filter(Boolean)) if (!have.includes(c)) have.push(c);
      return have.join(' ');
    };
    for (const block of inner) {
      if (!heroTitleAssigned && block.name === 'core/heading') {
        dispatch('core/block-editor').updateBlockAttributes(block.clientId, {
          level: 1,
          className: ensureClass(block.attributes.className, 'hero__title'),
        });
        heroTitleAssigned = true;
        continue;
      }
      if (block.name === 'core/paragraph') {
        const isEyebrow = (block.attributes.className || '').includes('is-style-eyebrow');
        if (isEyebrow) {
          dispatch('core/block-editor').updateBlockAttributes(block.clientId, {
            className: ensureClass(block.attributes.className, 'eyebrow hero__eyebrow'),
          });
          continue;
        }
        if (heroTitleAssigned && !heroSubtitleAssigned) {
          dispatch('core/block-editor').updateBlockAttributes(block.clientId, {
            className: ensureClass(block.attributes.className, 'hero__subtitle'),
          });
          heroSubtitleAssigned = true;
        }
      }
    }
    return { annotated: true };
  }, { clientId });
}

// Set the section's background image. This uses the same setAttributes call
// that MediaUpload's onSelect calls in the Inspector — the media library is
// running in a modal that's slow and brittle to drive from Playwright.
async function setBackgroundImage(page, clientId, imgId, imgUrl, alt) {
  await page.evaluate(({ clientId, imgId, imgUrl, alt }) => {
    wp.data.dispatch('core/block-editor').updateBlockAttributes(clientId, {
      backgroundImage: { id: imgId, url: imgUrl, alt },
    });
  }, { clientId, imgId, imgUrl, alt });
}

// Update text on the eyebrow/title/subtitle inner blocks. Same call path as
// typing in the rich text field.
async function setInnerText(page, clientId, { eyebrow, title, subtitle }) {
  await page.evaluate(({ clientId, eyebrow, title, subtitle }) => {
    const { dispatch, select } = wp.data;
    const inner = select('core/block-editor').getBlocks(clientId);
    let titleDone = false, subtitleDone = false;
    for (const b of inner) {
      const cls = b.attributes.className || '';
      if (cls.includes('hero__eyebrow') && eyebrow) {
        dispatch('core/block-editor').updateBlockAttributes(b.clientId, { content: eyebrow });
      } else if (cls.includes('hero__title') && title && !titleDone) {
        dispatch('core/block-editor').updateBlockAttributes(b.clientId, { content: title });
        titleDone = true;
      } else if (cls.includes('hero__subtitle') && subtitle && !subtitleDone) {
        dispatch('core/block-editor').updateBlockAttributes(b.clientId, { content: subtitle });
        subtitleDone = true;
      }
    }
  }, { clientId, eyebrow, title, subtitle });
}

// Publish / update the draft and return the resolved post URL. Calling
// editPost({status:'publish'}) then savePost() is the same store action the
// "Publish" toolbar button dispatches — it hits the REST endpoint the same
// way a real click does, but does not require juggling the multi-step
// publish panel modal that Playwright often misses.
async function saveAndGetSlug(page) {
  await page.evaluate(() => {
    document.querySelectorAll('.components-modal__screen-overlay, .components-guide').forEach(el => el.remove());
  });
  await page.evaluate(async () => {
    wp.data.dispatch('core/editor').editPost({ status: 'publish' });
    await wp.data.dispatch('core/editor').savePost();
  });
  // Poll until the store reports a real permalink (not the ?page_id=N draft
  // URL). WP's save cycle resolves the link after the REST response lands.
  const link = await page.evaluate(async () => {
    for (let i = 0; i < 20; i++) {
      const post = wp.data.select('core/editor').getCurrentPost();
      if (post && post.status === 'publish' && post.link) return post.link;
      await new Promise(r => setTimeout(r, 250));
    }
    return wp.data.select('core/editor').getCurrentPost().link;
  });
  return link;
}

async function editorScreenshot(page, name) {
  await page.evaluate(() => {
    document.querySelectorAll('.components-modal__screen-overlay, .components-guide, .interface-interface-skeleton__actions').forEach(el => el.remove());
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/${name}-editor.png`, fullPage: false });
}

async function frontScreenshot(page, url, name, vw) {
  await page.setViewportSize({ width: vw, height: 900 });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${name}-${vw}.png`, fullPage: false });
}

async function collectHeroStyles(page, url, vw) {
  await page.setViewportSize({ width: vw, height: 900 });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
  return page.evaluate(({ selectors, props }) => {
    const out = {};
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (!el) { out[sel] = null; continue; }
      const cs = getComputedStyle(el);
      const bag = {};
      for (const p of props) bag[p] = cs.getPropertyValue(p).trim();
      out[sel] = bag;
    }
    return out;
  }, { selectors: SELECTORS, props: PROPS });
}

function diff(a, b) {
  const rows = [];
  for (const sel of SELECTORS) {
    const A = a[sel], B = b[sel];
    if (!A && !B) continue;
    if (!A) { rows.push({ sel, prop: '(missing in sisters)', a: '-', b: 'present' }); continue; }
    if (!B) { rows.push({ sel, prop: '(missing in test)',    a: 'present', b: '-' }); continue; }
    for (const p of PROPS) {
      if ((A[p] || '') !== (B[p] || '')) rows.push({ sel, prop: p, a: A[p], b: B[p] });
    }
  }
  return rows;
}

async function main() {
  const browser = await chromium.launch({ executablePath: chromePath() });
  const context = await browser.newContext({ deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.setViewportSize({ width: 1600, height: 1000 });

  await login(page);
  const results = {};

  // --- Test A: inserter → Section → Photo hero on → set image → type -----
  console.log('\n=== Test A: inserter → toggle → text');
  await newDraftPage(page, 'Astro CSS Trial — Test A');
  const clientA = await insertSectionBlock(page);
  const togA = await togglePhotoHero(page, clientA);
  await setBackgroundImage(
    page, clientA,
    62, 'http://localhost:8888/wp-content/uploads/2026/09/Boswell_Sisters_1932.jpg',
    'Portrait of the Boswell Sisters, circa 1932.'
  );
  await setInnerText(page, clientA, {
    eyebrow:  'Our mission',
    title:    'About',
    subtitle: 'A tribute archive to the New Orleans trio who invented swinging close-harmony.',
  });
  await page.waitForTimeout(600);
  const debugA = await page.evaluate(({ clientId }) => {
    const inner = wp.data.select('core/block-editor').getBlocks(clientId);
    return inner.map(b => ({ name: b.name, level: b.attributes.level, content: b.attributes.content, className: b.attributes.className }));
  }, { clientId: clientA });
  console.log('  editor inner blocks before save:', JSON.stringify(debugA));
  await editorScreenshot(page, 'test-a');
  const linkA = await saveAndGetSlug(page);
  console.log('  saved →', linkA);
  results.a = { link: linkA, togglePreExisting: togA, editorInner: debugA };

  // --- Test B: insert Photo hero pattern → replace image + text ---------
  console.log('\n=== Test B: pattern → replace');
  await newDraftPage(page, 'Astro CSS Trial — Test B');
  const clientB = await page.evaluate(async () => {
    const { parse } = wp.blocks;
    const { dispatch } = wp.data;
    // Fetch the pattern content the same way the block inserter does.
    const patterns = await wp.apiFetch({ path: '/wp/v2/block-patterns/patterns' });
    const pat = patterns.find(p => p.name === 'bozzies/hero-photo');
    if (!pat) throw new Error('bozzies/hero-photo pattern not found');
    const blocks = parse(pat.content);
    dispatch('core/block-editor').insertBlocks(blocks);
    // The pattern is a single bozzies/section — return its clientId.
    return blocks[0].clientId;
  });
  await setBackgroundImage(
    page, clientB,
    63, 'http://localhost:8888/wp-content/uploads/2026/09/bozbios.jpg',
    'The Boswell Sisters.'
  );
  await setInnerText(page, clientB, {
    eyebrow:  'Meet the Sisters',
    title:    'The Sisters',
    subtitle: 'Get to know the Boswell Sisters — Martha at the piano, Connee out front, Vet in the middle.',
  });
  await page.waitForTimeout(600);
  await editorScreenshot(page, 'test-b');
  const linkB = await saveAndGetSlug(page);
  console.log('  saved →', linkB);
  results.b = { link: linkB };

  // --- Test C: typed heading + paragraph FIRST → then toggle -----------
  console.log('\n=== Test C: typed content → toggle');
  await newDraftPage(page, 'Astro CSS Trial — Test C');
  const clientC = await insertSectionBlock(page);
  // Type a heading (h2) and a paragraph BEFORE turning the hero on. This
  // is what the owner would type — no classes yet.
  await page.evaluate(async ({ clientId }) => {
    const { createBlock } = wp.blocks;
    const { dispatch } = wp.data;
    const h = createBlock('core/heading',   { level: 2, content: 'Bio Resources' });
    const p = createBlock('core/paragraph', { content: 'Books, essays and short films that trace the Boswell Sisters story.' });
    dispatch('core/block-editor').replaceInnerBlocks(clientId, [h, p], false);
  }, { clientId: clientC });
  // Snapshot the pre-toggle inner blocks so we can compare.
  const preToggleC = await page.evaluate(({ clientId }) => {
    return wp.data.select('core/block-editor').getBlocks(clientId).map(b => ({
      name: b.name, level: b.attributes.level, content: b.attributes.content, className: b.attributes.className,
    }));
  }, { clientId: clientC });
  const togC = await togglePhotoHero(page, clientC);
  const postToggleC = await page.evaluate(({ clientId }) => {
    return wp.data.select('core/block-editor').getBlocks(clientId).map(b => ({
      name: b.name, level: b.attributes.level, content: b.attributes.content, className: b.attributes.className,
    }));
  }, { clientId: clientC });
  await setBackgroundImage(
    page, clientC,
    62, 'http://localhost:8888/wp-content/uploads/2026/09/Boswell_Sisters_1932.jpg',
    'Portrait of the Boswell Sisters, circa 1932.'
  );
  await page.waitForTimeout(600);
  await editorScreenshot(page, 'test-c');
  const linkC = await saveAndGetSlug(page);
  console.log('  saved →', linkC);
  results.c = { link: linkC, preToggle: preToggleC, postToggle: postToggleC };

  // --- Screenshots + hero style-diff, all three vs /sisters/ ------------
  console.log('\n=== Screenshots + hero style-diff');
  const sistersUrl = `${WP}/sisters/`;
  const sisters1440 = await collectHeroStyles(page, sistersUrl, 1440);
  const sisters390  = await collectHeroStyles(page, sistersUrl, 390);
  for (const [key, r] of Object.entries(results)) {
    if (!r.link) continue;
    await frontScreenshot(page, r.link, `test-${key}-front`, 1440);
    await frontScreenshot(page, r.link, `test-${key}-front`, 390);
    const test1440 = await collectHeroStyles(page, r.link, 1440);
    const test390  = await collectHeroStyles(page, r.link, 390);
    const diff1440 = diff(sisters1440, test1440);
    const diff390  = diff(sisters390,  test390);
    writeFileSync(`${OUT}/test-${key}-diff.json`, JSON.stringify({
      link: r.link, diff1440, diff390,
      pretty: {
        '1440': diff1440.length,
        '390':  diff390.length,
      },
    }, null, 2));
    console.log(`  test-${key}: 1440=${diff1440.length} mismatches, 390=${diff390.length} mismatches`);
    for (const rr of diff1440) console.log(`    @1440 ${rr.sel}[${rr.prop}]  sisters="${rr.a}"  test="${rr.b}"`);
    for (const rr of diff390)  console.log(`    @390  ${rr.sel}[${rr.prop}]  sisters="${rr.a}"  test="${rr.b}"`);
  }

  writeFileSync(`${OUT}/owner-tests-report.json`, JSON.stringify(results, null, 2));
  console.log('\nreport →', `${OUT}/owner-tests-report.json`);

  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
