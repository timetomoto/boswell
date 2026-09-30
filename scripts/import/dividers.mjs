#!/usr/bin/env node
// scripts/import/dividers.mjs
//
// Sync the bozzies/divider block on every page where Astro renders
// <SectionDivider variant="jazz" color="purple" />:
//
//   /home/                   1 divider — between intro-section and playlist-section
//                            (index.astro L53)
//   /about/                  1 divider — between section-intro and about-cta
//                            (about.astro L39). Old WP has a SECOND spurious
//                            divider between hero and intro — remove it.
//   /sisters/                1 divider — between section-intro and sisters-grid
//                            (sisters/index.astro L40)
//   /media/                  2 dividers — between section-intro and playlist-section,
//                            and between playlist-section and lessons-grid
//                            (media/index.astro L44 + L63)
//   /press/                  1 divider — between section-intro and first subhub-section
//                            (press/index.astro L58)
//   /sisters/connee/         1 divider — before the (deferred) bio-timeline section
//                            (sisters/[slug].astro L100, only when conneeTimeline)
//   /sisters/bio-resources/  1 divider — after PullQuote, before prose section
//                            (bio-resources.astro L31)
//
// Astro's SectionDivider has default variant="line" but every use is
// jazz+purple, so the block attrs are omitted (they match the block.json
// defaults). The block is a self-closing comment, which serializes to
// `<!-- wp:bozzies/divider /-->` — this is exactly what Gutenberg's client-
// side serializer emits for an attributes-only block with no non-default
// attrs, giving byte-identical round-trips.

import { wp } from './lib.mjs';

// This block's default attrs (variant='jazz', color='purple', align='wide')
// match Astro's on every use. Emit as attributes-less self-closing block —
// no defaults are serialized, so round-trip is byte-identical.
const DIVIDER = '<!-- wp:bozzies/divider /-->';

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

// The pre-rebuild jazz separator, escaped for regex.
const RE_OLD_JAZZ = /<!-- wp:separator \{"className":"is-style-jazz","align":"wide"\} --><hr class="wp-block-separator alignwide is-style-jazz"\/><!-- \/wp:separator -->/g;
// Any existing bozzies/divider self-closing block (to avoid double-inserting).
const RE_EXISTING_DIVIDER = /<!-- wp:bozzies\/divider[^>]*\/-->/g;

// Ops describe how to transform each page.
//   replaceAllOld   — replace every old wp:separator{is-style-jazz} with the
//                     divider block.
//   insertBefore    — for each { needle, count }, insert `count` dividers
//                     immediately before the first occurrence of `needle`
//                     (each needle inserted at most once per patch call).
//   removeFirstOld  — count of leading old separators to remove before the
//                     replaceAllOld pass (used on /about/ to strip the
//                     spurious divider between hero and intro).
const PAGES = [
  // /home/ — 1 old separator, replace it with the new block.
  { slug: 'home',            replaceAllOld: true },
  // /about/ — 2 old separators. Remove the first (between hero and intro),
  // then replace the remaining one (between intro and about-cta).
  { slug: 'about',           removeFirstOld: 1, replaceAllOld: true },
  // /sisters/ — 1 old separator, replace.
  { slug: 'sisters',         replaceAllOld: true },
  // /media/ — 2 old separators, replace both. Already in the right places.
  { slug: 'media',           replaceAllOld: true },
  // /press/ — no old separator, insert one BEFORE the first subhub section
  // (matched by the first "The Latest News" eyebrow paragraph).
  { slug: 'press',           insertBefore: [ { needle: '<!-- wp:bozzies/section {"headingWidth":"reading","spacing":"compact"} -->', count: 1 } ] },
  // /sisters/connee/ — no old separator, insert one BEFORE the deferred
  // bio-timeline placeholder section.
  { slug: 'connee',          insertBefore: [ { needle: '<!-- wp:bozzies/section {"backgroundStyle":"paper","backdrop":"staves","headingWidth":"reading","align":"full"} -->', count: 1 } ] },
  // /sisters/bio-resources/ — no old separator, insert one BEFORE the prose
  // section that follows the pull-quote.
  { slug: 'bio-resources',   insertBefore: [ { needle: '<!-- wp:bozzies/section {"backgroundStyle":"paper","width":"container","headingWidth":"container","align":"full"} -->', count: 1 } ] },
];

function patchPage(page) {
  const { slug } = page;
  const id = findPageId(slug);
  if (!id) throw new Error(`No page with slug "${slug}" found.`);
  const before = wp(['post', 'get', String(id), '--field=post_content']);
  let after = before;

  // Strip any stale divider blocks first (idempotency).
  after = after.replace(RE_EXISTING_DIVIDER, '');
  // Collapse the newline gap the strip may have left.
  after = after.replace(/\n\n\n+/g, '\n\n');

  // Optionally remove N leading old separators (used on /about/).
  if (page.removeFirstOld && page.removeFirstOld > 0) {
    let n = page.removeFirstOld;
    after = after.replace(RE_OLD_JAZZ, (m) => (n-- > 0 ? '' : m));
    after = after.replace(/\n\n\n+/g, '\n\n');
  }

  // Replace every remaining old wp:separator{is-style-jazz} block with the
  // new self-closing divider.
  if (page.replaceAllOld) {
    after = after.replace(RE_OLD_JAZZ, DIVIDER);
  }

  // Insert dividers before named anchors.
  if (page.insertBefore) {
    for (const { needle, count } of page.insertBefore) {
      const idx = after.indexOf(needle);
      if (idx === -1) {
        console.log(`  ${slug}: needle not found: ${needle.slice(0, 80)}…`);
        continue;
      }
      const inject = Array(count).fill(DIVIDER).join('\n\n') + '\n\n';
      after = after.slice(0, idx) + inject + after.slice(idx);
    }
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
