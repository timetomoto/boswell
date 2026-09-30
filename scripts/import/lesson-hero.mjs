#!/usr/bin/env node
// scripts/import/lesson-hero.mjs
//
// One-shot patcher: replace the existing lesson-hero region on all 5 lesson
// pages (bozzies/section {backgroundStyle:"purple",backdrop:"staves"...}
// wrapping a paragraph back link + eyebrow paragraph + h1 + summary paragraph)
// with a single bozzies/lesson-hero block. Values are pulled verbatim from
// ~/boswell-poc/src/content/lessons/lesson-N.md frontmatter (title, order,
// summary).
//
// Astro source: ~/boswell-poc/src/pages/media/lessons/[order].astro L25-35.
// Lesson pages don't have a full import script yet — this only patches the
// hero region so the ported CSS goes live. Later, the "audio player + prose"
// and "prev/all/next nav" sub-items will replace the remaining sections.

import { wp } from './lib.mjs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const POC = resolve(__dirname, '../../../boswell-poc');

// Gutenberg's client-side JSON serializer escapes only `--`, `<`, `>`, `&`
// (not `'`). Reused from scripts/import/group2.mjs.
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
    // Strip matching leading/trailing quotes.
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    // Numeric?
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

const summary = { patched: 0, alreadyPatched: 0, notFound: 0 };

for (let n = 1; n <= 5; n++) {
  const slug = `lesson-${n}`;
  const mdPath = `${POC}/src/content/lessons/lesson-${n}.md`;
  const fm = parseFrontmatter(readFileSync(mdPath, 'utf8'));
  const order = fm.order || n;
  const eyebrow = `Lesson ${String(order).padStart(2, '0')}`;
  const title = fm.title || '';
  const heroSummary = fm.summary || '';

  const attrs = {
    align: 'full',
    eyebrow,
    title,
    summary: heroSummary,
    backHref: '/media/',
    backLabel: 'Media',
  };
  const newHeroBlock = `<!-- wp:bozzies/lesson-hero ${gbJson(attrs)} /-->`;

  const id = findPageId(slug);
  if (!id) {
    console.log(`  ${slug}: NOT FOUND`);
    summary.notFound++;
    continue;
  }
  const before = wp(['post', 'get', String(id), '--field=post_content']);

  const re = /<!-- wp:bozzies\/section \{"backgroundStyle":"purple","backdrop":"staves"[\s\S]*?<!-- \/wp:bozzies\/section -->/;
  if (!re.test(before)) {
    if (before.includes('wp:bozzies/lesson-hero')) {
      console.log(`  ${slug} (id=${id}): already patched, no change`);
      summary.alreadyPatched++;
      continue;
    }
    console.log(`  ${slug} (id=${id}): hero region not matched; skipping`);
    summary.notFound++;
    continue;
  }
  const after = before.replace(re, newHeroBlock);

  const php = `wp_update_post(['ID'=>${id},'post_content'=>wp_slash(${phpStr(after)})]); echo 'OK';`;
  wp(['eval', php]);
  console.log(`  ${slug} (id=${id}): patched (before=${before.length} after=${after.length})`);
  summary.patched++;
}

console.log(`\nDone: patched=${summary.patched} alreadyPatched=${summary.alreadyPatched} notFound=${summary.notFound}`);
