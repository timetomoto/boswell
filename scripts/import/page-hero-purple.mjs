#!/usr/bin/env node
// scripts/import/page-hero-purple.mjs
//
// One-shot patcher: replace the pre-rebuild bozzies/section-based purple
// hero on /sisters/career-timeline/ and /media/discography/ with a single
// bozzies/page-hero block. Both Astro pages render a plain
// `<section class="page-hero ground-purple">` with NO music-backdrop
// (career-timeline.astro L14-21, discography.astro L25-33).
//
// Full page rewrites (career-timeline.mjs / discography.mjs) belong to
// later rebuild steps; this only patches the hero region so the ported
// page-hero CSS goes live via the block.
//
// Backdrop variants (staves/vinyl) and gold-ground variant are handled in
// separate follow-up commits (see rebuild queue).

import { wp } from './lib.mjs';

// Client-side JSON serializer matching Gutenberg's escapes for `--`, `<`,
// `>`, `&` (see scripts/import/group2.mjs gbJson notes).
const gbJson = (obj) =>
  JSON.stringify(obj)
    .replace(/--/g, '\\u002d\\u002d')
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');

// Astro copy — verbatim from ~/boswell-poc/src/pages/sisters/career-timeline.astro
// (title, subtitle from src/content/timelines/trio.md).
const CAREER_TIMELINE_ATTRS = {
  backHref: '/sisters/',
  backLabel: 'The Sisters',
  eyebrow: 'Career Timeline',
  title: 'Boswell Sisters — Career Timeline',
  // Uses en-dash + em-dash and curly right-single-quote — kept as Unicode
  // so the JSON in post_content matches Astro's output after Gutenberg
  // decodes it. render.php also html_entity_decode()s these attrs.
  subtitle: "From Martha's birth in 1905 through the trio's final broadcast in 1936 — and the family milestones that followed.",
};

// Astro copy — verbatim from ~/boswell-poc/src/pages/media/discography.astro L27-30.
// The old WP import used a different title ("Discography") + subtitle taken
// from an earlier draft; Astro's actual hero uses "Every session, every track"
// as the h1 and cites Paul Gaffey's archived source in the subtitle.
const DISCOGRAPHY_ATTRS = {
  backHref: '/media/',
  backLabel: 'Media',
  eyebrow: 'Discography',
  title: 'Every session, every track',
  subtitle: 'Compiled from the Boswell Sisters Discography maintained by Paul Gaffey (preserved via web.archive.org after his site was abandoned). 128 sessions, 500+ tracks.',
};

const PAGES = [
  { slug: 'career-timeline', attrs: CAREER_TIMELINE_ATTRS },
  { slug: 'discography',     attrs: DISCOGRAPHY_ATTRS },
];

function findPageId(slug) {
  const out = wp([
    'post', 'list', '--post_type=page', `--name=${slug}`,
    '--fields=ID', '--format=ids',
  ], { allowFail: true });
  if (!out) return null;
  const id = parseInt(out.split(/\s+/)[0], 10);
  return Number.isFinite(id) ? id : null;
}

function phpStr(s) {
  return `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

function run() {
  // Match the pre-rebuild hero: bozzies/section with backgroundStyle:purple
  // (career-timeline + discography both used backdrop:staves via heroPurple
  // in group2.mjs L130-139) followed by its opening + first four children +
  // closing tag. Anchored to the top of the post so it only ever matches
  // the hero at index 0.
  const heroRe    = /^<!-- wp:bozzies\/section \{"backgroundStyle":"purple"[\s\S]*?<!-- \/wp:bozzies\/section -->/;
  const patchedRe = /^<!-- wp:bozzies\/page-hero \{[^}]*\} \/-->/;

  for (const { slug, attrs } of PAGES) {
    const id = findPageId(slug);
    if (!id) throw new Error(`No page with slug "${slug}" found.`);
    console.log(`  ${slug} id=${id}`);

    const before = wp(['post', 'get', String(id), '--field=post_content']);
    console.log(`  before: ${before.length} bytes`);

    const newBlock = `<!-- wp:bozzies/page-hero ${gbJson(attrs)} /-->`;
    let after;
    if (heroRe.test(before)) {
      after = before.replace(heroRe, newBlock);
    } else if (patchedRe.test(before)) {
      after = before.replace(patchedRe, newBlock);
    } else {
      throw new Error(`no matching hero found at top of ${slug}; abort.`);
    }
    if (after === before) {
      console.log('  identical, no change');
      continue;
    }
    console.log(`  after:  ${after.length} bytes`);

    const php = `wp_update_post(['ID'=>${id},'post_content'=>wp_slash(${phpStr(after)})]); echo 'OK';`;
    wp(['eval', php]);
    console.log('  updated ok');
  }
}

run();
