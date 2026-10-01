#!/usr/bin/env node
// scripts/import/move-video-to-media.mjs
//
// One-shot content patcher for the Video-features move from /press/video/ to
// /media/video/. Rewrites post_content on:
//
//   - 10 video-category article posts (hero back link + "See more video
//     features" body link);
//   - /press/ hub page (id=8): removes the Video Features subhub section
//     + updates the hero subtitle to drop "and video features";
//   - /media/ hub page (id=9): inserts a Video Features subhub section
//     (same markup pattern as the press subhubs) between the lesson-cards
//     and the music-teasers rail.
//
// Idempotent: each rewrite checks whether the current content already
// reflects the move before touching anything.
//
// Needs to run after `functions.php` adds the /media/video/ rewrite rules
// and the post_link/term_link filters — otherwise the Query loop on /media/
// renders article titles that would still point at /press/video/{slug}/.

import { wp } from './lib.mjs';

function getPostContent(id) {
	return wp(['post', 'get', String(id), '--field=post_content']);
}

function setPostContent(id, content) {
	// Via wp_update_post + wp_slash so Gutenberg comment delimiters survive.
	const php = `wp_update_post(['ID'=>${id},'post_content'=>wp_slash(${phpStr(content)})]); echo 'OK';`;
	wp(['eval', php]);
}

function phpStr(s) {
	return `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

// 1. Video articles — ids known via `wp post list --category=video`.
const VIDEO_POST_IDS = [117, 118, 119, 120, 121, 122, 123, 124, 125, 126];
let articlesChanged = 0;
for (const id of VIDEO_POST_IDS) {
	const before = getPostContent(id);
	let after = before
		.replace(
			/<a href="\/press\/video\/">← Press &middot; Video Features<\/a>/g,
			'<a href="/media/video/">← Media &middot; Video</a>'
		)
		.replace(
			/<a href="\/press\/video\/">See more video features<\/a>/g,
			'<a href="/media/video/">See more video features</a>'
		);
	if (after !== before) {
		setPostContent(id, after);
		articlesChanged++;
		console.log(`  patched article id=${id} (bytes ${before.length} → ${after.length})`);
	} else {
		console.log(`  article id=${id} already patched`);
	}
}
console.log(`\narticles: ${articlesChanged}/${VIDEO_POST_IDS.length} patched\n`);

// 2. /press/ page (id=8) — drop Video section + update hero subtitle.
console.log('/press/ (id=8)…');
const pressBefore = getPostContent(8);
let pressAfter = pressBefore;

// Remove the entire Video Features subhub section. It starts with
// `<!-- wp:bozzies/section …On Screen…` and ends with `<!-- /wp:bozzies/section -->`.
// Use a non-greedy regex anchored on the "On Screen" eyebrow and the next
// closing section delimiter.
const videoSectionRe = /<!-- wp:bozzies\/section [^>]*-->\s*<!-- wp:paragraph [^>]*-->\s*<p class="is-style-eyebrow">On Screen<\/p>[\s\S]*?<!-- \/wp:bozzies\/section -->\s*\n*/;
if (videoSectionRe.test(pressAfter)) {
	pressAfter = pressAfter.replace(videoSectionRe, '');
	console.log('  removed Video Features section');
} else {
	console.log('  Video Features section already gone');
}

// Hero subtitle: drop ", and video features".
pressAfter = pressAfter.replace(
	', interviews, and video features\\.',
	', and interviews.'
);
pressAfter = pressAfter.replace(
	', interviews, and video features.',
	', and interviews.'
);

if (pressAfter !== pressBefore) {
	setPostContent(8, pressAfter);
	console.log(`  updated /press/ (bytes ${pressBefore.length} → ${pressAfter.length})`);
} else {
	console.log('  /press/ already up to date');
}

// 3. /media/ page (id=9) — add Video Features subhub section.
console.log('\n/media/ (id=9)…');
const mediaBefore = getPostContent(9);

// Determine the video category term id.
const videoTermId = parseInt(
	wp(['term', 'list', 'category', '--slug=video', '--fields=term_id', '--format=ids'], { allowFail: true }).trim(),
	10
);
console.log(`  video term id=${videoTermId}`);

const queryAttrs = {
	queryId: 100 + videoTermId,
	query: {
		perPage: 100, pages: 0, offset: 0,
		postType: 'post',
		order: 'asc', orderBy: 'menu_order',
		author: '', search: '', exclude: [],
		sticky: '', inherit: false, parents: [],
		taxQuery: { category: [videoTermId] },
	},
};
const videoSection = `<!-- wp:bozzies/section {"backgroundStyle":"paper","headingWidth":"reading","spacing":"compact","align":"full"} -->
<!-- wp:paragraph {"className":"is-style-eyebrow"} -->
<p class="is-style-eyebrow">On Screen</p>
<!-- /wp:paragraph -->

<!-- wp:heading {"fontSize":"section-title-medium"} -->
<h2 class="wp-block-heading has-section-title-medium-font-size"><a href="/media/video/">Video Features</a></h2>
<!-- /wp:heading -->

<!-- wp:paragraph {"className":"bozzies-para-body"} -->
<p class="bozzies-para-body">Documentaries and video essays about the Boswell sound.</p>
<!-- /wp:paragraph -->

<!-- wp:query ${JSON.stringify(queryAttrs)} -->
<div class="wp-block-query">
<!-- wp:post-template {"className":"bozzies-article-list"} -->
<!-- wp:group {"className":"bozzies-article-row","layout":{"type":"default"}} -->
<div class="wp-block-group bozzies-article-row">
<!-- wp:post-title {"isLink":true,"level":3,"className":"bozzies-article-row__title"} /-->
<!-- wp:paragraph {"className":"is-style-eyebrow bozzies-article-row__meta","metadata":{"bindings":{"content":{"source":"bozzies/article-meta"}}}} -->
<p class="is-style-eyebrow bozzies-article-row__meta"></p>
<!-- /wp:paragraph -->
</div>
<!-- /wp:group -->
<!-- /wp:post-template -->
</div>
<!-- /wp:query -->
<!-- /wp:bozzies/section -->

<!-- wp:bozzies/divider /-->`;

// Idempotent check — only insert if "On Screen" isn't already on /media/.
if (mediaBefore.includes('>On Screen<')) {
	console.log('  Video section already present');
} else {
	// Insert before the music-teasers block (before `<!-- wp:bozzies/music-teasers`).
	const insertRe = /(<!-- wp:bozzies\/music-teasers\b)/;
	if (!insertRe.test(mediaBefore)) {
		throw new Error('music-teasers block not found on /media/ — cannot determine insertion point');
	}
	const mediaAfter = mediaBefore.replace(insertRe, `${videoSection}\n\n$1`);
	setPostContent(9, mediaAfter);
	console.log(`  inserted Video section (bytes ${mediaBefore.length} → ${mediaAfter.length})`);
}

// 4. Flush rewrite rules so the new /media/video/* routes activate.
console.log('\nflushing rewrite rules…');
wp(['rewrite', 'flush']);

console.log('\ndone');
