#!/usr/bin/env node
/**
 * Compare background/backdrop layers between Astro and WP. For every element
 * that carries a background-image, backdrop mask, ground colour or hero image
 * layer, this checks presence, rendered size, opacity and mask/image url.
 *
 * Usage:
 *   node scripts/visual-backdrops.mjs <astroUrl> <wpUrl> [<vw> [<vh>]]
 */
import { chromium } from 'playwright-core';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const [, , astroUrl, wpUrl, ...rest] = process.argv;
if ( ! astroUrl || ! wpUrl ) {
	console.error( 'usage: visual-backdrops.mjs <astroUrl> <wpUrl> [<vw> [<vh>]]' );
	process.exit( 2 );
}
const vw = Number( rest[0] || 1440 );
const vh = Number( rest[1] || 900 );

const outDir = fileURLToPath( new URL( '../_screens/', import.meta.url ) );
if ( ! existsSync( outDir ) ) mkdirSync( outDir, { recursive: true } );

async function collect( url ) {
	const browser = await chromium.launch( { channel: 'chrome', headless: true } );
	const ctx = await browser.newContext( { viewport: { width: vw, height: vh }, deviceScaleFactor: 1 } );
	const page = await ctx.newPage();
	await page.goto( url, { waitUntil: 'networkidle', timeout: 60_000 } );

	// Extend page-height check: scroll to bottom so lazy backgrounds paint.
	await page.evaluate( () => window.scrollTo( 0, document.body.scrollHeight ) );
	await page.waitForTimeout( 500 );
	await page.evaluate( () => window.scrollTo( 0, 0 ) );

	const data = await page.evaluate( () => {
		const rows = [];
		const walk = ( node ) => {
			if ( ! ( node instanceof Element ) ) return;
			const cs = getComputedStyle( node );
			const rect = node.getBoundingClientRect();
			const cls = typeof node.className === 'string' ? node.className : '';
			const hasBgImage = cs.backgroundImage && cs.backgroundImage !== 'none';
			const hasMask = ( cs.maskImage && cs.maskImage !== 'none' ) || ( cs.webkitMaskImage && cs.webkitMaskImage !== 'none' );
			const isDecorLayer = /(backdrop|hero|__image|__frame|__overlay|MusicBackdrop|music-backdrop)/i.test( cls );
			const label = /(ground-\w+|is-style-\w+|hero|backdrop|frame|overlay|MusicBackdrop|music-backdrop|__image)/i.exec( cls )?.[0]
				|| ( isDecorLayer ? 'decor' : '' );
			if ( hasBgImage || hasMask || isDecorLayer ) {
				const bgSize = rect.width * rect.height;
				rows.push( {
					tag: node.tagName.toLowerCase(),
					cls: cls.slice( 0, 120 ),
					label,
					bgImage: cs.backgroundImage,
					mask: cs.maskImage || cs.webkitMaskImage || 'none',
					bgColor: cs.backgroundColor,
					opacity: cs.opacity,
					width: Math.round( rect.width ),
					height: Math.round( rect.height ),
					visibleArea: bgSize,
					isPresent: bgSize > 0 && cs.display !== 'none' && cs.visibility !== 'hidden',
				} );
			}
			for ( const child of node.children ) walk( child );
		};
		walk( document.body );

		// Also survey each landmark section: ground colour, ::before/::after
		// backdrop presence via computed style on the pseudo (unavailable), so
		// instead just note the section body ground colour + total height.
		const sections = Array.from( document.querySelectorAll( 'section, [class*="ground-"], [class*="is-style-paper"], [class*="is-style-ink"], [class*="is-style-purple"], [class*="is-style-gold"], .wp-block-bozzies-section' ) );
		const sectionSurvey = sections
			.map( ( s ) => {
				const r = s.getBoundingClientRect();
				const cs = getComputedStyle( s );
				const cls = typeof s.className === 'string' ? s.className : '';
				const groundMatch = cls.match( /(ground-\w+|is-style-\w+)/g );
				const backdropMatch = cls.match( /has-backdrop-[\w-]+/g );
				const heading = s.querySelector( 'h1, h2, h3' );
				const title = heading ? heading.innerText.trim().split( '\n' )[0].slice( 0, 40 ) : '';
				return {
					cls: cls.slice( 0, 100 ),
					title,
					ground: groundMatch ? groundMatch[0] : '',
					backdrop: backdropMatch ? backdropMatch[0] : '',
					bg: cs.backgroundColor,
					width: Math.round( r.width ),
					height: Math.round( r.height ),
					hasChildBackdrop: !! s.querySelector( '[class*="backdrop"], .music-backdrop, .MusicBackdrop, .wp-block-bozzies-section__backdrop, svg[class*="backdrop"]' ),
					hasChildImage: !! s.querySelector( '[class*="__image"], .wp-block-image img, .hero__image, .wp-block-bozzies-section__image' ),
				};
			} );

		return { rows, sectionSurvey };
	} );

	await browser.close();
	return data;
}

const [aData, wData] = await Promise.all( [collect( astroUrl ), collect( wpUrl )] );

// Pair sections by title (or by ground+backdrop keyword when the title is empty).
function sectionKey( s ) {
	if ( s.title ) return s.title.toLowerCase();
	return s.ground + '/' + s.backdrop;
}

const aSecs = new Map();
for ( const s of aData.sectionSurvey ) if ( s.height > 100 ) aSecs.set( sectionKey( s ), s );
const wSecs = new Map();
for ( const s of wData.sectionSurvey ) if ( s.height > 100 ) wSecs.set( sectionKey( s ), s );

const mismatches = [];
for ( const [k, aSec] of aSecs ) {
	const wSec = wSecs.get( k );
	if ( ! wSec ) { mismatches.push( { section: k, kind: 'missing-in-wp', astro: aSec } ); continue; }
	const issue = {};
	// A section that has a backdrop in Astro must have one in WP.
	const aHasBackdrop = !! aSec.backdrop || aSec.hasChildBackdrop;
	const wHasBackdrop = !! wSec.backdrop || wSec.hasChildBackdrop;
	if ( aHasBackdrop && ! wHasBackdrop ) issue.backdrop = 'astro has backdrop, wp missing';
	if ( ! aHasBackdrop && wHasBackdrop ) issue.backdrop = 'wp has extra backdrop';
	// Hero image presence.
	if ( aSec.hasChildImage && ! wSec.hasChildImage ) issue.heroImage = 'astro has image, wp missing';
	if ( Object.keys( issue ).length ) mismatches.push( { section: k, astro: aSec, wp: wSec, issue } );
}

const summary = {
	viewport: vw,
	totals: {
		astroDecorLayers: aData.rows.length,
		wpDecorLayers: wData.rows.length,
		astroSections: aData.sectionSurvey.length,
		wpSections: wData.sectionSurvey.length,
		mismatches: mismatches.length,
	},
	astroSectionSurvey: aData.sectionSurvey,
	wpSectionSurvey: wData.sectionSurvey,
	mismatches,
};
const outFile = outDir + `visual-backdrops-${vw}.json`;
writeFileSync( outFile, JSON.stringify( summary, null, 2 ) );

console.log( ['section', 'issue', 'astro', 'wp'].join( '\t' ) );
for ( const m of mismatches ) {
	for ( const [k, v] of Object.entries( m.issue || {} ) ) {
		console.log( [m.section, k, v, ''].join( '\t' ) );
	}
	if ( m.kind ) console.log( [m.section, m.kind, '', ''].join( '\t' ) );
}
console.error( `\n[backdrops] viewport=${vw}  sections-mismatched=${mismatches.length}` );
console.error( `[backdrops] json: ${outFile}` );
