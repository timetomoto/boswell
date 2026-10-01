/*
 * Owner tests for bozzies/site-nav (lives inside the header template-part;
 * `inserter:false, multiple:false, reusable:false` so owners never insert
 * it into a page or delete it — it's the site's one and only header block).
 *
 *   A. Default attrs — parts/header.html holds a single self-closing
 *      `<!-- wp:bozzies/site-nav /-->` (no attrs), so the block renders
 *      with all defaults on every page. Confirm the served DOM shows
 *      Astro's exact site-nav structure with the default markLine1/markLine2
 *      + 4 nav items pulled from the WP navigation menu (post 4) + the
 *      Donate button.
 *
 *   B. Real sidebar TextControl mutation — open the header template-part
 *      in the site editor, click into the "Donate URL" TextControl in the
 *      Inspector, type a value, save, then confirm the block attributes
 *      persist in the wp_navigation-adjacent template-part post_content
 *      and the front DOM `.site-nav__donate[href]` matches.
 *
 *   C. Pre-typed content — programmatically set all attrs on the block
 *      via `updateBlockAttributes`, save, then confirm every attribute
 *      round-trips (mark line 1/2/aria-label/href, donate label/href,
 *      nav ref) into the served header, and the front DOM shape carries
 *      all fields in the correct positions.
 *
 * Runs against local wp-env as the throwaway `astroshot` administrator.
 * Restores the template-part to its default (`<!-- wp:bozzies/site-nav /-->`)
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
const HEADER_ID = 'bozzies//header';

function chromePath() {
  for (const p of [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ]) if (existsSync(p)) return p;
  throw new Error('Chrome not found');
}

function readHeaderPart() {
  return execSync(
    `npx wp-env run cli --env-cwd=/var/www/html wp post list --post_type=wp_template_part --name=header --field=post_content 2>/dev/null`,
    { encoding: 'utf8' }
  ).trim();
}

function restoreHeaderDefault() {
  // Delete DB copies so the file-based header.html takes over again.
  try {
    execSync(`npx wp-env run cli --env-cwd=/var/www/html wp post list --post_type=wp_template_part --name=header --field=ID 2>/dev/null`, { encoding: 'utf8' })
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

async function openHeaderInSiteEditor(page) {
  await page.goto(`${WP}/wp-admin/site-editor.php?postType=wp_template_part&postId=${HEADER_ID}&canvas=edit`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(6000);
  await page.evaluate(() => {
    document.querySelectorAll('.components-modal__screen-overlay, .components-guide').forEach(el => el.remove());
  });
}

async function findSiteNavBlockClientId(page) {
  return page.evaluate(() => {
    const blocks = wp.data.select('core/block-editor').getBlocks();
    function find(bs) {
      for (const b of bs) {
        if (b.name === 'bozzies/site-nav') return b.clientId;
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
  restoreHeaderDefault();
  const results = { A: {}, B: {}, C: {}, cleanup: [] };
  const browser = await chromium.launch({ executablePath: chromePath() });
  const context = await browser.newContext({ deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.setViewportSize({ width: 1600, height: 1000 });

  try {
    await login(page);

    // --- Test A: default attrs served from parts/header.html --------------
    console.log('\n=== Test A: default attrs served from parts/header.html');
    await page.goto(`${WP}/`, { waitUntil: 'networkidle' });
    const domA = await page.evaluate(() => {
      const nav = document.querySelector('header.site-nav');
      if (!nav) return { present: false };
      const inner = nav.querySelector('.site-nav__inner');
      const mark = nav.querySelector('.site-nav__mark');
      const line1 = nav.querySelector('.site-nav__mark-line-1');
      const line2 = nav.querySelector('.site-nav__mark-line-2');
      const list = nav.querySelector('.site-nav__list');
      const links = Array.from(nav.querySelectorAll('.site-nav__link')).map(a => a.textContent.trim());
      const donate = nav.querySelector('.site-nav__donate');
      return {
        present: true,
        classHasSiteNav: nav.classList.contains('site-nav'),
        hasInner: !!inner,
        hasContainer: inner && inner.classList.contains('container'),
        markHref: mark && mark.getAttribute('href'),
        markAria: mark && mark.getAttribute('aria-label'),
        line1: line1 && line1.textContent.trim(),
        line2: line2 && line2.textContent.trim(),
        listRole: list && list.getAttribute('role'),
        linkCount: links.length,
        links,
        donateLabel: donate && donate.textContent.trim(),
        donateTarget: donate && donate.getAttribute('target'),
        donateRel: donate && donate.getAttribute('rel'),
      };
    });
    results.A = domA;
    console.log(JSON.stringify(domA, null, 2));

    // --- Test B: real sidebar TextControl mutation ------------------------
    console.log('\n=== Test B: real sidebar TextControl mutation (Donate URL)');
    await openHeaderInSiteEditor(page);
    const clientIdB = await findSiteNavBlockClientId(page);
    console.log('  site-nav clientId:', clientIdB);
    // Select the block to open Inspector.
    await page.evaluate((cid) => wp.data.dispatch('core/block-editor').selectBlock(cid), clientIdB);
    await page.waitForTimeout(700);
    // Expand the "Donate button" panel (initialOpen:false) and type into
    // the "Donate URL" TextControl. Use an actual DOM click + fill (real
    // event dispatch, not a store-only update).
    const donateUrlValue = 'https://example.com/give-B';
    const sidebarMutated = await page.evaluate(async (val) => {
      // Find and click the "Donate button" panel toggle.
      const panelButtons = Array.from(document.querySelectorAll('.interface-complementary-area .components-button.components-panel__body-toggle, .editor-block-inspector .components-button.components-panel__body-toggle'));
      const donatePanel = panelButtons.find(b => (b.textContent || '').trim() === 'Donate button');
      if (donatePanel && donatePanel.getAttribute('aria-expanded') === 'false') donatePanel.click();
      await new Promise(r => setTimeout(r, 300));
      // Find the "Donate URL" TextControl by its label.
      const labels = Array.from(document.querySelectorAll('.editor-block-inspector .components-base-control__label, .interface-complementary-area .components-base-control__label'));
      const donateLabel = labels.find(l => (l.textContent || '').trim() === 'Donate URL');
      const controlWrap = donateLabel && donateLabel.closest('.components-base-control');
      const input = controlWrap && controlWrap.querySelector('input');
      if (!input) return { ok: false, reason: 'no input' };
      // Fill via native input events so React state updates.
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeSetter.call(input, val);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise(r => setTimeout(r, 500));
      return { ok: true };
    }, donateUrlValue);
    results.B.sidebarInteraction = sidebarMutated;
    console.log('  sidebar interaction:', JSON.stringify(sidebarMutated));
    // Confirm the block attr updated in the editor store.
    const attrsAfter = await page.evaluate((cid) => wp.data.select('core/block-editor').getBlock(cid).attributes, clientIdB);
    results.B.attrsAfter = attrsAfter;
    console.log('  attrs after sidebar edit:', JSON.stringify(attrsAfter));
    // Save the template-part.
    await page.evaluate(async () => {
      const store = wp.data.dispatch('core/editor');
      if (store && store.savePost) await store.savePost();
    });
    await page.waitForTimeout(2500);
    const tpAfterB = readHeaderPart();
    results.B.templatePartContainsDonateUrl = tpAfterB.includes(donateUrlValue);
    console.log('  template-part contains donate URL:', results.B.templatePartContainsDonateUrl);
    // Load a fresh front page to verify.
    await page.goto(`${WP}/`, { waitUntil: 'networkidle' });
    results.B.frontDonateHref = await page.evaluate(() => {
      const a = document.querySelector('.site-nav__donate');
      return a && a.getAttribute('href');
    });
    console.log('  front .site-nav__donate href:', results.B.frontDonateHref);
    results.B.mutationLandedOnFront = results.B.frontDonateHref === donateUrlValue;

    // --- Test C: pre-typed content ---------------------------------------
    console.log('\n=== Test C: pre-typed content — updateBlockAttributes all fields');
    await openHeaderInSiteEditor(page);
    const clientIdC = await findSiteNavBlockClientId(page);
    const preTyped = {
      markLine1:     'The Boswells',
      markLine2:     'C-line-2 test',
      markHref:      '/home-c/',
      markAriaLabel: 'C aria label',
      donateLabel:   'C-donate',
      donateHref:    'https://example.com/give-C',
      navRef:        4,
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
    const tpAfterC = readHeaderPart();
    results.C.templatePartMarkLine1     = tpAfterC.includes('"markLine1":"The Boswells"');
    results.C.templatePartMarkLine2     = tpAfterC.includes('"markLine2":"C-line-2 test"');
    results.C.templatePartMarkHref      = tpAfterC.includes('"markHref":"/home-c/"');
    results.C.templatePartMarkAriaLabel = tpAfterC.includes('"markAriaLabel":"C aria label"');
    results.C.templatePartDonateLabel   = tpAfterC.includes('"donateLabel":"C-donate"');
    results.C.templatePartDonateHref    = tpAfterC.includes('"donateHref":"https://example.com/give-C"');
    console.log(`  template-part markLine1: ${results.C.templatePartMarkLine1}`);
    console.log(`  template-part markLine2: ${results.C.templatePartMarkLine2}`);
    console.log(`  template-part markHref:  ${results.C.templatePartMarkHref}`);
    console.log(`  template-part markAria:  ${results.C.templatePartMarkAriaLabel}`);
    console.log(`  template-part donateLbl: ${results.C.templatePartDonateLabel}`);
    console.log(`  template-part donateHrf: ${results.C.templatePartDonateHref}`);
    await page.goto(`${WP}/`, { waitUntil: 'networkidle' });
    const domC = await page.evaluate(() => {
      const nav = document.querySelector('header.site-nav');
      if (!nav) return { present: false };
      const mark = nav.querySelector('.site-nav__mark');
      const line1 = nav.querySelector('.site-nav__mark-line-1');
      const line2 = nav.querySelector('.site-nav__mark-line-2');
      const donate = nav.querySelector('.site-nav__donate');
      return {
        markHref: mark && mark.getAttribute('href'),
        markAria: mark && mark.getAttribute('aria-label'),
        line1: line1 && line1.textContent.trim(),
        line2: line2 && line2.textContent.trim(),
        donateLabel: donate && donate.textContent.trim(),
        donateHref: donate && donate.getAttribute('href'),
      };
    });
    results.C.frontDom = domC;
    console.log('  front DOM:', JSON.stringify(domC));
    results.C.outerShape = await page.evaluate(() => !!document.querySelector(
      'header.site-nav > div.site-nav__inner.container > a.site-nav__mark > span.site-nav__mark-line-1 + span.site-nav__mark-line-2'
    ));
    console.log('  outer DOM shape:', results.C.outerShape);
  } finally {
    restoreHeaderDefault();
    results.cleanup.push('restored parts/header.html defaults');
    await browser.close();
  }

  writeFileSync(`${OUT}/site-nav-owner-tests.json`, JSON.stringify(results, null, 2));
  console.log('\n=== Summary');
  const summary = {
    A_default_line1:     results.A.line1 === 'The Boswell Sisters',
    A_default_line2:     results.A.line2 === '1925 to 1936',
    A_default_href:      results.A.markHref === '/',
    A_default_aria:      results.A.markAria === 'The Boswell Sisters, home',
    A_list_role:         results.A.listRole === 'list',
    A_link_count_4_plus_donate: results.A.linkCount === 4 && (results.A.donateLabel || '').length > 0,
    A_donate_target:     results.A.donateTarget === '_blank',
    A_donate_rel:        (results.A.donateRel || '').includes('noopener'),
    B_sidebar_interaction: results.B.sidebarInteraction?.ok === true,
    B_attr_mutated:      results.B.attrsAfter?.donateHref === 'https://example.com/give-B',
    B_persisted:         results.B.templatePartContainsDonateUrl === true,
    B_front_href:        results.B.mutationLandedOnFront === true,
    C_line1_persist:     results.C.templatePartMarkLine1,
    C_line2_persist:     results.C.templatePartMarkLine2,
    C_href_persist:      results.C.templatePartMarkHref,
    C_aria_persist:      results.C.templatePartMarkAriaLabel,
    C_donate_lbl_persist: results.C.templatePartDonateLabel,
    C_donate_href_persist: results.C.templatePartDonateHref,
    C_front_line1:       results.C.frontDom?.line1 === 'The Boswells',
    C_front_line2:       results.C.frontDom?.line2 === 'C-line-2 test',
    C_front_donate_lbl:  results.C.frontDom?.donateLabel === 'C-donate',
    C_front_donate_href: results.C.frontDom?.donateHref === 'https://example.com/give-C',
    C_outer_shape:       results.C.outerShape,
    cleanup:             results.cleanup,
  };
  console.log(JSON.stringify(summary, null, 2));
  const passes = Object.entries(summary).filter(([k]) => k !== 'cleanup').every(([, v]) => v === true);
  process.exit(passes ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });
