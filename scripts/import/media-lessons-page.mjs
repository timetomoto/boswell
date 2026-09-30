#!/usr/bin/env node
/**
 * One-shot: rewrite /media/lessons/ (page id 23) so it no longer emits the
 * legacy `bozzies/section + is-style-card` grid. Astro has no route at
 * `/media/lessons/` — the WP page exists only as a URL parent for the 5
 * `/media/lessons/lesson-N/` child pages. Replace its body with a photo
 * hero (already correct) + a `bozzies/lesson-cards` block matching the
 * one on /media/, so any accidental visit to /media/lessons/ still looks
 * on-brand.
 */
import { execFileSync } from 'node:child_process';

const wpcli = (args, opts = {}) =>
  execFileSync('npx', ['wp-env', 'run', 'cli', '--env-cwd=/var/www/html', 'wp', ...args], {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'inherit'],
    ...opts,
  });

const wpQuery = (sql) => {
  const out = execFileSync('npx', ['wp-env', 'run', 'cli', '--env-cwd=/var/www/html', 'wp', 'db', 'query', sql, '--skip-column-names'], {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'inherit'],
  });
  return out.trimEnd();
};

const escapeSql = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "''");

// Astro copy verbatim from ~/boswell-poc/src/pages/media/index.astro L65-96 and
// ~/boswell-poc/src/content/lessons/lesson-N.md frontmatter.
const LESSON_CARDS = `<!-- wp:bozzies/lesson-cards {"eyebrow":"Audio Lessons","title":"Five keys to the Boswell sound","lede":"Cynthia Lucas, one of the best-known Boz historians, narrates five audio lessons that unpack how the Sisters actually did what they did."} -->
<!-- wp:bozzies/lesson-card {"order":1,"title":"The Blend","summary":"Cynthia Lucas walks through the first, and most immediately recognizable, element of the Boswell Sound: three sisters singing so closely blended that they sometimes read as one voice.","href":"/media/lessons/lesson-1/"} /-->
<!-- wp:bozzies/lesson-card {"order":2,"title":"The Tempo","summary":"The Boswells' signature four-to-five tempo shifts within a single arrangement, executed with the kind of precision that most trios would never even attempt.","href":"/media/lessons/lesson-2/"} /-->
<!-- wp:bozzies/lesson-card {"order":3,"title":"The Riffs","summary":"The instrumental-style rhythmic figures the Boswells pulled off with their voices — riffs that would sound at home coming out of a horn section.","href":"/media/lessons/lesson-3/"} /-->
<!-- wp:bozzies/lesson-card {"order":4,"title":"Melody? Words? Who Needs ’Em!","summary":"What happens when the Boswells decide the melody as written is only a starting point — reharmonizations, unexpected returns to the verse, lyrics rendered in something resembling pig Latin.","href":"/media/lessons/lesson-4/"} /-->
<!-- wp:bozzies/lesson-card {"order":5,"title":"Scatting, Hand Trumpets, Gibberish and Gulling","summary":"The Boswell bag of tricks — scat lines, hand trumpets, blues refrains, gulling, and whatever else they felt like throwing into an arrangement.","href":"/media/lessons/lesson-5/"} /-->
<!-- /wp:bozzies/lesson-cards -->`;

const pageId = 23;
const before = wpcli(['post', 'get', String(pageId), '--field=content']);
const beforeBytes = Buffer.byteLength(before, 'utf8');

// Keep the first block (the bozzies/section photo hero); replace the rest.
const heroMatch = before.match(/^<!-- wp:bozzies\/section [\s\S]*?<!-- \/wp:bozzies\/section -->/);
if (!heroMatch) {
  console.error(`No photo-hero found on /media/lessons/ — bailing`);
  process.exit(1);
}
const hero = heroMatch[0];
const nextBody = `${hero}\n\n${LESSON_CARDS}\n`;

if (nextBody === before) {
  console.log(`/media/lessons/ already canonical (before=${beforeBytes} unchanged).`);
  process.exit(0);
}

const afterBytes = Buffer.byteLength(nextBody, 'utf8');
const sql = `UPDATE wp_posts SET post_content='${escapeSql(nextBody)}' WHERE ID=${pageId}`;
wpQuery(sql);

console.log(`/media/lessons/ (id=${pageId}) rewritten: before=${beforeBytes} after=${afterBytes} bytes.`);
