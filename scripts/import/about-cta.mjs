#!/usr/bin/env node
// scripts/import/about-cta.mjs
//
// One-shot /about/ patcher: replace the existing gold + notes-backdrop CTA
// section (bozzies/section wrapping eyebrow + h2 + paragraph + core/buttons
// with two buttons) with a single bozzies/about-cta block. Uses the exact
// copy from Astro's CMS content — the values on `ctaEyebrow`, `ctaTitle`,
// `ctaBody`, `ctaContactLabel`, `ctaDonateLabel` in
// ~/boswell-poc/src/content/pages/about.md.
//
// About doesn't have a full import script yet; this only patches the CTA
// section so the ported CSS goes live. The Home page sections step (or a
// future dedicated about.mjs) will build a full import alongside the
// intro/prose sections.

import { wp } from './lib.mjs';

// Gutenberg's client-side JSON serializer escapes only `--`, `<`, `>`, `&`
// (not `'` — matches wp_json_encode's default in modern WP). Reused from
// scripts/import/group2.mjs so post_content round-trips cleanly through
// the block editor.
const gbJson = (obj) =>
  JSON.stringify(obj)
    .replace(/--/g, '\\u002d\\u002d')
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');

const ABOUT_SLUG = 'about';

function findAboutId() {
  const out = wp([
    'post', 'list', '--post_type=page', `--name=${ABOUT_SLUG}`,
    '--fields=ID', '--format=ids',
  ], { allowFail: true });
  if (!out) return null;
  const id = parseInt(out.split(/\s+/)[0], 10);
  return Number.isFinite(id) ? id : null;
}

// Values verbatim from ~/boswell-poc/src/content/pages/about.md L7-11.
// contactHref and donateHref are empty because the live Astro site has
// no configured contactEmail (siteSettings.contactEmail unset) and no
// configured donate URL (donate/button.md `url: ""`).
const aboutCtaAttrs = {
  eyebrow: 'Get in touch',
  title: 'Have something to share, or want to help?',
  body: 'Reach out with material for the archive, corrections, or collaboration ideas — or make a donation to help keep the Boswells’ legacy alive.',
  contactHref: '',
  contactLabel: 'Contact us',
  donateHref: '',
  donateLabel: 'Donate',
};

const newAboutCtaBlock = `<!-- wp:bozzies/about-cta ${gbJson(aboutCtaAttrs)} /-->`;

function run() {
  const id = findAboutId();
  if (!id) throw new Error(`No page with slug "${ABOUT_SLUG}" found.`);
  console.log(`  about id=${id}`);

  const before = wp(['post', 'get', String(id), '--field=post_content']);
  console.log(`  before: ${before.length} bytes`);

  // Match the last bozzies/section on /about/ — the one with a
  // "notes" backdrop and the two-button row.
  const re = /<!-- wp:bozzies\/section \{"backgroundStyle":"gold","backdrop":"notes"[\s\S]*?<!-- \/wp:bozzies\/section -->/;
  if (!re.test(before)) {
    if (before.includes('wp:bozzies/about-cta')) {
      console.log('  already patched, no change');
      return;
    }
    throw new Error('about CTA section not found in about content; abort.');
  }
  const after = before.replace(re, newAboutCtaBlock);
  console.log(`  after:  ${after.length} bytes`);

  const php = `wp_update_post(['ID'=>${id},'post_content'=>wp_slash(${phpStr(after)})]); echo 'OK';`;
  wp(['eval', php]);
  console.log('  updated ok');
}

function phpStr(s) {
  return `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

run();
