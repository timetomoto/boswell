#!/usr/bin/env node
// scripts/dev/a11y-axe.mjs
//
// Automated axe-core sweep across the 14 representative page types at
// 1440 and 390. Keep this script in-tree so a content push doesn't
// regress what we fixed in the a11y-remediation branch.
//
// Writes a plain-text summary (grouped by rule, then per-page) to stdout.
// Pass `--json` to get the full violation payload instead.
//
// Required: axe-core already in node_modules (it is — see package.json).

import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const AXE_SRC = readFileSync(resolve('node_modules/axe-core/axe.min.js'), 'utf8');
const WANT_JSON = process.argv.includes('--json');

const PAGES = [
	['home',          '/'],
	['sisters-hub',   '/sisters/'],
	['sister-bio',    '/sisters/connee/'],
	['career-tl',     '/sisters/career-timeline/'],
	['media-hub',     '/media/'],
	['lesson',        '/media/lessons/lesson-1/'],
	['charts',        '/media/charts/'],
	['discography',   '/media/discography/'],
	['press-hub',     '/press/'],
	['press-sub',     '/press/vintage/'],
	['video-article', '/media/video/alexanders-ragtime-band/'],
	['contact',       '/contact/'],
	['privacy',       '/privacy-policy/'],
	['404',           '/__nonexistent__/'],
];

const b = await chromium.launch({ executablePath: CHROME, headless: true });
const results = {};

for (const vw of [1440, 390]) {
	const c = await b.newContext({ viewport: { width: vw, height: 900 } });
	const p = await c.newPage();
	for (const [key, path] of PAGES) {
		const slot = `${key}@${vw}`;
		try {
			await p.goto('http://localhost:8888' + path, { waitUntil: 'networkidle', timeout: 60000 });
			await p.addScriptTag({ content: AXE_SRC });
			const axe = await p.evaluate(async () => {
				/* global axe */
				const r = await axe.run({
					runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] },
					resultTypes: ['violations'],
				});
				return r.violations.map((v) => ({
					id: v.id,
					impact: v.impact,
					count: v.nodes.length,
					help: v.help,
					wcag: v.tags.filter((t) => t.startsWith('wcag')),
					sample: v.nodes.slice(0, 2).map((n) => ({
						target: n.target.join(' '),
						html: (n.html || '').slice(0, 180),
					})),
				}));
			});
			results[slot] = axe;
		} catch (e) {
			results[slot] = { error: String(e.message || e).slice(0, 200) };
		}
	}
	await c.close();
}
await b.close();

if (WANT_JSON) {
	console.log(JSON.stringify(results, null, 2));
	process.exit(0);
}

// Text summary
const byRule = {};
for (const slot of Object.keys(results)) {
	const vs = results[slot];
	if (vs.error) continue;
	for (const v of vs) {
		if (!byRule[v.id]) byRule[v.id] = { impact: v.impact, count: 0, slots: new Set(), help: v.help, wcag: v.wcag.join(',') };
		byRule[v.id].count += v.count;
		byRule[v.id].slots.add(slot);
	}
}

console.log('\n=== Violations grouped by rule ===');
const sorted = Object.entries(byRule).sort((a, b) => b[1].count - a[1].count);
for (const [rule, info] of sorted) {
	console.log(`${rule.padEnd(32)} | imp=${(info.impact || '').padEnd(8)} | hits=${String(info.count).padStart(4)} | slots=${info.slots.size} | wcag=${info.wcag}`);
	console.log(`     ${info.help}`);
}

console.log('\n=== Per-page violations ===');
for (const slot of Object.keys(results)) {
	const vs = results[slot];
	if (vs.error) { console.log(slot.padEnd(25), 'ERROR'); continue; }
	console.log(slot.padEnd(25), vs.map((v) => `${v.id}(${v.count})`).join(', ') || '(clean)');
}

const totalCount = Object.values(byRule).reduce((n, r) => n + r.count, 0);
console.log(`\nTotal violation nodes: ${totalCount}`);
process.exit(totalCount === 0 ? 0 : 1);
