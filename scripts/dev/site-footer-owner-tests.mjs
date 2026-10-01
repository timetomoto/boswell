/*
 * Owner tests for bozzies/site-footer (lives inside the footer template-part;
 * `inserter:false, multiple:false, reusable:false` so owners never insert
 * it into a page or delete it — it's the site's one and only footer block).
 *
 *   A. Default attrs — parts/footer.html holds a single self-closing
 *      `<!-- wp:bozzies/site-footer /-->` (no attrs), so the block renders
 *      with all defaults on every page. Confirm the served DOM shows
 *      Astro's exact site-footer structure with the default siteName,
 *      tagline, credits, © line, and 4 nav items pulled from the WP
 *      navigation menu (post 4).
 *
 *   B. Real sidebar TextControl mutation — open the footer template-part
 *      in the site editor, click into the "Site name" TextControl in the
 *      Inspector, type a value, save, then confirm the block attributes
 *      persist in the template-part post_content and the front DOM
 *      `.site-footer__wordmark` matches.
 *
 *   C. Pre-typed content — programmatically set all attrs on the block
 *      via `updateBlockAttributes`, save, then confirm every attribute
 *      round-trips into the served footer and the front DOM shape carries
 *      all fields in the correct positions.
 *
 * Runs against local wp-env as the throwaway `astroshot` administrator.
 * Restores the template-part to its default (`<!-- wp:bozzies/site-footer /-->`)
 * at the end so subsequent runs start from a known state.
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
const FOOTER_ID = 'bozzies//footer';

function chromePath() {
  for (const p of [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ]) if (existsSync(p)) return p;
  throw new Error('Chrome not found');
}

function readFooterPart() {
  return execSync(
    `npx wp-env run cli --env-cwd=/var/www/html wp post list --post_type=wp_template_part --name=footer --field=post_content 2>/dev/null`,
    { encoding: 'utf8' }
  ).trim();
}

function restoreFooterDefault() {
  try {
    execSync(`npx wp-env run cli --env-cwd=/var/www/html wp post list --post_type=wp_template_part --name=footer --field=ID 2>/dev/null`, { encoding: 'utf8' })
      .trim().split(/\s+/).filter(Boolean).forEach(id => {
        execSync(`npx wp-env run cli --env-cwd=/var/www/html wp post delete ${id} --force 2>/dev/null`);
      });
  } catch (e) {}
}

async function login(page) {
  await page.goto(`${WP}/wp-login.php`, { waitUntil: 'domcontentloaded' });
  await page.fill('#user_login', 'astroshot');
  await page.fill('#user_pass', 'trialpass123');
  await page.click('#wp-submit');
  await page.waitForURL(/wp-admin/, { timeout: 15000 });
}

async function openFooterInSiteEditor(page) {
  await page.goto(`${WP}/wp-admin/site-editor.php?postType=wp_template_part&postId=${FOOTER_ID}&canvas=edit`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(6000);
  await page.evaluate(() => {
    document.querySelectorAll('.components-modal__screen-overlay, .components-guide').forEach(el => el.remove());
  });
}

async function findSiteFooterBlockClientId(page) {
  return page.evaluate(() => {
    const blocks = wp.data.select('core/block-editor').getBlocks();
    function find(bs) {
      for (const b of bs) {
        if (b.name === 'bozzies/site-footer') return b.clientId;
        if (b.innerBlocks && b.innerBlocks.length) {
          const c = find(b.innerBlocks);
          if (c) return c;
        }
      }
      return null;
    }
    return find(blocks);
  });
}

async function main() {
  restoreFooterDefault();
  const results = { A: {}, B: {}, C: {}, cleanup: [] };
  const browser = await chromium.launch({ executablePath: chromePath() });
  const context = await browser.newContext({ deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.setViewportSize({ width: 1600, height: 1000 });

  try {
    await login(page);

    // --- Test A: default attrs served from parts/footer.html --------------
    console.log('\n=== Test A: default attrs served from parts/footer.html');
    await page.goto(`${WP}/`, { waitUntil: 'networkidle' });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(200);
    const domA = await page.evaluate(() => {
      const foot = document.querySelector('footer.site-footer');
      if (!foot) return { present: false };
      const inner = foot.querySelector('.site-footer__inner');
      const mark = foot.querySelector('.site-footer__wordmark');
      const tag = foot.querySelector('.site-footer__tagline');
      const links = Array.from(foot.querySelectorAll('.site-footer__nav a')).map(a => ({ text: a.textContent.trim(), href: a.getAttribute('href') }));
      const meta = foot.querySelector('.site-footer__meta');
      const metaPs = meta ? Array.from(meta.querySelectorAll('p')).map(p => p.textContent.trim()) : [];
      const cookieBtn = foot.querySelector('.bozzies-cookie-settings');
      return {
        present: true,
        classHasSiteFooter: foot.classList.contains('site-footer'),
        classHasGroundPurple: foot.classList.contains('ground-purple'),
        hasInner: !!inner,
        hasContainer: inner && inner.classList.contains('container'),
        wordmark: mark && mark.textContent.trim(),
        tagline: tag && tag.textContent.trim(),
        linkCount: links.length,
        links,
        metaParagraphs: metaPs,
        cookieBtnPresent: !!cookieBtn,
        cookieBtnHidden: cookieBtn && cookieBtn.hasAttribute('hidden'),
      };
    });
    results.A = domA;
    console.log(JSON.stringify(domA, null, 2));

    // --- Test B: real sidebar TextControl mutation ------------------------
    console.log('\n=== Test B: real sidebar TextControl mutation (Site name)');
    await openFooterInSiteEditor(page);
    const clientIdB = await findSiteFooterBlockClientId(page);
    console.log('  site-footer clientId:', clientIdB);
    await page.evaluate((cid) => wp.data.dispatch('core/block-editor').selectBlock(cid), clientIdB);
    await page.waitForTimeout(700);
    const siteNameValue = 'B-site-name test';
    const sidebarMutated = await page.evaluate(async (val) => {
      // Wordmark panel is initialOpen:true, so "Site name" TextControl
      // should already be visible. Locate by label text.
      const labels = Array.from(document.querySelectorAll('.editor-block-inspector .components-base-control__label, .interface-complementary-area .components-base-control__label'));
      const nameLabel = labels.find(l => (l.textContent || '').trim() === 'Site name');
      const controlWrap = nameLabel && nameLabel.closest('.components-base-control');
      const input = controlWrap && controlWrap.querySelector('input');
      if (!input) return { ok: false, reason: 'no input' };
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeSetter.call(input, val);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise(r => setTimeout(r, 500));
      return { ok: true };
    }, siteNameValue);
    results.B.sidebarInteraction = sidebarMutated;
    console.log('  sidebar interaction:', JSON.stringify(sidebarMutated));
    const attrsAfter = await page.evaluate((cid) => wp.data.select('core/block-editor').getBlock(cid).attributes, clientIdB);
    results.B.attrsAfter = attrsAfter;
    console.log('  attrs after sidebar edit siteName:', attrsAfter && attrsAfter.siteName);
    await page.evaluate(async () => {
      const store = wp.data.dispatch('core/editor');
      if (store && store.savePost) await store.savePost();
    });
    await page.waitForTimeout(2500);
    const tpAfterB = readFooterPart();
    results.B.templatePartContainsSiteName = tpAfterB.includes(siteNameValue);
    console.log('  template-part contains new site name:', results.B.templatePartContainsSiteName);
    await page.goto(`${WP}/`, { waitUntil: 'networkidle' });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(200);
    results.B.frontWordmark = await page.evaluate(() => {
      const p = document.querySelector('.site-footer__wordmark');
      return p && p.textContent.trim();
    });
    console.log('  front .site-footer__wordmark:', results.B.frontWordmark);
    results.B.mutationLandedOnFront = results.B.frontWordmark === siteNameValue;

    // --- Test C: pre-typed content ---------------------------------------
    console.log('\n=== Test C: pre-typed content — updateBlockAttributes all fields');
    await openFooterInSiteEditor(page);
    const clientIdC = await findSiteFooterBlockClientId(page);
    const preTyped = {
      siteName:         'C-Site-Name',
      tagline:          'C-tagline text.',
      footerCredits:    'C-credits paragraph, non-profit purpose.',
      showCookieButton: false,
      navRef:           4,
    };
    await page.evaluate(({ cid, a }) => {
      wp.data.dispatch('core/block-editor').updateBlockAttributes(cid, a);
    }, { cid: clientIdC, a: preTyped });
    await page.waitForTimeout(500);
    await page.evaluate(async () => {
      const store = wp.data.dispatch('core/editor');
      if (store && store.savePost) await store.savePost();
    });
    await page.waitForTimeout(2500);
    const tpAfterC = readFooterPart();
    results.C.templatePartSiteName  = tpAfterC.includes('"siteName":"C-Site-Name"');
    results.C.templatePartTagline   = tpAfterC.includes('"tagline":"C-tagline text."');
    results.C.templatePartCredits   = tpAfterC.includes('"footerCredits":"C-credits paragraph, non-profit purpose."');
    results.C.templatePartCookieOff = tpAfterC.includes('"showCookieButton":false');
    console.log(`  template-part siteName:       ${results.C.templatePartSiteName}`);
    console.log(`  template-part tagline:        ${results.C.templatePartTagline}`);
    console.log(`  template-part credits:        ${results.C.templatePartCredits}`);
    console.log(`  template-part cookie=false:   ${results.C.templatePartCookieOff}`);
    await page.goto(`${WP}/`, { waitUntil: 'networkidle' });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(200);
    const domC = await page.evaluate(() => {
      const foot = document.querySelector('footer.site-footer');
      if (!foot) return { present: false };
      const mark = foot.querySelector('.site-footer__wordmark');
      const tag = foot.querySelector('.site-footer__tagline');
      const meta = foot.querySelector('.site-footer__meta');
      const metaPs = meta ? Array.from(meta.querySelectorAll('p')).map(p => p.textContent.trim()) : [];
      const cookieBtn = foot.querySelector('.bozzies-cookie-settings');
      return {
        wordmark: mark && mark.textContent.trim(),
        tagline: tag && tag.textContent.trim(),
        metaFirst: metaPs[0],
        metaSecond: metaPs[1],
        cookieBtnPresent: !!cookieBtn,
      };
    });
    results.C.frontDom = domC;
    console.log('  front DOM:', JSON.stringify(domC));
    results.C.outerShape = await page.evaluate(() => !!document.querySelector(
      'footer.site-footer.ground-purple > div.container.site-footer__inner > div.site-footer__mark > p.site-footer__wordmark + p.site-footer__tagline'
    ));
    console.log('  outer DOM shape:', results.C.outerShape);
  } finally {
    restoreFooterDefault();
    results.cleanup.push('restored parts/footer.html defaults');
    await browser.close();
  }

  writeFileSync(`${OUT}/site-footer-owner-tests.json`, JSON.stringify(results, null, 2));
  console.log('\n=== Summary');
  const summary = {
    A_present:                results.A.present === true,
    A_class_site_footer:      results.A.classHasSiteFooter === true,
    A_class_ground_purple:    results.A.classHasGroundPurple === true,
    A_has_inner_container:    results.A.hasInner && results.A.hasContainer,
    A_default_wordmark:       results.A.wordmark === 'The Boswell Sisters',
    A_default_tagline_start:  (results.A.tagline || '').startsWith('A tribute archive'),
    A_link_count_4:           results.A.linkCount === 4,
    A_meta_has_two_paras:     (results.A.metaParagraphs || []).length >= 2,
    A_meta_has_copyright:     (results.A.metaParagraphs || []).some(p => /©\s*\d{4}/.test(p)),
    A_cookie_btn_hidden:      results.A.cookieBtnPresent === true && results.A.cookieBtnHidden === true,
    B_sidebar_interaction:    results.B.sidebarInteraction?.ok === true,
    B_attr_mutated:           results.B.attrsAfter?.siteName === 'B-site-name test',
    B_persisted:              results.B.templatePartContainsSiteName === true,
    B_front:                  results.B.mutationLandedOnFront === true,
    C_sitename_persist:       results.C.templatePartSiteName,
    C_tagline_persist:        results.C.templatePartTagline,
    C_credits_persist:        results.C.templatePartCredits,
    C_cookie_off_persist:     results.C.templatePartCookieOff,
    C_front_wordmark:         results.C.frontDom?.wordmark === 'C-Site-Name',
    C_front_tagline:          results.C.frontDom?.tagline === 'C-tagline text.',
    C_front_credits:          results.C.frontDom?.metaFirst === 'C-credits paragraph, non-profit purpose.',
    C_front_cookie_absent:    results.C.frontDom?.cookieBtnPresent === false,
    C_outer_shape:            results.C.outerShape,
    cleanup:                  results.cleanup,
  };
  console.log(JSON.stringify(summary, null, 2));
  const passes = Object.entries(summary).filter(([k]) => k !== 'cleanup').every(([, v]) => v === true);
  process.exit(passes ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });
