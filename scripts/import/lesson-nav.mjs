#!/usr/bin/env node
// scripts/import/lesson-nav.mjs
//
// One-shot patcher: replace the existing lesson-nav region on all 5 lesson
// pages (a pre-rebuild bozzies/section {backgroundStyle:"paper"…} + wp:columns
// with prev / all / next paragraph pairs) with a single bozzies/lesson-nav
// block. Values are pulled verbatim from ~/boswell-poc/src/content/lessons/
// lesson-N.md frontmatter (order, title), matching Astro's rendering at
// media/lessons/[order].astro L70-85.
//
// Astro hrefs use `/media/lessons/${order}/` but WP page slugs are lesson-N,
// so the hrefs are `/media/lessons/lesson-N/` (matches the pattern already
// used in the pre-rebuild lesson nav copy).

import { wp } from './lib.mjs';
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

// Read all 5 lesson frontmatters up front so we can compute prev/next.
const lessons = [];
for (let n = 1; n <= 5; n++) {
  const fm = parseFrontmatter(readFileSync(`${POC}/src/content/lessons/lesson-${n}.md`, 'utf8'));
  lessons.push({
    slug: `lesson-${n}`,
    order: fm.order || n,
    title: fm.title || '',
  });
}
// Sort by order (matches Astro's L17-19 sort).
lessons.sort((a, b) => a.order - b.order);

const summary = { patched: 0, alreadyPatched: 0, notFound: 0 };

for (let i = 0; i < lessons.length; i++) {
  const cur = lessons[i];
  // Prev / next wrap around, matching Astro L21-22.
  const prev = i > 0 ? lessons[i - 1] : lessons[lessons.length - 1];
  const next = i < lessons.length - 1 ? lessons[i + 1] : lessons[0];

  const attrs = {
    align: 'full',
    prevHref:  `/media/lessons/${prev.slug}/`,
    prevLabel: 'Previous',
    prevName:  `Lesson ${prev.order} · ${prev.title}`,
    allHref:   '/media/',
    allLabel:  'All',
    allName:   'Lessons',
    nextHref:  `/media/lessons/${next.slug}/`,
    nextLabel: 'Next',
    nextName:  `Lesson ${next.order} · ${next.title}`,
    ariaLabel: 'Lessons navigation',
  };
  const newBlock = `<!-- wp:bozzies/lesson-nav ${gbJson(attrs)} /-->`;

  const id = findPageId(cur.slug);
  if (!id) {
    console.log(`  ${cur.slug}: NOT FOUND`);
    summary.notFound++;
    continue;
  }
  const before = wp(['post', 'get', String(id), '--field=post_content']);

  // Match the pre-rebuild lesson-nav region: a bozzies/section wrapping wp:columns
  // with is-style-eyebrow paragraphs. There is only one bozzies/section left on
  // each lesson page at this point (lesson-hero and lesson-player have already
  // been replaced with dedicated blocks).
  const re = /<!-- wp:bozzies\/section \{"backgroundStyle":"paper"[\s\S]*?<!-- \/wp:bozzies\/section -->/;
  if (!re.test(before)) {
    if (before.includes('wp:bozzies/lesson-nav')) {
      console.log(`  ${cur.slug} (id=${id}): already patched, no change`);
      summary.alreadyPatched++;
      continue;
    }
    console.log(`  ${cur.slug} (id=${id}): nav region not matched; skipping`);
    summary.notFound++;
    continue;
  }
  const after = before.replace(re, newBlock);

  const php = `wp_update_post(['ID'=>${id},'post_content'=>wp_slash(${phpStr(after)})]); echo 'OK';`;
  wp(['eval', php]);
  console.log(`  ${cur.slug} (id=${id}): patched (before=${before.length} after=${after.length})`);
  summary.patched++;
}

console.log(`\nDone: patched=${summary.patched} alreadyPatched=${summary.alreadyPatched} notFound=${summary.notFound}`);
