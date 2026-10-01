#!/usr/bin/env node
// scripts/import/home-hero-split.mjs
//
// One-shot home-page updater: replace the pre-rebuild
// bozzies/section {backgroundStyle:"ink", ...} wrapper containing
// wp:columns.bozzies-hero-split (which used wp:html for the glyph SVG —
// the last Custom HTML block in user-visible content) with a single
// bozzies/hero-split block.
//
// Values are verbatim from ~/boswell-poc/src/content/pages/home.md
// L2-7 (title / subtitle / heroImage / heroImageAlt / heroCredit) and the
// Astro home hero call at ~/boswell-poc/src/pages/index.astro L28-36.
//
// Home doesn't have a full import script yet; this patcher is surgical
// (only touches the leading hero region). The Home page sections step
// will consolidate everything into a full home.mjs.

import { wp, findAttachmentByTitle } from './lib.mjs';

// Gutenberg's client-side JSON serializer escapes `--`, `<`, `>`, `&` only
// (not `'`). Matches scripts/import/group2.mjs + home-donate-teaser.mjs so
// post_content round-trips cleanly through the block editor.
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

// Resolve the boswell portrait attachment. The pre-existing DB has it as
// attachment id 45 with title "Boswell Sisters 1932" and file
// wp-content/uploads/2026/09/boswell.jpg — that's what the current DB has
// wired up, so reuse it rather than re-importing.
function resolveHeroImage() {
  const id = findAttachmentByTitle('Boswell Sisters 1932');
  if (!id) throw new Error('Attachment "Boswell Sisters 1932" not found. Run the media import first.');
  const url = wp(['post', 'get', String(id), '--field=guid']);
  const alt = wp(['post', 'meta', 'get', String(id), '_wp_attachment_image_alt'], { allowFail: true });
  return { id, url, alt: (alt || 'Portrait of the Boswell Sisters, circa 1932.').trim() };
}

function run() {
  const id = findHomeId();
  if (!id) throw new Error(`No page with slug "${HOME_SLUG}" found.`);
  console.log(`  home id=${id}`);

  const image = resolveHeroImage();
  console.log(`  image id=${image.id} url=${image.url}`);

  // Attribute values verbatim from ~/boswell-poc/src/content/pages/home.md L2-7.
  const heroAttrs = {
    title: 'Meet the Boswells',
    subtitle: 'Martha, Connie and Vet, the New Orleans trio who invented swinging close-harmony.',
    imageCredit: 'c. 1932',
    height: 'tall',
    image: { id: image.id, url: image.url, alt: image.alt },
    imageAlt: image.alt,
  };

  const newBlock = `<!-- wp:bozzies/hero-split ${gbJson(heroAttrs)} /-->`;

  const before = wp(['post', 'get', String(id), '--field=post_content']);
  console.log(`  before: ${before.length} bytes`);

  // Match the leading bozzies/section block that wraps the old columns-shim
  // hero. Anchor on the opening delimiter that starts with the pre-rebuild
  // ink+edge attrs so we don't accidentally swallow a later hero variant.
  const re = /<!-- wp:bozzies\/section \{"backgroundStyle":"ink","width":"edge"[\s\S]*?<!-- \/wp:bozzies\/section -->/;
  if (!re.test(before)) {
    if (before.includes('wp:bozzies/hero-split')) {
      console.log('  already patched, no change');
      return;
    }
    throw new Error('bozzies-hero-split section not found in home content; abort.');
  }
  const after = before.replace(re, newBlock);
  console.log(`  after:  ${after.length} bytes`);

  const php = `wp_update_post(['ID'=>${id},'post_content'=>wp_slash(${phpStr(after)})]); echo 'OK';`;
  wp(['eval', php]);
  console.log('  updated ok');
}

function phpStr(s) {
  return `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

run();
