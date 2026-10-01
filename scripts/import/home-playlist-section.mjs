#!/usr/bin/env node
// scripts/import/home-playlist-section.mjs
//
// One-shot home-page patcher: replace the existing home-playlist section
// (bozzies/section wrapping eyebrow + h2 + blurb + placeholder paragraph)
// with a single bozzies/playlist-section block whose inner blocks hold
// the placeholder (until the interactive playlist player block ships).
// Copy comes from ~/boswell-poc/src/content/pages/home.md L16-17 for
// eyebrow + title; the blurb is Astro's `{playlistCollectionTitle}.` from
// index.astro L62 (playlistCollectionTitle = "The Boswell Sisters
// Collection Volume One" per playlists/volume-one.md L2).
//
// Home doesn't have a full import script yet; this only patches the
// playlist section head so the ported CSS goes live. Body waits for the
// playlist player block (Step 13); when it lands, this patcher can be
// extended (or the block converted to attributes-only rendering the
// player) and re-run.

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

// Values verbatim from ~/boswell-poc/src/content/pages/home.md L16-17
// plus playlists/volume-one.md L2 + Astro index.astro L62 (`.`).
const playlistAttrs = {
  anchor:  'home-playlist',
  eyebrow: 'Music Playlist',
  title:   'Hear the Boswell Sound',
  blurb:   'The Boswell Sisters Collection Volume One.',
};

// Inner-blocks body: the same placeholder paragraph the pre-rebuild
// import used. Later replaced by the playlist player block.
const innerBlocksMarkup = [
  '<!-- wp:paragraph {"align":"center"} -->',
  '<p class="has-text-align-center">[Playlist player: interactive block pending]</p>',
  '<!-- /wp:paragraph -->',
].join('\n');

const newPlaylistBlock =
  `<!-- wp:bozzies/playlist-section ${gbJson(playlistAttrs)} -->\n` +
  innerBlocksMarkup +
  `\n<!-- /wp:bozzies/playlist-section -->`;

function run() {
  const id = findHomeId();
  if (!id) throw new Error(`No page with slug "${HOME_SLUG}" found.`);
  console.log(`  home id=${id}`);

  const before = wp(['post', 'get', String(id), '--field=post_content']);
  console.log(`  before: ${before.length} bytes`);

  const re = /<!-- wp:bozzies\/section \{"anchor":"home-playlist"[\s\S]*?<!-- \/wp:bozzies\/section -->/;
  if (!re.test(before)) {
    if (before.includes('wp:bozzies/playlist-section')) {
      console.log('  already patched, no change');
      return;
    }
    throw new Error('home-playlist section not found in home content; abort.');
  }
  const after = before.replace(re, newPlaylistBlock);
  console.log(`  after:  ${after.length} bytes`);

  const php = `wp_update_post(['ID'=>${id},'post_content'=>wp_slash(${phpStr(after)})]); echo 'OK';`;
  wp(['eval', php]);
  console.log('  updated ok');
}

function phpStr(s) {
  return `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

run();
