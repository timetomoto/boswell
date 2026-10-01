#!/usr/bin/env node
// scripts/dev/make-block-thumbnails.mjs
//
// Produces the five static block thumbnails for the inserter preview. Uses
// installed Chrome via playwright-core (no browser download).

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const OUT = resolve('theme/bozzies/assets/img/block-previews');
mkdirSync(OUT, { recursive: true });

const SHOTS = [
	{ name: 'playlist-player',   path: '/media/',                selector: '.pp' },
	{ name: 'quotes-carousel',   path: '/',                      selector: '.qc' },
	{ name: 'discography',       path: '/media/discography/',    selector: '.discography-tools .disc-search' },
	{ name: 'lesson-player',     path: '/media/lessons/lesson-1/', selector: '.lesson-player' },
	// Timeline is long. Crop to the first ~500px so the preview file stays
	// small (~1200×500) rather than full-timeline (~5000px tall).
	{ name: 'timeline',          path: '/sisters/connee/',       selector: '.timeline', clipHeight: 500 },
];

const b = await chromium.launch({
	executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
	headless: true,
});

for (const { name, path, selector, clipHeight } of SHOTS) {
	const c = await b.newContext({ viewport: { width: 1200, height: 900 } });
	const p = await c.newPage();
	await p.goto('http://localhost:8888' + path, { waitUntil: 'networkidle', timeout: 60000 });
	await p.waitForSelector(selector, { timeout: 20000 });
	const el = p.locator(selector).first();
	// Scroll into view and give the page a beat so any lazy JS settles.
	await el.scrollIntoViewIfNeeded();
	await p.waitForTimeout(500);
	const file = resolve(OUT, `${name}.png`);
	if (clipHeight) {
		// Scroll the element to the top of the viewport, then clip a page
		// screenshot to its box with a limited height. This avoids the full
		// 5000+px timeline being written to disk.
		await p.evaluate((sel) => {
			const node = document.querySelector(sel);
			if (node) node.scrollIntoView({ block: 'start' });
		}, selector);
		await p.waitForTimeout(300);
		const box = await el.boundingBox();
		const vh = p.viewportSize().height;
		await p.screenshot({
			path: file,
			clip: {
				x: Math.max(0, box.x),
				y: Math.max(0, box.y),
				width: box.width,
				height: Math.min(box.height, clipHeight, vh - box.y),
			},
		});
	} else {
		await el.screenshot({ path: file });
	}
	console.log(`  ${name}.png`);
	await c.close();
}

await b.close();
console.log('done');
