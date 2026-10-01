#!/usr/bin/env node
/*
 * Checks for the `page.html` default-template auto-emit change.
 *
 * Coverage:
 *   1. Structural DOM check on `/privacy-policy/` (the only current user of
 *      `page.html`). Verify `.page-hero.ground-purple` shell + `.page-hero__inner`
 *      + `h1.page-hero__title` bound to the post title.
 *   2. Absence-of-duplicate-title check: exactly ONE `<h1>` on the page (the
 *      hero's), inside `.page-hero`.
 *   3. Regression: pages using `page-landing` and `page-subpage` templates
 *      still render exactly ONE `<h1>` (the block-emitted hero's) and NO
 *      `.wp-block-post-title` (they never emit `core/post-title`).
 *
 * Reports counts only. Non-zero exit on any failure.
 */

import { chromium } from 'playwright-core';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
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

const LANDING_OR_SUBPAGE = [
  '/', // Home (landing)
  '/about/', // landing
  '/sisters/', // landing
  '/media/', // landing
  '/press/', // landing
  '/sisters/career-timeline/', // subpage
  '/media/discography/', // subpage
  '/media/reviews/', // subpage
  '/media/charts/', // subpage
  '/sisters/bio-resources/', // subpage
  '/sisters/connee/', // subpage
];

async function main() {
  const browser = await chromium.launch({ executablePath: chromePath(), headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();

  const report = {};

  // --- Privacy Policy structural check ------------------------------------
  await page.goto(`${WP}/privacy-policy/`, { waitUntil: 'domcontentloaded' });
  const priv = await page.evaluate(() => {
    const section = document.querySelector('section.page-hero.ground-purple');
    const inner   = document.querySelector('section.page-hero.ground-purple > div.container-narrow.page-hero__inner');
    const h1      = document.querySelector('section.page-hero.ground-purple h1.page-hero__title');
    const h1s     = document.querySelectorAll('main h1');
    const h1Text  = h1 ? h1.textContent.trim() : null;
    const noBack  = !document.querySelector('.page-hero .page-hero__back');
    const noEye   = !document.querySelector('.page-hero .page-hero__eyebrow');
    const noSub   = !document.querySelector('.page-hero .page-hero__subtitle');
    return {
      hasHeroSection: !!section,
      hasHeroInner:   !!inner,
      hasHeroTitle:   !!h1,
      h1TextIsTitle:  h1Text === 'Privacy Policy',
      h1CountInMain:  h1s.length,
      hasNoBackLink:  noBack,
      hasNoEyebrow:   noEye,
      hasNoSubtitle:  noSub,
    };
  });
  report.privacyPolicy = priv;

  // --- Regression: landing/subpage pages -----------------------------------
  const regressions = [];
  for (const path of LANDING_OR_SUBPAGE) {
    await page.goto(`${WP}${path}`, { waitUntil: 'domcontentloaded' });
    const info = await page.evaluate(() => {
      const h1s = document.querySelectorAll('main h1');
      const wpBlockPostTitle = document.querySelectorAll('main .wp-block-post-title');
      return {
        h1Count: h1s.length,
        wpBlockPostTitleCount: wpBlockPostTitle.length,
      };
    });
    regressions.push({ path, ...info });
  }
  report.landingSubpageRegressions = regressions;

  await browser.close();

  writeFileSync(`${OUT}/page-html-default-checks.json`, JSON.stringify(report, null, 2));

  const summary = {
    privacyPolicy_hasHeroSection: priv.hasHeroSection,
    privacyPolicy_hasHeroInner:   priv.hasHeroInner,
    privacyPolicy_hasHeroTitle:   priv.hasHeroTitle,
    privacyPolicy_h1TextMatches:  priv.h1TextIsTitle,
    privacyPolicy_singleH1:       priv.h1CountInMain === 1,
    privacyPolicy_noBackLink:     priv.hasNoBackLink,
    privacyPolicy_noEyebrow:      priv.hasNoEyebrow,
    privacyPolicy_noSubtitle:     priv.hasNoSubtitle,
    landingSubpageAllSingleH1:    regressions.every(r => r.h1Count === 1),
    landingSubpageNoPostTitle:    regressions.every(r => r.wpBlockPostTitleCount === 0),
  };

  console.log(JSON.stringify(summary, null, 2));
  if (!summary.landingSubpageAllSingleH1 || !summary.landingSubpageNoPostTitle) {
    console.error('\nDetails on failing landing/subpage regressions:');
    for (const r of regressions) {
      if (r.h1Count !== 1 || r.wpBlockPostTitleCount !== 0) {
        console.error(`  ${r.path}\th1=${r.h1Count}\twpBlockPostTitle=${r.wpBlockPostTitleCount}`);
      }
    }
  }
  const pass = Object.values(summary).every(v => v === true);
  process.exit(pass ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });
