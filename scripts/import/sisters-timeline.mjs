#!/usr/bin/env node
// scripts/import/sisters-timeline.mjs
//
// One-shot patcher for the two pages that use Astro's <Timeline /> component:
//
//   1. /sisters/career-timeline/  → full trio timeline (81 entries in
//      ~/boswell-poc/src/content/timelines/trio.md).
//      Astro emits <section class="section ground-paper timeline-section">
//          <div class="container"><Timeline entries color="purple" /></div>
//        </section>
//
//   2. /sisters/connee/  → the solo career timeline inside the bio
//      (18 entries in ~/boswell-poc/src/content/timelines/connee.md).
//      Astro emits <section class="section ground-paper bio-timeline">
//          <div class="container">
//            <header class="bio-timeline__head">…</header>
//            <Timeline entries color="purple" />
//          </div>
//        </section>
//
// Both pages currently carry a placeholder inside a pre-rebuild
// bozzies/section with the eyebrow "The Trio Years" / "The Solo Years" and
// a "[Sisters timeline: interactive block pending]" paragraph. This script
// replaces those regions with the correct real DOM + a single bozzies/timeline
// block carrying the entries as an attribute.
//
// Idempotent: if the target region already contains wp:bozzies/timeline,
// the patcher no-ops for that page.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { load } from 'js-yaml';
import { wp } from './lib.mjs';

// Gutenberg's client-side JSON serializer escapes only `--`, `<`, `>`, `&`
// (not `'`). Reused from other import scripts so straight apostrophes in
// event text round-trip byte-identical.
const gbJson = (obj) =>
  JSON.stringify(obj)
    .replace(/--/g, '\\u002d\\u002d')
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');

const __dirname = dirname(fileURLToPath(import.meta.url));

function readTimelineEntries(subject) {
  const path = resolve(__dirname, `../../../boswell-poc/src/content/timelines/${subject}.md`);
  const src = readFileSync(path, 'utf8');
  const m = src.match(/^---\n([\s\S]*?)\n---/);
  if (!m) throw new Error(`${path}: no frontmatter found`);
  const data = load(m[1]);
  const entries = Array.isArray(data.entries) ? data.entries : [];
  return entries.map((e) => ({
    year:     e.year != null ? String(e.year) : '',
    event:    e.event != null ? String(e.event) : '',
    image:    e.image || '',
    imageAlt: e.imageAlt || '',
  }));
}

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

// The pre-rebuild placeholder region on both pages: an outer
// wp:bozzies/section (paper + staves + reading + full) with a centered
// eyebrow paragraph + h2 + placeholder paragraph.
function placeholderRegex(eyebrowText) {
  const eyebrowEsc = eyebrowText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(
    '<!-- wp:bozzies/section \\{[^}]*"backgroundStyle":"paper"[^}]*\\} -->\\s*\\n' +
      '<!-- wp:paragraph \\{"className":"is-style-eyebrow","align":"center"\\} -->' +
      '<p class="is-style-eyebrow has-text-align-center">' + eyebrowEsc + '</p>' +
      '<!-- /wp:paragraph -->\\s*\\n' +
      '<!-- wp:heading \\{[^}]*"level":2[^}]*\\} -->' +
      '<h2[^>]*>([^<]+)</h2>' +
      '<!-- /wp:heading -->\\s*\\n' +
      '<!-- wp:paragraph \\{"align":"center"\\} -->' +
      '<p class="has-text-align-center">\\[Sisters timeline: interactive block pending\\]</p>' +
      '<!-- /wp:paragraph -->\\s*\\n' +
      '<!-- /wp:bozzies/section -->'
  );
}

// Build the career-timeline replacement: a paper-ground timeline-section
// wrapper (matching career-timeline.astro L33-37) — no header, since Astro
// renders no header on that page. The `.timeline-section` class scopes the
// image cap + extra padding-block from career-timeline.astro L65-70.
function careerTimelineBlocks(entries) {
  const attrs = gbJson({ entries, color: 'purple' });
  return (
    `<!-- wp:group {"tagName":"section","align":"full","className":"section ground-paper timeline-section","layout":{"type":"constrained"}} -->\n` +
    `<section class="wp-block-group alignfull section ground-paper timeline-section">` +
      `<!-- wp:group {"className":"container","layout":{"type":"constrained"}} -->\n` +
      `<div class="wp-block-group container">` +
        `<!-- wp:bozzies/timeline ${attrs} /-->` +
      `</div>\n` +
      `<!-- /wp:group -->` +
    `</section>\n` +
    `<!-- /wp:group -->`
  );
}

// Build the Connee bio replacement: a paper-ground bio-timeline wrapper
// (matching sisters/[slug].astro L101-109) with the "The Solo Years" eyebrow
// + bio-timeline title header, then the Timeline block.
function conneeBioTimelineBlocks({ entries, title }) {
  const attrs = gbJson({ entries, color: 'purple' });
  return (
    `<!-- wp:group {"tagName":"section","align":"full","className":"section ground-paper bio-timeline","layout":{"type":"constrained"}} -->\n` +
    `<section class="wp-block-group alignfull section ground-paper bio-timeline">` +
      `<!-- wp:group {"className":"container","layout":{"type":"constrained"}} -->\n` +
      `<div class="wp-block-group container">` +
        `<!-- wp:group {"tagName":"header","className":"bio-timeline__head","layout":{"type":"constrained"}} -->\n` +
        `<header class="wp-block-group bio-timeline__head">` +
          `<!-- wp:paragraph {"className":"eyebrow eyebrow--purple"} --><p class="eyebrow eyebrow--purple">The Solo Years</p><!-- /wp:paragraph -->\n` +
          `<!-- wp:heading {"level":2,"className":"bio-timeline__title"} --><h2 class="wp-block-heading bio-timeline__title">${title}</h2><!-- /wp:heading -->` +
        `</header>\n` +
        `<!-- /wp:group -->\n` +
        `<!-- wp:bozzies/timeline ${attrs} /-->` +
      `</div>\n` +
      `<!-- /wp:group -->` +
    `</section>\n` +
    `<!-- /wp:group -->`
  );
}

function patchPage(slug, eyebrowText, replacementBlocks) {
  const id = findPageId(slug);
  if (!id) throw new Error(`No page with slug "${slug}" found.`);
  console.log(`  ${slug} id=${id}`);

  const before = wp(['post', 'get', String(id), '--field=post_content']);
  console.log(`  before: ${before.length} bytes`);

  if (before.includes('wp:bozzies/timeline')) {
    console.log('  already contains bozzies/timeline, no change');
    return;
  }

  const re = placeholderRegex(eyebrowText);
  if (!re.test(before)) {
    throw new Error(`${slug}: placeholder region for eyebrow "${eyebrowText}" not found; abort.`);
  }

  const after = before.replace(re, replacementBlocks);
  console.log(`  after:  ${after.length} bytes`);

  const php = `wp_update_post(['ID'=>${id},'post_content'=>wp_slash(${phpStr(after)})]); echo 'OK';`;
  wp(['eval', php]);
  console.log('  updated ok');
}

function run() {
  const trioEntries = readTimelineEntries('trio');
  console.log(`  trio.md: ${trioEntries.length} entries`);
  const conneeEntries = readTimelineEntries('connee');
  console.log(`  connee.md: ${conneeEntries.length} entries`);

  console.log('\n/sisters/career-timeline/');
  patchPage('career-timeline', 'The Trio Years', careerTimelineBlocks(trioEntries));

  console.log('\n/sisters/connee/');
  patchPage('connee', 'The Solo Years', conneeBioTimelineBlocks({
    entries: conneeEntries,
    title: 'Connee Boswell — Solo Career Timeline',
  }));
}

run();
