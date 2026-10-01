#!/usr/bin/env node
// scripts/dev/render-favicon.mjs
//
// Rasterize theme/bozzies/assets/img/favicon.svg to the PNG sizes WordPress
// generates from a Site Icon upload (16, 32, 48, 96, 192, 512), plus the
// 180×180 apple-touch-icon. Uses installed Google Chrome via playwright-core
// (no browser download required).
//
// Run: `node scripts/dev/render-favicon.mjs` — outputs PNGs alongside the SVG.

import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..', '..');
const svgPath = resolve(root, 'theme/bozzies/assets/img/favicon.svg');
const outDir = resolve(root, 'theme/bozzies/assets/img');

const svg = readFileSync(svgPath, 'utf8');
const svgB64 = Buffer.from(svg).toString('base64');

const sizes = [
	{ name: 'favicon-16.png', px: 16 },
	{ name: 'favicon-32.png', px: 32 },
	{ name: 'favicon-48.png', px: 48 },
	{ name: 'favicon-96.png', px: 96 },
	{ name: 'favicon-192.png', px: 192 },
	{ name: 'favicon-512.png', px: 512 },
	{ name: 'apple-touch-icon.png', px: 180 },
];

const browser = await chromium.launch({
	executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
	headless: true,
});
const context = await browser.newContext({ deviceScaleFactor: 1 });

for (const { name, px } of sizes) {
	const page = await context.newPage();
	// Fixed-size page with the SVG stretched to fill.
	await page.setViewportSize({ width: px, height: px });
	const html = `<!doctype html><meta charset="utf-8"><style>
		html,body{margin:0;padding:0;background:transparent}
		img{display:block;width:${px}px;height:${px}px}
	</style><img src="data:image/svg+xml;base64,${svgB64}" alt="">`;
	await page.setContent(html, { waitUntil: 'load' });
	// Give web font a chance to swap in — Cormorant Garamond falls back to
	// Georgia when the network font hasn't loaded yet.
	await page.evaluate(async () => {
		if (document.fonts && document.fonts.ready) await document.fonts.ready;
	});
	const buf = await page.locator('img').screenshot({ omitBackground: true });
	writeFileSync(resolve(outDir, name), buf);
	console.log(`wrote ${name} (${buf.length} bytes)`);
	await page.close();
}

await browser.close();
console.log('done');
