#!/usr/bin/env node
// scripts/import/home-voices-section.mjs
//
// One-shot home-page patcher: replace the existing home-voices section
// (bozzies/section wrapping eyebrow + h2 + placeholder paragraph) with a
// single bozzies/voices-section block whose inner blocks hold the
// placeholder (until the interactive quotes carousel block ships).
// Copy comes from ~/boswell-poc/src/content/pages/home.md L18-19 for
// eyebrow + title.
//
// Home doesn't have a full import script yet; this only patches the
// voices section head so the ported CSS goes live. Body waits for the
// quotes carousel block (Step 14).

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

// Values verbatim from ~/boswell-poc/src/content/pages/home.md L18-19.
const voicesAttrs = {
  anchor:  'home-voices',
  eyebrow: 'In Their Words',
  title:   'What the world has said about the Boswells',
};

// Inner-blocks body: the same placeholder paragraph the pre-rebuild
// import used. Later replaced by the quotes carousel block.
const innerBlocksMarkup = [
  '<!-- wp:paragraph {"align":"center"} -->',
  '<p class="has-text-align-center">[Quotes carousel: interactive block pending]</p>',
  '<!-- /wp:paragraph -->',
].join('\n');

const newVoicesBlock =
  `<!-- wp:bozzies/voices-section ${gbJson(voicesAttrs)} -->\n` +
  innerBlocksMarkup +
  `\n<!-- /wp:bozzies/voices-section -->`;

function run() {
  const id = findHomeId();
  if (!id) throw new Error(`No page with slug "${HOME_SLUG}" found.`);
  console.log(`  home id=${id}`);

  const before = wp(['post', 'get', String(id), '--field=post_content']);
  console.log(`  before: ${before.length} bytes`);

  const re = /<!-- wp:bozzies\/section \{"anchor":"home-voices"[\s\S]*?<!-- \/wp:bozzies\/section -->/;
  if (!re.test(before)) {
    if (before.includes('wp:bozzies/voices-section')) {
      console.log('  already patched, no change');
      return;
    }
    throw new Error('home-voices section not found in home content; abort.');
  }
  const after = before.replace(re, newVoicesBlock);
  console.log(`  after:  ${after.length} bytes`);

  const php = `wp_update_post(['ID'=>${id},'post_content'=>wp_slash(${phpStr(after)})]); echo 'OK';`;
  wp(['eval', php]);
  console.log('  updated ok');
}

function phpStr(s) {
  return `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

run();
