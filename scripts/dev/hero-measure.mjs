#!/usr/bin/env node
// Measure the split hero layout on both sites at a given viewport width.
import { chromium } from 'playwright-core';

const url   = process.argv[2];
const label = process.argv[3] || 'site';
const width  = Number( process.argv[4] || 1440 );
const height = Number( process.argv[5] || 1000 );

const browser = await chromium.launch( { channel: 'chrome', headless: true } );
const context = await browser.newContext( { viewport: { width, height }, deviceScaleFactor: 1 } );
const page    = await context.newPage();
await page.goto( url, { waitUntil: 'networkidle', timeout: 60_000 } );

const rows = await page.evaluate( () => {
	const wanted = {
		hero:     'section.hero, .wp-block-bozzies-section.has-hero-frame',
		split:    '.hero__split, .bozzies-hero-split',
		imgPanel: '.hero__image-panel, .bozzies-hero-split__image',
		txtPanel: '.hero__text-panel, .bozzies-hero-split__text',
		title:    '.hero__title--split, .wp-block-bozzies-section .bozzies-hero-split__text h1',
		eyebrow:  '.hero__eyebrow, .wp-block-bozzies-section .bozzies-hero-split__text .is-style-eyebrow',
		tagline:  '.hero__tagline, .wp-block-bozzies-section .bozzies-hero-split__text p[style*="yellow-soft"]',
	};
	const out = {};
	for ( const [ k, sel ] of Object.entries( wanted ) ) {
		const el = document.querySelector( sel );
		if ( ! el ) { out[ k ] = null; continue; }
		const r = el.getBoundingClientRect();
		out[ k ] = {
			x: Math.round( r.left ),
			y: Math.round( r.top ),
			w: Math.round( r.width ),
			h: Math.round( r.height ),
		};
	}
	return out;
} );
await browser.close();
console.log( JSON.stringify( { label, url, viewport: { width, height }, boxes: rows }, null, 2 ) );
