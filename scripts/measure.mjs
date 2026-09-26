#!/usr/bin/env node
// Measure rendered widths and left offsets of significant page elements in
// the installed Google Chrome (via playwright-core's `channel: 'chrome'`).
// No browser download.
//
// Usage:
//   node scripts/measure.mjs <url> [<viewport-width> [<viewport-height>]]
// Output: TSV (tag / x / w / label / classes) to stdout.
import { chromium } from 'playwright-core';

const url = process.argv[2];
if ( ! url ) {
	console.error( 'usage: measure.mjs <url> [<vw> [<vh>]]' );
	process.exit( 2 );
}
const width  = Number( process.argv[3] || 1440 );
const height = Number( process.argv[4] || 1000 );

const browser = await chromium.launch( { channel: 'chrome', headless: true } );
const context = await browser.newContext( { viewport: { width, height }, deviceScaleFactor: 1 } );
const page    = await context.newPage();
await page.goto( url, { waitUntil: 'networkidle', timeout: 60_000 } );

const rows = await page.evaluate( () => {
	// Broad, tag-based sweep + specific class hooks common to both sites.
	const wanted = [
		'header', 'footer', 'main', 'section', 'aside', 'nav',
		'.wp-site-blocks', '.wp-block-post-content',
		'.wp-block-group', '.wp-block-columns',
		'[class*="ground-"]', '[class*="is-style-"]',
		'.container', '.container-wide', '.container-narrow',
		'.hero', '.hero__split', '.hero__text-panel', '.hero__image-panel',
		'.hero__title', '.hero__title--split', '.hero__subtitle', '.hero__subtitle--split',
		'.hero__eyebrow', '.hero__tagline',
		'.site-nav', '.site-nav__inner', '.site-nav__list',
		'.site-header', '.site-header__inner', '.site-header__mark', '.site-header__nav',
		'.site-footer', '.site-footer__inner',
		'.music-teasers__grid', '.music-teaser',
		'.sisters-subpages__grid', '.subpage-card',
		'.divider', '.section',
		'h1', 'h2', 'h3', 'h4', 'p', 'blockquote', 'ul', 'ol',
	];
	const els = Array.from( document.querySelectorAll( wanted.join( ',' ) ) );
	// Filter to visible + non-tiny
	return els
		.map( el => {
			const r    = el.getBoundingClientRect();
			const cs   = getComputedStyle( el );
			const cls  = ( typeof el.className === 'string' ? el.className : ( el.className && el.className.baseVal ) || '' ).trim().slice( 0, 80 );
			const text = ( el.innerText || el.textContent || '' ).trim().split( '\n' )[0].slice( 0, 50 );
			return {
				tag: el.tagName.toLowerCase(),
				x: Math.round( r.left ),
				w: Math.round( r.width ),
				h: Math.round( r.height ),
				text,
				cls,
				display: cs.display,
			};
		} )
		.filter( r => r.w > 0 && r.h > 0 && r.display !== 'none' );
} );

await browser.close();

console.log( ['tag', 'x', 'w', 'label', 'cls'].join( '\t' ) );
for ( const r of rows ) {
	console.log( [r.tag, r.x, r.w, r.text || '—', r.cls].join( '\t' ) );
}
