#!/usr/bin/env node
// scripts/import/photo-hero-recanonicalize.mjs
//
// One-shot patcher: rewrite the photo-hero bozzies/section block at the top
// of /about/, /sisters/, /media/, /press/, and the /lessons/ hub so its
// serialized markup matches Gutenberg's canonical output byte-for-byte.
//
// Symptom the patcher fixes: opening any of these pages in the editor and
// saving with no changes reserializes the block (drops default-valued
// attributes, reorders remaining ones into block.json order, rewraps inner
// block markup onto multiple lines). Once patched, `savePost()` is a no-op.
//
// The new heroPhoto() emitter in lib.mjs already produces canonical form; a
// full re-import would achieve the same result but touches far more content.

import { wp, heroPhoto } from './lib.mjs';

const HEROES = [
  {
    slug: 'sisters',
    title: 'The Sisters',
    subtitle:
      'Get to know the Boswell Sisters — Martha at the piano, Connee out front, Vet in the middle.',
  },
  {
    slug: 'about',
    eyebrow: 'Our Mission',
    title: 'About',
    subtitle:
      'A tribute archive to the New Orleans trio who invented swinging close-harmony.',
  },
  {
    slug: 'media',
    title: 'Media',
    subtitle:
      'A curated playlist, five audio lessons on the Boswell sound, and chart positions and reviews that recognized them.',
  },
  {
    slug: 'lessons',
    eyebrow: 'Audio Lessons',
    title: 'Lessons',
    subtitle: 'Five keys to the Boswell sound, narrated by Cynthia Lucas.',
  },
  {
    slug: 'press',
    title: 'Press',
    subtitle:
      'A century of writing on the Boswells — vintage newspaper pieces, modern press releases, interviews, and video features.',
  },
];

function findPageId(slug) {
  const out = wp(
    ['post', 'list', '--post_type=page', `--name=${slug}`, '--fields=ID', '--format=ids'],
    { allowFail: true }
  );
  if (!out) return null;
  const id = parseInt(out.split(/\s+/)[0], 10);
  return Number.isFinite(id) ? id : null;
}

// Pull the backgroundImage object out of the existing hero block so the
// patcher does not depend on media-import helpers or scoped media catalogs.
function extractBgImage(postContent) {
  const m = postContent.match(
    /^<!-- wp:bozzies\/section (\{[\s\S]*?\}) -->/
  );
  if (!m) return null;
  const attrs = JSON.parse(m[1]);
  const bg = attrs.backgroundImage;
  if (!bg || !bg.url) return null;
  return { id: bg.id, url: bg.url, alt: bg.alt || '' };
}

function phpStr(s) {
  return `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

function run() {
  const heroRe =
    /^<!-- wp:bozzies\/section \{"backgroundStyle":"ink"[\s\S]*?<!-- \/wp:bozzies\/section -->/;

  for (const spec of HEROES) {
    const id = findPageId(spec.slug);
    if (!id) throw new Error(`No page with slug "${spec.slug}" found.`);
    console.log(`  ${spec.slug} id=${id}`);

    const before = wp(['post', 'get', String(id), '--field=post_content']);
    console.log(`  before: ${before.length} bytes`);

    if (!heroRe.test(before)) {
      throw new Error(
        `no matching photo-hero block found at top of ${spec.slug}; abort.`
      );
    }

    const media = extractBgImage(before);
    if (!media) {
      throw new Error(
        `could not extract backgroundImage from ${spec.slug} hero.`
      );
    }

    const newBlock = heroPhoto({
      media,
      title: spec.title,
      subtitle: spec.subtitle,
      eyebrow: spec.eyebrow,
      credit: spec.credit,
    });

    const after = before.replace(heroRe, newBlock);
    if (after === before) {
      console.log('  identical, no change');
      continue;
    }
    console.log(`  after:  ${after.length} bytes`);

    const php = `wp_update_post(['ID'=>${id},'post_content'=>wp_slash(${phpStr(after)})]); echo 'OK';`;
    wp(['eval', php]);
    console.log('  updated ok');
  }
}

run();
