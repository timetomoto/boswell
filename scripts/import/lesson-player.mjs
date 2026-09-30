#!/usr/bin/env node
// scripts/import/lesson-player.mjs
//
// One-shot patcher: replace the existing unregistered `wp:bozzies/lesson-player`
// stub on all 5 lesson pages with the new registered block. Attribute values
// (order, title, audioUrl, audioId) are read from Astro markdown frontmatter
// + the WP audio attachment matching the frontmatter's audioFile filename.
//
// Astro source: ~/boswell-poc/src/pages/media/lessons/[order].astro L37-68.
// The inner prose ("_Narrated by Cynthia Lucas._") matches every lesson body
// in ~/boswell-poc/src/content/lessons/lesson-N.md.
//
// The block was inserted by a previous rebuild step before its registration
// existed; the block signature is (align, order, title, audioUrl, audioId).
// This script preserves any curly-quoted content by encoding through the
// Gutenberg client-side JSON serializer.

import { wp, findAttachmentByTitle } from './lib.mjs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const POC = resolve(__dirname, '../../../boswell-poc');

// Gutenberg's client-side JSON serializer escapes only `--`, `<`, `>`, `&`
// (not `'`). Reused across import scripts.
const gbJson = (obj) =>
  JSON.stringify(obj)
    .replace(/--/g, '\\u002d\\u002d')
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');

function parseFrontmatter(md) {
  const m = /^---\s*\n([\s\S]*?)\n---/.exec(md);
  if (!m) return {};
  const fm = {};
  for (const line of m[1].split('\n')) {
    const kv = /^([\w-]+)\s*:\s*(.*)$/.exec(line);
    if (!kv) continue;
    let v = kv[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (/^\d+$/.test(v)) v = parseInt(v, 10);
    fm[kv[1]] = v;
  }
  return fm;
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

function getAttachmentUrl(id) {
  return wp(['post', 'get', String(id), '--field=guid']);
}

const summary = { patched: 0, unchanged: 0, notFound: 0 };

for (let n = 1; n <= 5; n++) {
  const slug = `lesson-${n}`;
  const mdPath = `${POC}/src/content/lessons/lesson-${n}.md`;
  const fm = parseFrontmatter(readFileSync(mdPath, 'utf8'));
  const order = fm.order || n;
  const title = fm.title || '';

  // audioFile is like "/uploads/audio/lesson1.mp3"; the WP attachment title
  // is the filename basename minus extension ("lesson1"). Resolve via lib.
  const audioBase = String(fm.audioFile || `/uploads/audio/lesson${order}.mp3`)
    .split('/').pop().replace(/\.[^.]+$/, '');
  const audioId = findAttachmentByTitle(audioBase);
  if (!audioId) {
    console.log(`  ${slug}: audio attachment "${audioBase}" not found; skipping`);
    summary.notFound++;
    continue;
  }
  const audioUrl = getAttachmentUrl(audioId);

  const attrs = {
    align: 'full',
    order,
    title,
    audioUrl,
    audioId,
  };
  const openTag = `<!-- wp:bozzies/lesson-player ${gbJson(attrs)} -->`;
  const inner   = `<!-- wp:paragraph --><p><em>Narrated by Cynthia Lucas.</em></p><!-- /wp:paragraph -->`;
  const closeTag = `<!-- /wp:bozzies/lesson-player -->`;
  const newBlock = `${openTag}\n${inner}\n${closeTag}`;

  const id = findPageId(slug);
  if (!id) {
    console.log(`  ${slug}: page not found`);
    summary.notFound++;
    continue;
  }
  const before = wp(['post', 'get', String(id), '--field=post_content']);

  // Match the entire existing (unregistered) lesson-player block, including
  // its inner paragraph and closing tag.
  const re = /<!-- wp:bozzies\/lesson-player [\s\S]*?<!-- \/wp:bozzies\/lesson-player -->/;
  let after;
  if (re.test(before)) {
    after = before.replace(re, newBlock);
  } else {
    console.log(`  ${slug} (id=${id}): existing lesson-player block not matched; skipping`);
    summary.notFound++;
    continue;
  }

  if (after === before) {
    console.log(`  ${slug} (id=${id}): already matches; no change (${before.length} bytes)`);
    summary.unchanged++;
    continue;
  }

  const php = `wp_update_post(['ID'=>${id},'post_content'=>wp_slash(${phpStr(after)})]); echo 'OK';`;
  wp(['eval', php]);
  console.log(`  ${slug} (id=${id}): patched (before=${before.length} after=${after.length})`);
  summary.patched++;
}

console.log(`\nDone: patched=${summary.patched} unchanged=${summary.unchanged} notFound=${summary.notFound}`);
