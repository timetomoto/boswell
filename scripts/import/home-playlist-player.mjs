#!/usr/bin/env node
// scripts/import/home-playlist-player.mjs
//
// One-shot home-page patcher: inside the existing bozzies/playlist-section
// on /home/, replace the placeholder paragraph
// ("[Playlist player: interactive block pending]") with a single
// bozzies/playlist-player block populated with the 26 tracks from
// ~/boswell-poc/src/content/playlists/volume-one.md L5-135.
//
// Idempotent: if the placeholder is already gone (i.e. the block is
// present), the patcher no-ops.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
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
const __dirname = dirname(fileURLToPath(import.meta.url));

// Minimal YAML frontmatter parser for the tracks array in volume-one.md.
// Handles the exact shape of that file — a top-level `tracks:` list with
// `title / artist / year / duration / audio` keys per entry, values that
// may be bare or quoted strings.
function parseVolumeOne() {
  const src = readFileSync(
    resolve(__dirname, '../../../boswell-poc/src/content/playlists/volume-one.md'),
    'utf8'
  );
  const m = src.match(/^---\n([\s\S]*?)\n---/);
  if (!m) throw new Error('volume-one.md: no frontmatter found');
  const yaml = m[1];

  const lines = yaml.split('\n');
  // Find the `tracks:` line and iterate list items until frontmatter end.
  const start = lines.findIndex((l) => /^tracks:\s*$/.test(l));
  if (start === -1) throw new Error('volume-one.md: no `tracks:` key');

  const tracks = [];
  let current = null;
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^\S/.test(line)) break; // back to top-level key or end
    const bullet = line.match(/^\s*-\s+(\w+):\s*(.*)$/);
    const cont   = line.match(/^\s{4,}(\w+):\s*(.*)$/);
    if (bullet) {
      if (current) tracks.push(current);
      current = {};
      current[bullet[1]] = unquote(bullet[2]);
    } else if (cont && current) {
      current[cont[1]] = unquote(cont[2]);
    }
  }
  if (current) tracks.push(current);

  // Normalize `year` to string (Astro renders it via .filter(Boolean).join),
  // matching the WP block's expected string shape.
  return tracks.map((t) => ({
    title:    t.title    || '',
    artist:   t.artist   || '',
    year:     t.year != null ? String(t.year) : '',
    duration: t.duration || '',
    audio:    t.audio    || '',
  }));
}

function unquote(v) {
  if (v == null) return '';
  const s = String(v).trim();
  if (s.length >= 2 && ((s[0] === '"' && s[s.length - 1] === '"') || (s[0] === "'" && s[s.length - 1] === "'"))) {
    return s.slice(1, -1);
  }
  return s;
}

function findHomeId() {
  const out = wp([
    'post', 'list', '--post_type=page', `--name=${HOME_SLUG}`,
    '--fields=ID', '--format=ids',
  ], { allowFail: true });
  if (!out) return null;
  const id = parseInt(out.split(/\s+/)[0], 10);
  return Number.isFinite(id) ? id : null;
}

function run() {
  const tracks = parseVolumeOne();
  console.log(`  volume-one.md: ${tracks.length} tracks`);

  const id = findHomeId();
  if (!id) throw new Error(`No page with slug "${HOME_SLUG}" found.`);
  console.log(`  home id=${id}`);

  const before = wp(['post', 'get', String(id), '--field=post_content']);
  console.log(`  before: ${before.length} bytes`);

  if (before.includes('wp:bozzies/playlist-player')) {
    console.log('  already contains playlist-player block, no change');
    return;
  }

  // Replace the placeholder paragraph inside the existing
  // bozzies/playlist-section container with the new block.
  const placeholderRe = /<!-- wp:paragraph \{"align":"center"\} -->\s*\n<p class="has-text-align-center">\[Playlist player: interactive block pending\]<\/p>\s*\n<!-- \/wp:paragraph -->/;
  if (!placeholderRe.test(before)) {
    throw new Error('playlist-section placeholder paragraph not found; abort.');
  }

  const newBlock = `<!-- wp:bozzies/playlist-player ${gbJson({ tracks })} /-->`;
  const after = before.replace(placeholderRe, newBlock);
  console.log(`  after:  ${after.length} bytes`);

  const php = `wp_update_post(['ID'=>${id},'post_content'=>wp_slash(${phpStr(after)})]); echo 'OK';`;
  wp(['eval', php]);
  console.log('  updated ok');
}

function phpStr(s) {
  return `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

run();
