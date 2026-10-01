#!/usr/bin/env node
// scripts/import/pull-quotes.mjs
//
// Sync the pull-quote block on /sisters/, /sisters/career-timeline/,
// /sisters/bio-resources/ with values verbatim from Astro's source:
//   /sisters/           trio.data.pullQuote / .pullQuoteAttribution
//                       (~/boswell-poc/src/content/timelines/trio.md L6-7)
//                       wrapped in <PullQuote attribution=...>{quote}</PullQuote>
//                       inside <section class="section ground-purple"> with a
//                       <MusicBackdrop variant="notes" opacity={0.10}
//                       color="var(--yellow-soft)" /> — sisters/index.astro L76-83.
//   /sisters/career-timeline/  same trio values, no backdrop — career-timeline.astro L23-30.
//   /sisters/bio-resources/    page.data.quote / .quoteAttribution
//                       (~/boswell-poc/src/content/pages/bio-resources.md L5-6)
//                       no backdrop — bio-resources.astro L21-28.
//
// Idempotent: matches the existing bozzies/pull-quote block (any attrs) and
// rewrites it with normalized attrs from Astro. Also matches the pre-rebuild
// bozzies/section wrapper if a page is not yet on the block.

import { wp } from './lib.mjs';

// Gutenberg's client-side JSON serializer:
//   - escapes `--`, `<`, `>`, `&`, `"` as `\uXXXX`
//   - does NOT escape apostrophe.
// The `\"` produced by JSON.stringify would get re-serialized to `"`
// on save, so we do it here up-front to keep byte-identical round-trips.
const gbJson = (obj) =>
  JSON.stringify(obj)
    .replace(/--/g, '\\u002d\\u002d')
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/(?<!\\)\\"/g, '\\u0022');

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

// Values verbatim from Astro source markdown.
// trio.md L6-7 (used by /sisters/ and /sisters/career-timeline/).
const TRIO_QUOTE = 'They (the Boswell Sisters) changed popular music from the 1930s forward.';
const TRIO_ATTR  = 'James Von Schilling';

// bio-resources.md L5-6 — straight ASCII quotes around Vet (Astro markdown is
// literal; no smart-quote conversion). Old WP content had curly “Vet” — this
// re-import normalizes back to ASCII to match Astro verbatim.
const BR_QUOTE = 'They were special. They were unique. And although they were born elsewhere, Martha, Connie, and Helvetia "Vet" Boswell were pure New Orleans.';
const BR_ATTR  = 'Steve Steinberg, Offbeat Magazine';

const PAGES = [
  { slug: 'sisters',         attrs: { quote: TRIO_QUOTE, attribution: TRIO_ATTR, backdrop: 'notes' } },
  { slug: 'career-timeline', attrs: { quote: TRIO_QUOTE, attribution: TRIO_ATTR } },
  { slug: 'bio-resources',   attrs: { quote: BR_QUOTE,   attribution: BR_ATTR   } },
];

function patchPage({ slug, attrs }) {
  const id = findPageId(slug);
  if (!id) throw new Error(`No page with slug "${slug}" found.`);
  const before = wp(['post', 'get', String(id), '--field=post_content']);
  const newBlock = `<!-- wp:bozzies/pull-quote ${gbJson(attrs)} /-->`;

  // Match any existing bozzies/pull-quote self-closing block.
  const reBlock = /<!-- wp:bozzies\/pull-quote [^>]*\/-->/;
  // Match the pre-rebuild bozzies/section wrapping a wp:pullquote — the
  // shape group1/group2 emit before this patcher runs.
  const reSection = /<!-- wp:bozzies\/section \{"backgroundStyle":"purple","backdrop":"notes"[^>]*?\} -->\s*<!-- wp:pullquote -->[\s\S]*?<!-- \/wp:pullquote -->\s*<!-- \/wp:bozzies\/section -->/;
  // Match a pre-rebuild bozzies/section without a notes backdrop wrapping a
  // wp:pullquote (career-timeline + bio-resources — no MusicBackdrop in Astro).
  const rePlainSection = /<!-- wp:bozzies\/section \{"backgroundStyle":"purple"[^>]*?\} -->\s*<!-- wp:pullquote -->[\s\S]*?<!-- \/wp:pullquote -->\s*<!-- \/wp:bozzies\/section -->/;
  let after;
  if (reBlock.test(before)) {
    after = before.replace(reBlock, newBlock);
  } else if (reSection.test(before)) {
    after = before.replace(reSection, newBlock);
  } else if (rePlainSection.test(before)) {
    after = before.replace(rePlainSection, newBlock);
  } else {
    console.log(`  ${slug}: no bozzies/pull-quote block found, aborting.`);
    return;
  }

  if (after === before) {
    console.log(`  ${slug} (id=${id}): unchanged (${before.length} bytes)`);
    return;
  }
  console.log(`  ${slug} (id=${id}): ${before.length} → ${after.length} bytes`);
  const php = `wp_update_post(['ID'=>${id},'post_content'=>wp_slash(${phpStr(after)})]); echo 'OK';`;
  wp(['eval', php]);
}

for (const p of PAGES) patchPage(p);
console.log('done.');
