#!/usr/bin/env node
// scripts/import/press-center-heads.mjs
//
// Center the eyebrow / title / description of every section head on /press/
// (post 8). Each of the four subhubs has the same markup pattern — one eyebrow
// paragraph, one section-title-medium h2, one bozzies-para-body paragraph —
// so a global class-targeted rewrite covers them all idempotently.

import { wp } from './lib.mjs';

function phpStr(s) {
	return `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

const before = wp(['post', 'get', '8', '--field=post_content']);

let after = before;

// 1. Eyebrow paragraphs.
after = after.replace(
	/<!-- wp:paragraph \{"className":"is-style-eyebrow"\} -->\s*<p class="is-style-eyebrow">([^<]+)<\/p>\s*<!-- \/wp:paragraph -->/g,
	'<!-- wp:paragraph {"align":"center","className":"is-style-eyebrow"} -->\n<p class="is-style-eyebrow has-text-align-center">$1</p>\n<!-- /wp:paragraph -->'
);

// 2. H2 titles.
after = after.replace(
	/<!-- wp:heading \{"fontSize":"section-title-medium"\} -->\s*<h2 class="wp-block-heading has-section-title-medium-font-size">([^<]+)<\/h2>\s*<!-- \/wp:heading -->/g,
	'<!-- wp:heading {"textAlign":"center","fontSize":"section-title-medium"} -->\n<h2 class="wp-block-heading has-text-align-center has-section-title-medium-font-size">$1</h2>\n<!-- /wp:heading -->'
);

// 3. Blurb paragraphs.
after = after.replace(
	/<!-- wp:paragraph \{"className":"bozzies-para-body"\} -->\s*<p class="bozzies-para-body">([^<]+)<\/p>\s*<!-- \/wp:paragraph -->/g,
	'<!-- wp:paragraph {"align":"center","className":"bozzies-para-body"} -->\n<p class="bozzies-para-body has-text-align-center">$1</p>\n<!-- /wp:paragraph -->'
);

if (after === before) {
	console.log('No changes — /press/ already centered.');
	process.exit(0);
}

const php = `wp_update_post(['ID'=>8,'post_content'=>wp_slash(${phpStr(after)})]); echo 'OK';`;
wp(['eval', php]);
console.log(`Updated /press/ (bytes ${before.length} → ${after.length})`);
