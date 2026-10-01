#!/usr/bin/env node
// scripts/import/prose-body-charts-reviews.mjs
//
// One-shot patcher: replace the prose body region on /media/charts/ and
// /media/reviews/ with a single bozzies/prose-body block wrapping the same
// inner blocks. On both pages the pre-rebuild wrapper is:
//
//   <!-- wp:bozzies/section {"backgroundStyle":"paper", …} -->
//   … inner blocks (paragraphs / headings / tables / groups) …
//   <!-- /wp:bozzies/section -->
//
// Astro's DOM on both pages (from charts.astro L21-25 and reviews.astro
// L21-25):
//   <section class="section ground-paper">
//     <div class="container-narrow prose {charts|reviews}-body">
//       <PageContent />
//     </div>
//   </section>
//
// Reviews' pre-rebuild inner shape wraps its h3+p pairs in a
// <wp:group.bozzies-reviews> and each body paragraph carries
// .bozzies-review-body. Astro's DOM has the h3+p pairs directly
// inside `.prose.reviews-body`, so we unwrap the group and strip
// the `bozzies-review-body` className during the patch.
//
// Charts' inner shape (paragraphs + headings + wp:table) needs no
// structural change — those blocks are already Astro-compatible.

import { wp } from './lib.mjs';

// Gutenberg's client-side JSON serializer escapes only `--`, `<`, `>`, `&`
// (not `'`). Reused across import scripts.
const gbJson = (obj) =>
  JSON.stringify(obj)
    .replace(/--/g, '\\u002d\\u002d')
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');

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

// Strip the review-specific wrappers from the reviews inner blocks:
//   - the outer <!-- wp:group {"className":"bozzies-reviews" …} --> group
//   - the {"className":"bozzies-review-body"} attr + `bozzies-review-body`
//     class on each body paragraph
function unwrapReviewsInner(inner) {
  // Drop the group opener (with any attributes) + its closing div.
  inner = inner.replace(/<!-- wp:group \{"className":"bozzies-reviews"[^}]*\}[^>]*-->\s*<div class="wp-block-group bozzies-reviews">/, '');
  inner = inner.replace(/<\/div>\s*<!-- \/wp:group -->/, '');
  // Rewrite each review-body paragraph. Emit a plain wp:paragraph with the
  // same text so the rendered <p> has no className and inherits the base
  // + reviews-body scoped rules.
  inner = inner.replace(
    /<!-- wp:paragraph \{"className":"bozzies-review-body"\} -->\s*<p class="bozzies-review-body">([\s\S]*?)<\/p>\s*<!-- \/wp:paragraph -->/g,
    (_m, body) => `<!-- wp:paragraph --><p>${body}</p><!-- /wp:paragraph -->`
  );
  return inner;
}

function patchPage(slug, variant) {
  const id = findPageId(slug);
  if (!id) {
    console.log(`  ${slug}: NOT FOUND`);
    return { patched: false };
  }
  const before = wp(['post', 'get', String(id), '--field=post_content']);

  // Match the whole bozzies/section {backgroundStyle:"paper"…} block and
  // its inner content up to the matching close tag.
  const re = /<!-- wp:bozzies\/section \{"backgroundStyle":"paper"[^}]*\} -->\s*([\s\S]*?)\s*<!-- \/wp:bozzies\/section -->/;
  const m = re.exec(before);
  if (!m) {
    if (before.includes('wp:bozzies/prose-body')) {
      console.log(`  ${slug} (id=${id}): already patched, no change`);
      return { patched: false, alreadyPatched: true };
    }
    console.log(`  ${slug} (id=${id}): paper section not matched; skipping`);
    return { patched: false };
  }
  let inner = m[1];
  if (variant === 'reviews') {
    inner = unwrapReviewsInner(inner);
  }
  const attrs = { align: 'full', variant };
  const replacement = `<!-- wp:bozzies/prose-body ${gbJson(attrs)} -->\n${inner}\n<!-- /wp:bozzies/prose-body -->`;
  const after = before.replace(re, replacement);

  const php = `wp_update_post(['ID'=>${id},'post_content'=>wp_slash(${phpStr(after)})]); echo 'OK';`;
  wp(['eval', php]);
  console.log(`  ${slug} (id=${id}): patched (before=${before.length} after=${after.length})`);
  return { patched: true };
}

const summary = { patched: 0, alreadyPatched: 0, notFound: 0 };
for (const [slug, variant] of [['charts', 'charts'], ['reviews', 'reviews']]) {
  const r = patchPage(slug, variant);
  if (r.patched) summary.patched++;
  else if (r.alreadyPatched) summary.alreadyPatched++;
  else summary.notFound++;
}
console.log(`\nDone: patched=${summary.patched} alreadyPatched=${summary.alreadyPatched} notFound=${summary.notFound}`);
