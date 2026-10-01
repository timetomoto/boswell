#!/usr/bin/env node
// scripts/import/sisters-center-head.mjs
//
// Center the "Meet the Sisters" / "Martha, Connie and Vet" section head on
// /sisters/ (post 7). The eyebrow (p.is-style-eyebrow.sisters-grid__eyebrow)
// gets align:center + has-text-align-center; the h2 title gets textAlign:
// center + has-text-align-center. Text copy unchanged. Idempotent.

import { wp } from './lib.mjs';

function phpStr(s) {
	return `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

const before = wp(['post', 'get', '7', '--field=post_content']);
let after = before;

// Eyebrow.
after = after.replace(
	/<!-- wp:paragraph \{"className":"is-style-eyebrow sisters-grid__eyebrow"\} --><p class="is-style-eyebrow sisters-grid__eyebrow">Meet the Sisters<\/p><!-- \/wp:paragraph -->/,
	'<!-- wp:paragraph {"align":"center","className":"is-style-eyebrow sisters-grid__eyebrow"} --><p class="is-style-eyebrow sisters-grid__eyebrow has-text-align-center">Meet the Sisters</p><!-- /wp:paragraph -->'
);

// H2 title.
after = after.replace(
	/<!-- wp:heading \{"level":2,"fontSize":"section-title"\} --><h2 class="wp-block-heading has-section-title-font-size">Martha, Connie and Vet<\/h2><!-- \/wp:heading -->/,
	'<!-- wp:heading {"textAlign":"center","level":2,"fontSize":"section-title"} --><h2 class="wp-block-heading has-text-align-center has-section-title-font-size">Martha, Connie and Vet</h2><!-- /wp:heading -->'
);

if (after === before) {
	console.log('No changes — /sisters/ head already centered.');
	process.exit(0);
}

const php = `wp_update_post(['ID'=>7,'post_content'=>wp_slash(${phpStr(after)})]); echo 'OK';`;
wp(['eval', php]);
console.log(`Updated /sisters/ (bytes ${before.length} → ${after.length})`);
