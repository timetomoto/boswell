#!/usr/bin/env node
// Measure every home-page section for both Astro and WP at the given viewport,
// aligned so the two can be compared side by side. Output: JSON.
//
// Sections measured (in order): hero, intro, playlist, voices, sample, donate.
// Per-section metrics: section box (x/w/h), inner container (x/w),
// first heading (x/w), first paragraph (x/w). Plus hero panels.
import { chromium } from 'playwright-core';

const urlA = process.argv[2];
const urlB = process.argv[3];
const width = Number( process.argv[4] || 1440 );
if ( ! urlA || ! urlB ) {
	console.error( 'usage: home-measure.mjs <urlA> <urlB> [<vw>]' );
	process.exit( 2 );
}

const HEIGHT = 900;

const SECTION_SELECTORS = {
	astro: {
		hero:     { root: 'section.hero',            heading: '.hero__title', para: '.hero__subtitle' },
		intro:    { root: '.intro-section',          heading: '.intro__lede', para: 'p.intro__body:not(.intro__body--lead)' },
		playlist: { root: '.playlist-section',       heading: 'h2',           para: '.playlist-section__blurb' },
		voices:   { root: '.voices-section',         heading: 'h2',           para: 'blockquote' },
		sample:   { root: '.sample-section',         heading: 'h2',           para: '.sample__body' },
		donate:   { root: '.donate-teaser',          heading: 'h2',           para: '.donate-teaser__body' },
	},
	wp: {
		// WP sections are all bozzies/section blocks — index them in DOM order
		hero:     { root: '.wp-block-bozzies-section:nth-of-type(1)', heading: '.bozzies-hero-split__text h1', para: '.bozzies-hero-split__subtitle' },
		intro:    { root: '.wp-block-bozzies-section:nth-of-type(2)', heading: 'p.has-large-font-size', para: 'p:not(.has-large-font-size):not([style*="font-weight"])' },
		playlist: { root: '.wp-block-bozzies-section:nth-of-type(3)', heading: 'h2', para: 'p.has-text-align-center:not(.is-style-eyebrow)' },
		voices:   { root: '.wp-block-bozzies-section:nth-of-type(4)', heading: 'h2', para: 'p.has-text-align-center:not(.is-style-eyebrow)' },
		sample:   { root: '.wp-block-bozzies-section:nth-of-type(5)', heading: 'h2', para: 'p.has-text-align-center:not(.is-style-eyebrow):not(.wp-block-button__link)' },
		donate:   { root: '.wp-block-bozzies-section:nth-of-type(6)', heading: 'h2', para: 'p.has-text-align-center:not(.is-style-eyebrow):not(.wp-block-button__link)' },
	},
};

async function measure( url, selectors ) {
	const browser = await chromium.launch( { channel: 'chrome', headless: true } );
	const context = await browser.newContext( { viewport: { width, height: HEIGHT }, deviceScaleFactor: 1 } );
	const page    = await context.newPage();
	await page.goto( url, { waitUntil: 'networkidle', timeout: 60_000 } );
	const boxes = await page.evaluate( ( sels ) => {
		const dump = ( el ) => {
			if ( ! el ) return null;
			const r = el.getBoundingClientRect();
			return { x: Math.round( r.left ), w: Math.round( r.width ), h: Math.round( r.height ) };
		};
		const out = {};
		for ( const [ name, s ] of Object.entries( sels ) ) {
			const root = document.querySelector( s.root );
			out[ name ] = {
				section: dump( root ),
				heading: dump( root && root.querySelector( s.heading ) ),
				para:    dump( root && root.querySelector( s.para ) ),
			};
		}
		return out;
	}, selectors );
	await browser.close();
	return boxes;
}

const astro = await measure( urlA, SECTION_SELECTORS.astro );
const wp    = await measure( urlB, SECTION_SELECTORS.wp );

const rows = [];
for ( const section of Object.keys( SECTION_SELECTORS.astro ) ) {
	for ( const part of [ 'section', 'heading', 'para' ] ) {
		const a = astro[ section ]?.[ part ];
		const b = wp[ section ]?.[ part ];
		if ( ! a || ! b ) {
			rows.push( { section, part, astro: a, wp: b, delta: 'missing' } );
			continue;
		}
		const dx = b.x - a.x;
		const dw = b.w - a.w;
		const dh = b.h - a.h;
		rows.push( {
			section,
			part,
			astro: `x=${ a.x } w=${ a.w } h=${ a.h }`,
			wp:    `x=${ b.x } w=${ b.w } h=${ b.h }`,
			dx, dw, dh,
			pass_2px: Math.abs( dx ) <= 2 && Math.abs( dw ) <= 2,
		} );
	}
}

console.log( `viewport ${ width }x${ HEIGHT }` );
console.log( `astro=${ urlA }` );
console.log( `wp=${ urlB }` );
console.log( '' );
console.log( 'section\tpart\tastro\twp\tdx\tdw\tdh\tpass2px' );
for ( const r of rows ) {
	console.log( [ r.section, r.part, r.astro, r.wp, r.dx, r.dw, r.dh, r.pass_2px ].join( '\t' ) );
}
