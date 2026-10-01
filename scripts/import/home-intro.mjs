#!/usr/bin/env node
// scripts/import/home-intro.mjs
//
// One-shot home-page patcher: replace the existing home-intro section
// (bozzies/section wrapping is-style-lede + two article-body paragraphs)
// with a single bozzies/intro-section block. Uses the exact copy from
// Astro's CMS content — introLede + introBody in
// ~/boswell-poc/src/content/pages/home.md L8-15. No introEyebrow on the
// actual home page (Astro's index.astro L42 renders it only if set).
//
// Home doesn't have a full import script yet; this patcher only touches
// the intro region so the ported CSS goes live. Later, a full home.mjs
// will consolidate all home patchers into one.

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

// Values verbatim from ~/boswell-poc/src/content/pages/home.md L8-15.
const introAttrs = {
  anchor: 'home-intro',
  lede: 'The roots of rock and roll literally start here.',
  bodyLead: "Come on in and meet New Orleans' own Boswell Sisters.",
  body:
    "Discover the velvet tones of Connie Boswell — inspiration to singers from Ella Fitzgerald to Wynonna Judd, seller of more than 75 million records, and one of America's greatest voices, delivered entirely from a wheelchair. Whether you're a nonplussed novice or a crusty old jazzbo, you'll be delighted by the sounds and stories of the Boswells.",
};

const newIntroBlock = `<!-- wp:bozzies/intro-section ${gbJson(introAttrs)} /-->`;

function run() {
  const id = findHomeId();
  if (!id) throw new Error(`No page with slug "${HOME_SLUG}" found.`);
  console.log(`  home id=${id}`);

  const before = wp(['post', 'get', String(id), '--field=post_content']);
  console.log(`  before: ${before.length} bytes`);

  const re = /<!-- wp:bozzies\/section \{"anchor":"home-intro"[\s\S]*?<!-- \/wp:bozzies\/section -->/;
  if (!re.test(before)) {
    if (before.includes('wp:bozzies/intro-section')) {
      console.log('  already patched, no change');
      return;
    }
    throw new Error('home-intro section not found in home content; abort.');
  }
  const after = before.replace(re, newIntroBlock);
  console.log(`  after:  ${after.length} bytes`);

  const php = `wp_update_post(['ID'=>${id},'post_content'=>wp_slash(${phpStr(after)})]); echo 'OK';`;
  wp(['eval', php]);
  console.log('  updated ok');
}

function phpStr(s) {
  return `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

run();
