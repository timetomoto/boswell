#!/usr/bin/env node
// scripts/import/old-bozzies-links.mjs
//
// Repoints old-site bozzies.org URLs embedded in post_content at the new
// article pages when the match is unambiguous. Links we can't match get
// listed in the summary so the owner can decide (either edit by hand,
// import the referenced asset, or drop the link entirely).

import { wp } from './lib.mjs';

const FIXES = [
	// id, oldUrl, newUrl, reason
	{
		id: 107,
		oldUrl: 'http://www.bozzies.org',
		newUrl: '/',
		reason: 'Bare homepage reference in body prose — maps to the new site root.',
	},
	{
		id: 127,
		oldUrl: 'http://bozzies.org/boz-buz-vintage-article-3/',
		newUrl: '/press/vintage/03-visionary-scoring/',
		reason: 'Series continuation ("Continue to Part 2"). Part 2 of the "cats hepped" trio of articles is 03-visionary-scoring ("Part 2: Visionary Scoring Put Boswell\'s Over"), already on the new site.',
	},
];

function phpStr(s) {
	return `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

const changed = [];
const skipped = [];

for (const { id, oldUrl, newUrl, reason } of FIXES) {
	const content = wp(['post', 'get', String(id), '--field=post_content']);
	if ( ! content.includes( oldUrl ) ) {
		skipped.push({ id, oldUrl, note: 'url not present (already patched?)' });
		continue;
	}
	const next = content.split(oldUrl).join(newUrl);
	const php = `wp_update_post(['ID'=>${id},'post_content'=>wp_slash(${phpStr(next)})]); echo 'OK';`;
	wp(['eval', php]);
	changed.push({ id, oldUrl, newUrl, reason });
	console.log(`  patched id=${id}  ${oldUrl} → ${newUrl}`);
}

console.log(`\n${changed.length} link(s) rewritten, ${skipped.length} skipped.`);
if (skipped.length) {
	console.log('\nSkipped:');
	for (const s of skipped) console.log(`  id=${s.id}: ${s.oldUrl}  (${s.note})`);
}
