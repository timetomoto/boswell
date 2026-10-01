#!/usr/bin/env node
// scripts/import/vet-tarto-aura-part-2.mjs
//
// Imports Part 2 of the "Vet, Tarto, Aura" series.
//
// Part 1 (post 115, "A Conversation with Vet Boswell") ends with
//   <a href="http://bozzies.org/boz-buz-vet-tarto-aura-part-2/">
//     Listen to the Recording and Read a Letter from Joe Tarto >>
//   </a>
// That old URL 404s now. Part 2 was never carried over to Astro or the
// new WordPress site — it only lives on the pre-WP flat-PHP build of
// bozzies.org (joe-tarto-bozpod.php, labeled "Boz Buz - Vet, Tarto,
// Aura - Part 2 — The Recording and the Letter") in the Dreamhost
// backup.
//
// This script:
//   1. Pulls two attachments out of the backup — Joe Tarto's recorded
//      phone call (tarto-call.mp3, ~18.5 MB) and a photo of the letter
//      Tarto sent (joe-tarto-letter.jpg).
//   2. Creates a new feature-category post with the Part-1 markup
//      pattern (purple article hero, prose body, article nav back to
//      Part 1).
//   3. Repoints Part 1's trailing "Listen to the Recording…" link to
//      the new /press/feature/vet-tarto-aura-part-2/ permalink.
//
// Idempotent on all three halves.

import { execSync } from 'node:child_process';
import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { wp } from './lib.mjs';

// --- 1. Attachments --------------------------------------------------------

const STAGE = resolve('theme/bozzies/.import-tmp/tarto-part-2');
mkdirSync(STAGE, { recursive: true });

const assets = [
	{
		backup: resolve(process.env.HOME, 'bozzies-dreamhost-backup/bozzies.org/bozphp10/wmpy/tarto-call.mp3'),
		filename: 'tarto-call.mp3',
		title: 'Joe Tarto remembers the Boswell Sisters',
		alt: '',
	},
	{
		backup: resolve(process.env.HOME, 'bozzies-dreamhost-backup/bozzies.org/tartofiles/joe-tarto-letter.jpg'),
		filename: 'joe-tarto-letter.jpg',
		title: 'Joe Tarto letter to Aura Lee',
		alt: 'A letter from Joe Tarto to Aura Lee enclosing answers to her eleven questions about recording with the Boswell Sisters.',
	},
];

function findExistingAttachment(filename) {
	const out = wp([
		'db', 'query',
		`SELECT post_id FROM wp_postmeta WHERE meta_key='_wp_attached_file' AND meta_value LIKE '%/${filename}' LIMIT 1`,
		'--skip-column-names',
	]).trim();
	const id = out.split(/\s+/).find((x) => /^\d+$/.test(x));
	return id ? parseInt(id, 10) : 0;
}

const resolved = {};
for (const a of assets) {
	let id = findExistingAttachment(a.filename);
	if (!id) {
		const staged = resolve(STAGE, a.filename);
		if (!existsSync(staged)) copyFileSync(a.backup, staged);
		const containerPath = `wp-content/themes/bozzies/.import-tmp/tarto-part-2/${a.filename}`;
		const args = [
			'npx', 'wp-env', 'run', 'cli', '--env-cwd=/var/www/html', 'wp',
			'media', 'import', containerPath,
			`--title=${JSON.stringify(a.title)}`,
			'--porcelain',
		];
		if (a.alt) args.push(`--alt=${JSON.stringify(a.alt)}`);
		const porc = execSync(args.join(' '), { encoding: 'utf8', shell: '/bin/bash' }).trim();
		id = parseInt((porc.split(/\s+/).find((x) => /^\d+$/.test(x)) || '0'), 10);
		if (!id) {
			console.error(`media import failed for ${a.filename}:\n${porc}`);
			process.exit(1);
		}
		console.log(`  imported ${a.filename} → attachment ${id}`);
	} else {
		console.log(`  ${a.filename} already in media library at ${id}`);
	}
	const file = wp(['post', 'meta', 'get', String(id), '_wp_attached_file']).trim().split(/\s+/).pop();
	resolved[a.filename] = { id, url: `/wp-content/uploads/${file}` };
}

// --- 2. Post content -------------------------------------------------------
//
// Mirrors Part 1's structure: purple hero + pull quote, paper-ground body
// with real paragraphs, article nav. The hero and nav follow the exact
// shapes group3.mjs emits so the two posts live together coherently.

const audio = resolved['tarto-call.mp3'];
const letter = resolved['joe-tarto-letter.jpg'];

const content = `<!-- wp:bozzies/section {"backgroundStyle":"purple","backdrop":"notes","width":"edge","headingWidth":"container","spacing":"none","align":"full","className":"article-hero"} -->
<!-- wp:group {"className":"container-narrow article-hero__inner","layout":{"type":"default"}} -->
<div class="wp-block-group container-narrow article-hero__inner">
<!-- wp:paragraph {"className":"article-hero__back"} --><p class="article-hero__back"><a href="/press/feature/">← Press &middot; Features</a></p><!-- /wp:paragraph -->
<!-- wp:heading {"level":1,"className":"article-hero__title"} --><h1 class="wp-block-heading article-hero__title">The Recording and the Letter</h1><!-- /wp:heading -->
<!-- wp:paragraph {"className":"article-hero__meta","metadata":{"bindings":{"content":{"source":"bozzies/article-meta"}}}} --><p class="article-hero__meta"></p><!-- /wp:paragraph -->
<!-- wp:quote {"className":"article-hero__quote"} --><blockquote class="wp-block-quote article-hero__quote"><p>Vet was on fire to make sure that the Boswell Sisters music and story be preserved and remembered.</p><cite>— Aura Lee Reoch</cite></blockquote><!-- /wp:quote -->
</div>
<!-- /wp:group -->
<!-- /wp:bozzies/section -->

<!-- wp:bozzies/section {"backgroundStyle":"paper","width":"narrow","headingWidth":"container","align":"full"} -->
<!-- wp:heading {"level":2} --><h2 class="wp-block-heading">By Cynthia Lucas</h2><!-- /wp:heading -->
<!-- wp:paragraph --><p><em>"But, joyously, the conversation remains preserved, as does the answer to eleven questions that Aura had sent to Joe Tarto. Bozzies is honored to share this recording and the answers to those questions to shed further light on the family that existed between the sisters, their fellow musicians, and the family of friends who have worked so hard to be sure that 'they get it right.'"</em></p><!-- /wp:paragraph -->
<!-- wp:paragraph --><p>And here's the recording. Have a listen and enjoy.</p><!-- /wp:paragraph -->
<!-- wp:audio {"id":${audio.id}} --><figure class="wp-block-audio"><audio controls src="${audio.url}"></audio></figure><!-- /wp:audio -->
<!-- wp:paragraph --><p>The letter below from Joe Tarto enclosed the answers to the questions from Aura Lee.</p><!-- /wp:paragraph -->
<!-- wp:image {"id":${letter.id},"sizeSlug":"large","linkDestination":"none","align":"center"} --><figure class="wp-block-image size-large aligncenter"><img src="${letter.url}" alt="A letter from Joe Tarto to Aura Lee enclosing answers to her eleven questions about recording with the Boswell Sisters." class="wp-image-${letter.id}"/></figure><!-- /wp:image -->
<!-- wp:paragraph --><p><a href="/press/feature/vet-tarto-aura-part-1/">&larr;&larr; Back to Part 1: A Conversation with Vet Boswell</a></p><!-- /wp:paragraph -->
<!-- /wp:bozzies/section -->`;

// --- 3. Upsert the post ----------------------------------------------------

function phpStr(s) {
	return `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

const SLUG = 'vet-tarto-aura-part-2';

const existing = wp(['db', 'query',
	`SELECT ID FROM wp_posts WHERE post_type='post' AND post_name='${SLUG}' LIMIT 1`,
	'--skip-column-names']).trim();
const existingId = parseInt((existing.split(/\s+/).find((x) => /^\d+$/.test(x)) || '0'), 10);

let partTwoId;
if (existingId) {
	wp(['eval',
		`wp_update_post(['ID'=>${existingId},'post_content'=>wp_slash(${phpStr(content)})]); echo 'OK';`]);
	partTwoId = existingId;
	console.log(`updated existing part 2 post id=${existingId}`);
} else {
	// Insert under the "feature" category, same date as Part 1 (post 115) so
	// menu-order sorting puts them next to each other on the Features list.
	const part1Date = wp(['post', 'get', '115', '--field=post_date']).trim();
	const php = `
		$id = wp_insert_post([
			'post_type' => 'post',
			'post_name' => '${SLUG}',
			'post_title' => 'Vet, Tarto, Aura — Part 2: The Recording and the Letter',
			'post_status' => 'publish',
			'post_date' => '${part1Date}',
			'post_date_gmt' => '${part1Date}',
			'post_content' => wp_slash(${phpStr(content)}),
		], true);
		if ( is_wp_error( $id ) ) { echo 'ERR: ' . $id->get_error_message(); exit; }
		$cat = get_term_by( 'slug', 'feature', 'category' );
		if ( $cat ) wp_set_post_categories( $id, [ (int) $cat->term_id ] );
		update_post_meta( $id, '_bozzies_pullquote', 'Vet was on fire to make sure that the Boswell Sisters music and story be preserved and remembered.' );
		update_post_meta( $id, '_bozzies_pullquote_attribution', 'Aura Lee Reoch' );
		echo $id;
	`;
	const out = wp(['eval', php]);
	partTwoId = parseInt((out.split(/\s+/).find((x) => /^\d+$/.test(x)) || '0'), 10);
	if (!partTwoId) {
		console.error(`post insert failed: ${out}`);
		process.exit(1);
	}
	console.log(`created part 2 post id=${partTwoId}`);
}

// --- 4. Repoint Part 1's trailing link ------------------------------------

const part1 = wp(['post', 'get', '115', '--field=post_content']);
const oldLink = 'http://bozzies.org/boz-buz-vet-tarto-aura-part-2/';
const newLink = '/press/feature/vet-tarto-aura-part-2/';
if (part1.includes(oldLink)) {
	const patched = part1.split(oldLink).join(newLink);
	wp(['eval', `wp_update_post(['ID'=>115,'post_content'=>wp_slash(${phpStr(patched)})]); echo 'OK';`]);
	console.log(`part 1: repointed ${oldLink} → ${newLink}`);
} else {
	console.log('part 1: already repointed');
}

console.log('\ndone');
