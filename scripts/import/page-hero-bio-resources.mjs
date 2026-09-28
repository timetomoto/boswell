#!/usr/bin/env node
// scripts/import/page-hero-bio-resources.mjs
//
// One-shot patcher: replace the pre-rebuild bozzies/section-based gold hero
// on /sisters/bio-resources/ with a single bozzies/page-hero block that
// carries ground:"gold". Astro renders:
//   <section class="page-hero ground-gold">
//     <div class="container-narrow page-hero__inner">
//       <a href="/sisters/" class="page-hero__back">← The Sisters</a>
//       <span class="eyebrow eyebrow--purple">A Family Affair</span>
//       <h1 class="page-hero__title">Boz Biography</h1>
//       <p class="page-hero__subtitle">The definitive family biography…</p>
//     </div>
//   </section>
// (~/boswell-poc/src/pages/sisters/bio-resources.astro L12-19)
//
// The pull-quote section, prose section, and "Get the Book" section below the
// hero are out of scope for this step — only the hero region is patched.

import { wp } from './lib.mjs';

// Client-side JSON serializer matching Gutenberg's escapes.
const gbJson = (obj) =>
  JSON.stringify(obj)
    .replace(/--/g, '\\u002d\\u002d')
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');

// Astro copy — verbatim from ~/boswell-poc/src/content/pages/bio-resources.md
// frontmatter + bio-resources.astro L14 (back link).
const BIO_RESOURCES_ATTRS = {
  backHref: '/sisters/',
  backLabel: 'The Sisters',
  eyebrow: 'A Family Affair',
  title: 'Boz Biography',
  subtitle: 'The definitive family biography of the Boswell Sisters.',
  ground: 'gold',
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
  // Match either the pre-rebuild hero (bozzies/section with backgroundStyle:gold
  // — bio-resources previously used width:narrow + spacious spacing) or an
  // already-patched page-hero block, both anchored to the top of the post.
  const heroRe    = /^<!-- wp:bozzies\/section \{"backgroundStyle":"gold"[\s\S]*?<!-- \/wp:bozzies\/section -->/;
  const patchedRe = /^<!-- wp:bozzies\/page-hero \{[^}]*\} \/-->/;

  const slug = 'bio-resources';
  const id = findPageId(slug);
  if (!id) throw new Error(`No page with slug "${slug}" found.`);
  console.log(`  ${slug} id=${id}`);

  const before = wp(['post', 'get', String(id), '--field=post_content']);
  console.log(`  before: ${before.length} bytes`);

  const newBlock = `<!-- wp:bozzies/page-hero ${gbJson(BIO_RESOURCES_ATTRS)} /-->`;
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
