#!/usr/bin/env node
// scripts/import/home-quotes-carousel.mjs
//
// One-shot home-page patcher: inside the existing bozzies/voices-section
// on /home/, replace the placeholder paragraph
// ("[Quotes carousel: interactive block pending]") with a single
// bozzies/quotes-carousel block populated with the quotes from
// ~/boswell-poc/src/content/voices/home.md.
//
// Idempotent: if the placeholder is already gone (i.e. the block is
// present), the patcher no-ops.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { wp } from './lib.mjs';

// Gutenberg's client-side JSON serializer escapes only `--`, `<`, `>`, `&`
// (not `'`). Reused from scripts/import/home-playlist-player.mjs.
const gbJson = (obj) =>
  JSON.stringify(obj)
    .replace(/--/g, '\\u002d\\u002d')
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');

const HOME_SLUG = 'home';
const __dirname = dirname(fileURLToPath(import.meta.url));

// Minimal YAML frontmatter parser for the quotes list in voices/home.md.
// Handles the exact shape of that file — a top-level `quotes:` list with
// `text` + `attribution` per entry, values bare or double-quoted.
function parseVoicesHome() {
  const src = readFileSync(
    resolve(__dirname, '../../../boswell-poc/src/content/voices/home.md'),
    'utf8'
  );
  const m = src.match(/^---\n([\s\S]*?)\n---/);
  if (!m) throw new Error('voices/home.md: no frontmatter found');
  const yaml = m[1];

  const lines = yaml.split('\n');
  const start = lines.findIndex((l) => /^quotes:\s*$/.test(l));
  if (start === -1) throw new Error('voices/home.md: no `quotes:` key');

  const quotes = [];
  let current = null;
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^\S/.test(line)) break; // back to top-level or end
    const bullet = line.match(/^\s*-\s+(\w+):\s*(.*)$/);
    const cont   = line.match(/^\s{4,}(\w+):\s*(.*)$/);
    if (bullet) {
      if (current) quotes.push(current);
      current = {};
      current[bullet[1]] = unquote(bullet[2]);
    } else if (cont && current) {
      current[cont[1]] = unquote(cont[2]);
    }
  }
  if (current) quotes.push(current);

  return quotes.map((q) => ({
    text:        q.text        || '',
    attribution: q.attribution || '',
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
  const quotes = parseVoicesHome();
  console.log(`  voices/home.md: ${quotes.length} quotes`);

  const id = findHomeId();
  if (!id) throw new Error(`No page with slug "${HOME_SLUG}" found.`);
  console.log(`  home id=${id}`);

  const before = wp(['post', 'get', String(id), '--field=post_content']);
  console.log(`  before: ${before.length} bytes`);

  if (before.includes('wp:bozzies/quotes-carousel')) {
    console.log('  already contains quotes-carousel block, no change');
    return;
  }

  // Placeholder paragraph inside bozzies/voices-section.
  const placeholderRe = /<!-- wp:paragraph \{"align":"center"\} -->\s*\n<p class="has-text-align-center">\[Quotes carousel: interactive block pending\]<\/p>\s*\n<!-- \/wp:paragraph -->/;
  if (!placeholderRe.test(before)) {
    throw new Error('voices-section placeholder paragraph not found; abort.');
  }

  // Astro's home passes `intervalMs={7000}` (index.astro L76).
  const newBlock = `<!-- wp:bozzies/quotes-carousel ${gbJson({ quotes, intervalMs: 7000 })} /-->`;
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
