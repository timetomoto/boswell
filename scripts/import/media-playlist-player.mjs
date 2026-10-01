#!/usr/bin/env node
// scripts/import/media-playlist-player.mjs
//
// Replace the "[Playlist player: interactive block pending]" placeholder on
// /media/ (post 9) with a real bozzies/playlist-player block using the same
// 26-track volume-one playlist that already lives on /home/ (post 39) —
// Astro picks `featuredPlaylist = playlists[0]` on both pages, so they share
// the same tracks.
//
// Then search every published post for other "interactive block pending"
// leftovers and warn (none expected after the home playlist / quotes
// carousel / timeline / discography commits).
//
// Idempotent: aborts if /media/ no longer has the placeholder.

import { wp } from './lib.mjs';

function phpStr(s) {
	return `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

function getPostContent(id) {
	return wp(['post', 'get', String(id), '--field=post_content']);
}

function setPostContent(id, content) {
	const php = `wp_update_post(['ID'=>${id},'post_content'=>wp_slash(${phpStr(content)})]); echo 'OK';`;
	wp(['eval', php]);
}

// 1. Extract the playlist-player block from /home/.
const home = getPostContent(39);
const playerRe = /<!-- wp:bozzies\/playlist-player \{"tracks":\[[\s\S]*?\]\} \/-->/;
const match = home.match(playerRe);
if (!match) {
	throw new Error('No bozzies/playlist-player block on /home/; cannot copy to /media/.');
}
const playerBlock = match[0];
console.log(`playlist-player block: ${playerBlock.length} bytes`);

// 2. Patch /media/.
const media = getPostContent(9);
const placeholderRe = /<!-- wp:paragraph \{"align":"center"\} --><p class="has-text-align-center">\[Playlist player: interactive block pending\]<\/p><!-- \/wp:paragraph -->/;
if (!placeholderRe.test(media)) {
	console.log('/media/ no longer has the placeholder — nothing to do.');
	// Still run the sweep below.
} else {
	const after = media.replace(placeholderRe, playerBlock);
	setPostContent(9, after);
	console.log(`/media/ patched: ${media.length} → ${after.length} bytes`);
}

// 3. Sweep every published post for other "interactive block pending" leftovers.
const sweep = wp([
	'db',
	'query',
	"SELECT ID, post_title, post_type FROM wp_posts WHERE post_status='publish' AND post_content LIKE '%interactive block pending%'",
	'--skip-column-names',
]);
const leftovers = sweep
	.split('\n')
	.map((l) => l.trim())
	.filter((l) => l && !l.startsWith('ℹ') && !l.startsWith('✔'));

if (leftovers.length) {
	console.log(`\nWARN: ${leftovers.length} other post(s) still contain "interactive block pending":`);
	for (const l of leftovers) console.log(`  ${l}`);
} else {
	console.log('\nNo other "interactive block pending" leftovers on published posts.');
}
