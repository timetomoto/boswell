#!/usr/bin/env node
// scripts/import/page-hero-reviews.mjs
//
// One-shot patcher: replace the pre-rebuild bozzies/section-based purple hero
// on /media/reviews/ with a single bozzies/page-hero block that carries
// backdrop:"staves". Astro renders:
//   <section class="page-hero ground-purple">
//     <MusicBackdrop variant="staves" opacity={0.07} color="var(--yellow-soft)" />
//     ...
//   </section>
// (~/boswell-poc/src/pages/media/reviews.astro L11-19)
//
// The full reviews page (prose review rows) is out of scope for this step —
// only the hero region is patched.

import { wp } from './lib.mjs';

// Client-side JSON serializer matching Gutenberg's escapes.
const gbJson = (obj) =>
  JSON.stringify(obj)
    .replace(/--/g, '\\u002d\\u002d')
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');

// Astro copy — verbatim from ~/boswell-poc/src/content/pages/reviews.md
// frontmatter + reviews.astro L14 (back link).
const REVIEWS_ATTRS = {
  backHref: '/media/',
  backLabel: 'Media',
  eyebrow: 'Reviews',
  title: 'Reviews',
  subtitle: 'Album reviews from the experts.',
  backdrop: 'staves',
};

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
  // (reviews used backdrop:staves in the old import) OR the already-patched
  // page-hero block, both anchored to the top of the post.
  const heroRe    = /^<!-- wp:bozzies\/section \{"backgroundStyle":"purple"[\s\S]*?<!-- \/wp:bozzies\/section -->/;
  const patchedRe = /^<!-- wp:bozzies\/page-hero \{[^}]*\} \/-->/;

  const slug = 'reviews';
  const id = findPageId(slug);
  if (!id) throw new Error(`No page with slug "${slug}" found.`);
  console.log(`  ${slug} id=${id}`);

  const before = wp(['post', 'get', String(id), '--field=post_content']);
  console.log(`  before: ${before.length} bytes`);

  const newBlock = `<!-- wp:bozzies/page-hero ${gbJson(REVIEWS_ATTRS)} /-->`;
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
    return;
  }
  console.log(`  after:  ${after.length} bytes`);

  const php = `wp_update_post(['ID'=>${id},'post_content'=>wp_slash(${phpStr(after)})]); echo 'OK';`;
  wp(['eval', php]);
  console.log('  updated ok');
}

run();
