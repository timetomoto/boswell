#!/usr/bin/env node
/**
 * Compare rendered colours element-by-element between Astro and WP for a given
 * pair of URLs. Sweeps every heading, paragraph, link and button that carries
 * user-visible text, plus common site chrome (eyebrows, buttons, footer),
 * and returns colour, background-color, border-color, and hover/focus color.
 *
 * Element pairing uses a stable pathkey (tag + normalised text). Rows that
 * exist on only one side are reported as "MISSING". A mismatch report groups
 * pairs by section so the fix can be targeted.
 *
 * Usage:
 *   node scripts/visual-colors.mjs <astroUrl> <wpUrl> [<vw>] [<vh>]
 * Prints a TSV mismatch report and a JSON blob to _screens/visual-<vw>.json.
 */
import { chromium } from 'playwright-core';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const [, , astroUrl, wpUrl, ...rest] = process.argv;
if ( ! astroUrl || ! wpUrl ) {
	console.error( 'usage: visual-colors.mjs <astroUrl> <wpUrl> [<vw> [<vh>]]' );
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

	const rows = await page.evaluate( () => {
		// Choose sections by heading-based landmark, so ordering is stable across sites.
		const sectionOf = ( el ) => {
			let s = el.closest( 'section, [class*="ground-"], [class*="is-style-"], main' );
			if ( ! s ) return { key: 'root', label: 'root' };
			const h = s.querySelector( ':scope > *:not(header), :scope * ' );
			const heading = s.querySelector( 'h1, h2, h3' );
			const title = heading ? heading.innerText.trim().split( '\n' )[0].slice( 0, 40 ) : '';
			const cls = ( typeof s.className === 'string' ? s.className : '' );
			const groundMatch = cls.match( /(ground-\w+|is-style-\w+)/ );
			const key = ( groundMatch ? groundMatch[0] : 'section' ) + ':' + ( title || cls.slice( 0, 20 ) );
			return { key, label: title || key };
		};

		const selectorList = [
			'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
			'p',
			'a',
			'button',
			'.wp-block-button__link',
			'.wp-element-button',
			'.btn',
			'.sample__cta',
			'.eyebrow',
			'.is-style-eyebrow',
			'.site-header__mark', '.site-header__mark *',
			'.site-header__nav a', '.site-header__nav .wp-block-navigation-item__content',
			'.site-footer', '.site-footer *',
			'.site-footer__nav a', '.site-footer__nav .wp-block-navigation-item__content',
			'blockquote', 'cite',
		];
		const all = Array.from( document.querySelectorAll( selectorList.join( ',' ) ) );

		const norm = ( s ) => ( s || '' ).replace( /\s+/g, ' ' ).trim().slice( 0, 60 );

		return all
			.map( ( el ) => {
				const r = el.getBoundingClientRect();
				const cs = getComputedStyle( el );
				if ( r.width === 0 || r.height === 0 || cs.display === 'none' || cs.visibility === 'hidden' ) return null;
				const text = norm( el.innerText || el.textContent );
				if ( ! text && el.tagName !== 'A' && el.tagName !== 'BUTTON' ) return null;
				const sec = sectionOf( el );
				const cls = typeof el.className === 'string' ? el.className : ( el.className?.baseVal || '' );
				// pathkey: section + tag + normalised text (or class if empty). Stable across sites.
				const pathkey = sec.key + '|' + el.tagName.toLowerCase() + '|' + ( text || cls.slice( 0, 40 ) );
				return {
					section: sec.label,
					pathkey,
					tag: el.tagName.toLowerCase(),
					text,
					cls: cls.slice( 0, 100 ),
					color: cs.color,
					background: cs.backgroundColor,
					border: cs.borderTopColor + '/' + cs.borderRightColor + '/' + cs.borderBottomColor + '/' + cs.borderLeftColor,
					opacity: cs.opacity,
					textDecoration: cs.textDecorationColor + ' ' + cs.textDecorationLine,
					x: Math.round( r.left ),
					y: Math.round( r.top ),
					w: Math.round( r.width ),
					h: Math.round( r.height ),
				};
			} )
			.filter( Boolean );
	} );

	await browser.close();
	return rows;
}

const [aRows, wRows] = await Promise.all( [collect( astroUrl ), collect( wpUrl )] );

// Normalise the pathkey so identical text/section rows can pair even when class
// prefixes differ between Astro and WP (e.g. eyebrow-purple → is-style-eyebrow).
function normKey( row ) {
	// Drop the section-class prefix segment when it obviously differs, keep the
	// section label + tag + text tail.
	const parts = row.pathkey.split( '|' );
	// parts[0] section:label, parts[1] tag, parts[2] text
	const sec = parts[0].replace( /^(is-style-|ground-)/, '' );
	return sec + '|' + parts[1] + '|' + parts[2];
}

const aMap = new Map();
for ( const r of aRows ) {
	const k = normKey( r );
	if ( ! aMap.has( k ) ) aMap.set( k, r );
}
const wMap = new Map();
for ( const r of wRows ) {
	const k = normKey( r );
	if ( ! wMap.has( k ) ) wMap.set( k, r );
}

const mismatches = [];
const matched = [];
const missingInWp = [];
const missingInAstro = [];

for ( const [k, aRow] of aMap ) {
	const wRow = wMap.get( k );
	if ( ! wRow ) { missingInWp.push( aRow ); continue; }
	const diffs = {};
	if ( aRow.color !== wRow.color ) diffs.color = { astro: aRow.color, wp: wRow.color };
	if ( aRow.background !== wRow.background ) diffs.background = { astro: aRow.background, wp: wRow.background };
	// Only complain about borders if either side has a non-transparent one.
	const nonTransparent = ( s ) => s.split( '/' ).some( c => c && c !== 'rgba(0, 0, 0, 0)' && c !== 'rgb(0, 0, 0)' );
	if ( aRow.border !== wRow.border && ( nonTransparent( aRow.border ) || nonTransparent( wRow.border ) ) ) {
		diffs.border = { astro: aRow.border, wp: wRow.border };
	}
	if ( Object.keys( diffs ).length > 0 ) {
		mismatches.push( { key: k, section: aRow.section, tag: aRow.tag, text: aRow.text, cls: aRow.cls, wpCls: wRow.cls, diffs } );
	} else {
		matched.push( { key: k } );
	}
}
for ( const [k, wRow] of wMap ) if ( ! aMap.has( k ) ) missingInAstro.push( wRow );

// Emit report.
const summary = {
	viewport: vw,
	astroUrl,
	wpUrl,
	totals: {
		astroRows: aRows.length,
		wpRows: wRows.length,
		matched: matched.length,
		mismatches: mismatches.length,
		missingInWp: missingInWp.length,
		missingInAstro: missingInAstro.length,
	},
	mismatches,
	missingInWp,
	missingInAstro,
};
const outFile = outDir + `visual-colors-${vw}.json`;
writeFileSync( outFile, JSON.stringify( summary, null, 2 ) );

// TSV mismatch list to stdout.
console.log( ['section', 'tag', 'text', 'field', 'astro', 'wp'].join( '\t' ) );
for ( const m of mismatches ) {
	for ( const [field, delta] of Object.entries( m.diffs ) ) {
		console.log( [m.section, m.tag, m.text || '—', field, delta.astro, delta.wp].join( '\t' ) );
	}
}
console.error( `\n[colors] viewport=${vw}  matched=${matched.length}  mismatches=${mismatches.length}  missing-in-wp=${missingInWp.length}  missing-in-astro=${missingInAstro.length}` );
console.error( `[colors] json: ${outFile}` );
