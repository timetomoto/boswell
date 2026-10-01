#!/usr/bin/env node
// scripts/import/head-descriptions.mjs
//
// One-shot patcher: populates `post_excerpt` on every WP page/post and the
// term description on every press-subhub category with the same string
// Astro's Base.astro passes as `description=` on that route. functions.php
// then emits `<meta name="description" content="...">` from those fields,
// matching Astro's Base.astro L20:
//   {description && <meta name="description" content={description} />}
//
// Sources (verbatim from ~/boswell-poc/src):
//
//   /home            content/pages/home.md `.tagline` — NOT present, so no
//                    description is set (Astro emits none).
//   /about           content/pages/about.md `.subtitle`
//   /sisters         content/pages/sisters.md `.subtitle`
//   /sisters/{s}     content/sisters/{s}.md `.pullQuote`
//   /sisters/bio-resources    content/pages/bio-resources.md `.subtitle`
//   /sisters/career-timeline  content/timelines/trio.md `.intro`
//   /media           content/pages/music.md `.subtitle`
//   /media/reviews   content/pages/reviews.md `.subtitle`
//   /media/charts    content/pages/charts.md `.subtitle`
//   /media/discography    literal "Session-by-session discography of the
//                    Boswell Sisters and Connee Boswell." (discography.astro
//                    L24).
//   /media/lessons/lesson-N    content/lessons/lesson-N.md `.summary`
//   /media/lessons   WP-only listing page (Astro has no equivalent) — reuse
//                    music.md's subtitle so its description isn't empty.
//   /press           content/pages/press.md `.subtitle`
//   /press/{cat}     content/press-hubs/{cat}.md `.blurb`  (WP term desc)
//   /press/{cat}/{s} content/articles/{s}.md `.pullQuote`
//
// Idempotent — safe to re-run.

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { load } from 'js-yaml';
import { wp } from './lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASTRO_ROOT = resolve(__dirname, '../../../boswell-poc/src/content');

function readFrontmatter(rel) {
  const src = readFileSync(resolve(ASTRO_ROOT, rel), 'utf8');
  const m = src.match(/^---\n([\s\S]*?)\n---/);
  if (!m) throw new Error(`${rel}: no frontmatter`);
  return load(m[1]) || {};
}

function phpStr(s) {
  return `'${String(s ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

// Set post_excerpt on a page/post identified by slug. Passing an empty
// string clears any previous value (so `home` stays empty like Astro).
function setPostExcerptBySlug(postType, slug, excerpt, { silent = false } = {}) {
  const out = wp([
    'post', 'list', `--post_type=${postType}`, `--name=${slug}`,
    '--fields=ID', '--format=ids',
  ], { allowFail: true });
  const id = parseInt(out.split(/\s+/)[0], 10);
  if (!Number.isFinite(id)) {
    if (!silent) console.warn(`skip: no ${postType} with slug=${slug}`);
    return { slug, id: null, set: false };
  }
  wp(['eval',
    `wp_update_post(['ID'=>${id},'post_excerpt'=>${phpStr(excerpt)}]); echo 'OK';`
  ]);
  return { slug, id, set: true, excerpt };
}

function setTermDescriptionBySlug(taxonomy, slug, description) {
  const out = wp([
    'term', 'list', taxonomy, `--slug=${slug}`,
    '--fields=term_id', '--format=ids',
  ], { allowFail: true });
  const id = parseInt(out.split(/\s+/)[0], 10);
  if (!Number.isFinite(id)) {
    console.warn(`skip: no ${taxonomy} term with slug=${slug}`);
    return { slug, id: null, set: false };
  }
  wp(['term', 'update', taxonomy, String(id), `--description=${description}`]);
  return { slug, id, set: true, description };
}

const results = [];

// --- Pages ------------------------------------------------------------------

const pageMap = [
  // Astro home passes `data.tagline`, which home.md doesn't define — so no
  // description is emitted. Clear post_excerpt for parity.
  { slug: 'home', excerpt: '' },
  { slug: 'about',           excerpt: readFrontmatter('pages/about.md').subtitle },
  { slug: 'sisters',         excerpt: readFrontmatter('pages/sisters.md').subtitle },
  { slug: 'bio-resources',   excerpt: readFrontmatter('pages/bio-resources.md').subtitle },
  { slug: 'career-timeline', excerpt: readFrontmatter('timelines/trio.md').intro },
  { slug: 'media',           excerpt: readFrontmatter('pages/music.md').subtitle },
  { slug: 'lessons',         excerpt: readFrontmatter('pages/music.md').subtitle }, // no Astro equivalent — reuse music.md subtitle
  { slug: 'reviews',         excerpt: readFrontmatter('pages/reviews.md').subtitle },
  { slug: 'charts',          excerpt: readFrontmatter('pages/charts.md').subtitle },
  { slug: 'discography',     excerpt: 'Session-by-session discography of the Boswell Sisters and Connee Boswell.' },
  { slug: 'press',           excerpt: readFrontmatter('pages/press.md').subtitle },
  { slug: 'connee',          excerpt: readFrontmatter('sisters/connee.md').pullQuote },
  { slug: 'martha',          excerpt: readFrontmatter('sisters/martha.md').pullQuote },
  { slug: 'vet',             excerpt: readFrontmatter('sisters/vet.md').pullQuote },
];
// Lesson pages 1..5
for (let n = 1; n <= 5; n++) {
  pageMap.push({
    slug: `lesson-${n}`,
    excerpt: readFrontmatter(`lessons/lesson-${n}.md`).summary,
  });
}

for (const { slug, excerpt } of pageMap) {
  results.push(setPostExcerptBySlug('page', slug, excerpt || ''));
}

// --- Press subhub categories -----------------------------------------------

const hubDir = resolve(ASTRO_ROOT, 'press-hubs');
for (const file of readdirSync(hubDir)) {
  if (!file.endsWith('.md')) continue;
  const data = readFrontmatter(`press-hubs/${file}`);
  const slug = data.slug || file.replace(/\.md$/, '');
  results.push(setTermDescriptionBySlug('category', slug, data.blurb || ''));
}

// --- Press posts (articles) ------------------------------------------------

// WP article slugs strip the Astro subhub prefix: vintage-02-cats-hepped.md
// becomes 02-cats-hepped, feature-home-at-last.md becomes home-at-last, etc.
// Try the exact filename slug first, then the prefix-stripped variant.
const KNOWN_PREFIXES = ['vintage-', 'feature-', 'essay-', 'interview-', 'video-'];
const artDir = resolve(ASTRO_ROOT, 'articles');
for (const file of readdirSync(artDir)) {
  if (!file.endsWith('.md')) continue;
  const data = readFrontmatter(`articles/${file}`);
  const excerpt = data.pullQuote || '';
  const fileSlug = file.replace(/\.md$/, '');
  const candidates = [fileSlug];
  for (const p of KNOWN_PREFIXES) {
    if (fileSlug.startsWith(p)) candidates.push(fileSlug.slice(p.length));
  }
  let done = false;
  for (let i = 0; i < candidates.length && !done; i++) {
    // Only surface a warning on the last candidate.
    const silent = i < candidates.length - 1;
    const r = setPostExcerptBySlug('post', candidates[i], excerpt, { silent });
    if (r.set) { results.push(r); done = true; }
  }
  if (!done) {
    results.push({ slug: fileSlug, id: null, set: false });
  }
}

// --- Report ----------------------------------------------------------------

const set = results.filter((r) => r.set).length;
const skipped = results.filter((r) => !r.set).length;
console.log(`\nhead-descriptions: ${set} updated, ${skipped} skipped`);
