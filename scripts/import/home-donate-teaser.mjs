#!/usr/bin/env node
// scripts/import/home-donate-teaser.mjs
//
// One-shot home-page updater: replace the existing home-donate section
// (bozzies/section wrapping eyebrow + h2 + paragraph + core/buttons with a
// large donate button) with a single bozzies/donate-teaser block. Uses the
// exact copy from Astro's CMS content — the values on `donateEyebrow`,
// `donateTitle`, `donateBody` in ~/boswell-poc/src/content/pages/home.md and
// the anchor id + click URL from ~/boswell-poc/src/pages/index.astro L107.
//
// Home doesn't have a full import script yet; this only patches the donate
// section so the ported CSS goes live. Later, the Home page sections step
// will build a full home.mjs alongside the other sections.

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

const HOME_SLUG = 'home';

function findHomeId() {
  const out = wp([
    'post', 'list', '--post_type=page', `--name=${HOME_SLUG}`,
    '--fields=ID', '--format=ids',
  ], { allowFail: true });
  if (!out) return null;
  const id = parseInt(out.split(/\s+/)[0], 10);
  return Number.isFinite(id) ? id : null;
}

// Values verbatim from ~/boswell-poc/src/content/pages/home.md L25-28
// and ~/boswell-poc/src/content/donate/button.md L2-3.
const donateAttrs = {
  anchor: 'home-donate',
  eyebrow: 'Support the Work',
  title: "Help keep the Boswells' legacy alive.",
  body: "Bozzies.org is dedicated to preserving the Boswell Sisters' recordings, research, and public memory. Every contribution keeps us Bozzing.",
  href: '',
  ctaLabel: 'Donate',
};

const newDonateBlock = `<!-- wp:bozzies/donate-teaser ${gbJson(donateAttrs)} /-->`;

function run() {
  const id = findHomeId();
  if (!id) throw new Error(`No page with slug "${HOME_SLUG}" found.`);
  console.log(`  home id=${id}`);

  // Fetch current content.
  const before = wp(['post', 'get', String(id), '--field=post_content']);
  console.log(`  before: ${before.length} bytes`);

  // Match the entire home-donate bozzies/section block, from the opening
  // <!-- wp:bozzies/section {"anchor":"home-donate"…} --> comment through
  // the matching <!-- /wp:bozzies/section -->. Non-greedy across newlines.
  const re = /<!-- wp:bozzies\/section \{"anchor":"home-donate"[\s\S]*?<!-- \/wp:bozzies\/section -->/;
  if (!re.test(before)) {
    // Idempotent — already patched.
    if (before.includes('wp:bozzies/donate-teaser')) {
      console.log('  already patched, no change');
      return;
    }
    throw new Error('home-donate section not found in home content; abort.');
  }
  const after = before.replace(re, newDonateBlock);
  console.log(`  after:  ${after.length} bytes`);

  // Write back via wp_update_post so wp_slash is applied on post_content
  // and Gutenberg comment delimiters survive.
  const php = `wp_update_post(['ID'=>${id},'post_content'=>wp_slash(${phpStr(after)})]); echo 'OK';`;
  wp(['eval', php]);
  console.log('  updated ok');
}

function phpStr(s) {
  return `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

run();
