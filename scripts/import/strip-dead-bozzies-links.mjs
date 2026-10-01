#!/usr/bin/env node
// scripts/import/strip-dead-bozzies-links.mjs
//
// Unwraps two old-site anchors that have no replacement URL on the new
// site. We keep the human-readable text so the sentence still reads
// naturally — just drop the `<a href>` wrapper around it.
//
//   home-at-last    (id=106) : "Boswell Sisters Centennial" link to
//                              http://bozzies.org/centennial-celebration-recap/
//   steely-bozzies  (id=113) : "Boz Buys" link to
//                              http://bozzies.org/bozbuys/
//
// Idempotent on both: if the anchor is already gone the script no-ops.

import { wp } from './lib.mjs';

function phpStr(s) {
	return `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

const FIXES = [
	{
		id: 106,
		match: '<a href="http://bozzies.org/centennial-celebration-recap/">Boswell Sisters Centennial</a>',
		replace: 'Boswell Sisters Centennial',
	},
	{
		id: 113,
		match: '<a href="http://bozzies.org/bozbuys/">Boz Buys</a>',
		replace: 'Boz Buys',
	},
];

for (const { id, match, replace } of FIXES) {
	const content = wp(['post', 'get', String(id), '--field=post_content']);
	if (!content.includes(match)) {
		console.log(`  id=${id}: anchor already removed, skipping`);
		continue;
	}
	const next = content.split(match).join(replace);
	wp(['eval', `wp_update_post(['ID'=>${id},'post_content'=>wp_slash(${phpStr(next)})]); echo 'OK';`]);
	console.log(`  id=${id}: unwrapped "${replace}" (dropped <a href>)`);
}
