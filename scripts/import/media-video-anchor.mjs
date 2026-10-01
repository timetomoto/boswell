#!/usr/bin/env node
// scripts/import/media-video-anchor.mjs
//
// Follow-up to the "remove /media/video/ archive" change:
//
//   - On /media/ (post 9): add anchor:"video" to the bozzies/section that
//     wraps the Video Features head + article list, so the section renders
//     with id="video" and /media/#video jumps straight to it.
//   - On all 10 video-category article posts: swap the hero back link href
//     from /media/video/ to /media/#video.
//   - On /media/'s link that used to be the h2 anchor (already removed in
//     item 1), rewrite any remaining /media/video/ in-content href to the
//     anchor.
//   - Flush rewrite rules (the archive rule in functions.php is gone).
//
// Idempotent.

import { wp } from './lib.mjs';

function phpStr(s) {
	return `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

function get(id)        { return wp(['post', 'get', String(id), '--field=post_content']); }
function set(id, text)  { wp(['eval', `wp_update_post(['ID'=>${id},'post_content'=>wp_slash(${phpStr(text)})]); echo 'OK';`]); }

// --- /media/ ----------------------------------------------------------------
console.log('/media/ (id=9)…');
const mediaBefore = get(9);
let mediaAfter    = mediaBefore;

// Add anchor:"video" to the Video Features section wrapper. The current
// serialized attributes are: {"backgroundStyle":"paper","headingWidth":"reading","spacing":"compact","align":"full"}
mediaAfter = mediaAfter.replace(
	'<!-- wp:bozzies/section {"backgroundStyle":"paper","headingWidth":"reading","spacing":"compact","align":"full"} -->\n<!-- wp:paragraph {"align":"center","className":"is-style-eyebrow"} -->\n<p class="is-style-eyebrow has-text-align-center">On Screen</p>',
	'<!-- wp:bozzies/section {"anchor":"video","backgroundStyle":"paper","headingWidth":"reading","spacing":"compact","align":"full"} -->\n<!-- wp:paragraph {"align":"center","className":"is-style-eyebrow"} -->\n<p class="is-style-eyebrow has-text-align-center">On Screen</p>'
);

if (mediaAfter === mediaBefore) {
	console.log('  no change (already anchored or Video section not found)');
} else {
	set(9, mediaAfter);
	console.log(`  updated (${mediaBefore.length} → ${mediaAfter.length} bytes)`);
}

// --- 10 video article posts -------------------------------------------------
const VIDEO_POST_IDS = [117, 118, 119, 120, 121, 122, 123, 124, 125, 126];
let touched = 0;
for (const id of VIDEO_POST_IDS) {
	const before = get(id);
	let after = before
		.replace(
			/<a href="\/media\/video\/">← Media &middot; Video<\/a>/g,
			'<a href="/media/#video">← Media &middot; Video</a>'
		)
		.replace(
			/<a href="\/media\/video\/">See more video features<\/a>/g,
			'<a href="/media/#video">See more video features</a>'
		);
	if (after !== before) {
		set(id, after);
		touched++;
		console.log(`  article id=${id} patched (${before.length} → ${after.length})`);
	} else {
		console.log(`  article id=${id} already anchored`);
	}
}
console.log(`articles patched: ${touched}/${VIDEO_POST_IDS.length}`);

// --- rewrites ---------------------------------------------------------------
console.log('\nflushing rewrite rules…');
wp(['rewrite', 'flush']);

console.log('done');
