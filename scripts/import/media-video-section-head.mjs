#!/usr/bin/env node
// scripts/import/media-video-section-head.mjs
//
// Patch the Video Features section head on /media/ (post 9):
//   - Remove the <a href="/media/video/"> wrapper so "Video Features" is a
//     plain heading, not a link.
//   - Center the eyebrow, h2, and description paragraph (textAlign:center
//     on blocks that support it, align:center on the eyebrow paragraph,
//     + "has-text-align-center" class on the rendered output).
//
// Idempotent: aborts if no "Video Features" h2 is present on /media/.

import { wp } from './lib.mjs';

function phpStr(s) {
	return `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

const before = wp(['post', 'get', '9', '--field=post_content']);

let after = before;

// 1. Eyebrow: add align:center on the block attrs + has-text-align-center class.
after = after.replace(
	/<!-- wp:paragraph \{"className":"is-style-eyebrow"\} -->\s*<p class="is-style-eyebrow">On Screen<\/p>\s*<!-- \/wp:paragraph -->/,
	'<!-- wp:paragraph {"align":"center","className":"is-style-eyebrow"} -->\n<p class="is-style-eyebrow has-text-align-center">On Screen</p>\n<!-- /wp:paragraph -->'
);

// 2. Heading: strip <a>, add textAlign:center + has-text-align-center.
after = after.replace(
	/<!-- wp:heading \{"fontSize":"section-title-medium"\} -->\s*<h2 class="wp-block-heading has-section-title-medium-font-size"><a href="\/media\/video\/">Video Features<\/a><\/h2>\s*<!-- \/wp:heading -->/,
	'<!-- wp:heading {"textAlign":"center","fontSize":"section-title-medium"} -->\n<h2 class="wp-block-heading has-text-align-center has-section-title-medium-font-size">Video Features</h2>\n<!-- /wp:heading -->'
);

// 3. Description paragraph: add align:center.
after = after.replace(
	/<!-- wp:paragraph \{"className":"bozzies-para-body"\} -->\s*<p class="bozzies-para-body">Documentaries and video essays about the Boswell sound\.<\/p>\s*<!-- \/wp:paragraph -->/,
	'<!-- wp:paragraph {"align":"center","className":"bozzies-para-body"} -->\n<p class="bozzies-para-body has-text-align-center">Documentaries and video essays about the Boswell sound.</p>\n<!-- /wp:paragraph -->'
);

if (after === before) {
	console.log('No changes — /media/ Video section head already matches.');
	process.exit(0);
}

const php = `wp_update_post(['ID'=>9,'post_content'=>wp_slash(${phpStr(after)})]); echo 'OK';`;
wp(['eval', php]);
console.log(`Updated /media/ (bytes ${before.length} → ${after.length})`);
