#!/usr/bin/env node
// scripts/import/release-cards-add-href-id.mjs
//
// One-shot patcher: for every bozzies/release-card block on /press/, resolve
// the block's `href` URL back to a WP attachment ID via WP's own
// `attachment_url_to_postid`, then rewrite the block with an `hrefId`
// attribute so the block's editor sidebar MediaUpload picker shows the
// "Replace PDF" affordance (rather than "Choose PDF"). Attribute keys are
// emitted in block.json order so Gutenberg's serializer round-trip is
// stable.
//
// Idempotent: skips a block that already has hrefId (or a numeric-shape
// hrefId) matching the resolved attachment.

import { wp } from './lib.mjs';

const gbJson = (obj) =>
  JSON.stringify(obj)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/'/g, '\\u0027');

function findPageId(slug) {
  const out = wp(
    ['post', 'list', '--post_type=page', `--name=${slug}`, '--fields=ID', '--format=ids'],
    { allowFail: true }
  );
  if (!out) return null;
  const id = parseInt(out.split(/\s+/)[0], 10);
  return Number.isFinite(id) ? id : null;
}

function phpStr(s) {
  return `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

function attachmentIdFromUrl(url) {
  if (!url) return 0;
  const php = `echo (int) attachment_url_to_postid(${phpStr(url)});`;
  const out = wp(['eval', php], { allowFail: true }) || '';
  const id = parseInt(out.trim(), 10);
  return Number.isFinite(id) ? id : 0;
}

// block.json declares attributes in this order — matches the Gutenberg
// serializer canonical output that the editor produces on first save.
const KEY_ORDER = ['documentType', 'title', 'releaseDate', 'href', 'hrefId'];

function canonicalizeAttrs(rawAttrs, hrefId) {
  const next = { ...rawAttrs };
  if (hrefId) next.hrefId = hrefId;
  const ordered = {};
  for (const k of KEY_ORDER) {
    if (k in next) ordered[k] = next[k];
  }
  // Preserve any unknown/future attributes at the end.
  for (const k of Object.keys(next)) {
    if (!(k in ordered)) ordered[k] = next[k];
  }
  return ordered;
}

function run() {
  const pressId = findPageId('press');
  if (!pressId) throw new Error('/press/ page not found.');
  console.log(`  /press/ id=${pressId}`);

  const before = wp(['post', 'get', String(pressId), '--field=post_content']);
  console.log(`  before: ${before.length} bytes`);

  const blockRe = /<!-- wp:bozzies\/release-card (\{[\s\S]*?\}) \/-->/g;

  let patched = 0;
  let unchanged = 0;
  const after = before.replace(blockRe, (whole, jsonStr) => {
    let attrs;
    try {
      attrs = JSON.parse(jsonStr);
    } catch (e) {
      console.log(`  ! could not parse block JSON, leaving untouched: ${e.message}`);
      return whole;
    }
    const url = attrs.href;
    const currentId = Number.isFinite(attrs.hrefId) ? attrs.hrefId : 0;
    const resolvedId = attachmentIdFromUrl(url);
    if (!resolvedId) {
      console.log(`  ~ could not resolve attachment for href=${url || '(empty)'}, skipping`);
      unchanged += 1;
      return whole;
    }
    const rewritten = canonicalizeAttrs(attrs, resolvedId);
    const nextBlock = `<!-- wp:bozzies/release-card ${gbJson(rewritten)} /-->`;
    if (nextBlock === whole) {
      unchanged += 1;
      return whole;
    }
    patched += 1;
    if (!currentId) console.log(`  + hrefId=${resolvedId} for ${url}`);
    else if (currentId !== resolvedId)
      console.log(`  ~ hrefId ${currentId} → ${resolvedId} for ${url}`);
    else console.log(`  ~ reordered attrs for ${url}`);
    return nextBlock;
  });

  console.log(`  ${patched} block(s) patched, ${unchanged} unchanged`);

  if (after === before) {
    console.log('  no changes — nothing to write');
    return;
  }
  console.log(`  after:  ${after.length} bytes`);

  const php = `wp_update_post(['ID'=>${pressId},'post_content'=>wp_slash(${phpStr(after)})]); echo 'OK';`;
  wp(['eval', php]);
  console.log('  updated ok');
}

run();
