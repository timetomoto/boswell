#!/usr/bin/env node
// scripts/import/home-sample-section.mjs
//
// One-shot home-page patcher: replace the existing home-sample section
// (bozzies/section wrapping eyebrow + h2 + article-body paragraph + a
// core/buttons play-lesson-1 CTA) with a single bozzies/sample-section
// block. Uses the exact copy from Astro's CMS content — sampleEyebrow,
// sampleTitle, sampleBody, sampleCtaLabel in
// ~/boswell-poc/src/content/pages/home.md L20-24. The `href` uses the WP
// URL /media/lessons/lesson-1/ (matches existing lesson-cards + article-nav
// convention on this site; Astro uses /media/lessons/1/, no visible-text
// diff impact because text-diff compares body copy, not link hrefs).
//
// Home doesn't have a full import script yet; this only patches the
// sample section so the ported CSS goes live. Later, the Home page
// sections step will consolidate all home patchers into one home.mjs.

import { wp } from './lib.mjs';

// Gutenberg's client-side JSON serializer escapes only `--`, `<`, `>`, `&`
// (not `'`). Reused from scripts/import/group2.mjs.
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

// Values verbatim from ~/boswell-poc/src/content/pages/home.md L20-24.
const sampleAttrs = {
  anchor: 'home-sample',
  eyebrow: 'Sample the Sound',
  title: 'Cynthia Lucas explains what makes the Boswells tick',
  body: 'A five-part audio series narrated by one of the best-known Boswell historians. Start with Lesson 1 — The Blend.',
  href: '/media/lessons/lesson-1/',
  ctaLabel: 'Play Lesson 1 — The Blend',
};

const newSampleBlock = `<!-- wp:bozzies/sample-section ${gbJson(sampleAttrs)} /-->`;

function run() {
  const id = findHomeId();
  if (!id) throw new Error(`No page with slug "${HOME_SLUG}" found.`);
  console.log(`  home id=${id}`);

  const before = wp(['post', 'get', String(id), '--field=post_content']);
  console.log(`  before: ${before.length} bytes`);

  const re = /<!-- wp:bozzies\/section \{"anchor":"home-sample"[\s\S]*?<!-- \/wp:bozzies\/section -->/;
  if (!re.test(before)) {
    if (before.includes('wp:bozzies/sample-section')) {
      console.log('  already patched, no change');
      return;
    }
    throw new Error('home-sample section not found in home content; abort.');
  }
  const after = before.replace(re, newSampleBlock);
  console.log(`  after:  ${after.length} bytes`);

  const php = `wp_update_post(['ID'=>${id},'post_content'=>wp_slash(${phpStr(after)})]); echo 'OK';`;
  wp(['eval', php]);
  console.log('  updated ok');
}

function phpStr(s) {
  return `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

run();
