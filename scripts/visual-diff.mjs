#!/usr/bin/env node
/**
 * Pixel-diff of full-page screenshots between Astro and WP. Emits per-section
 * pixel-diff percentages by clipping the screenshots at each section's
 * bounding box, plus a single whole-page diff image.
 *
 * Sections are discovered by walking Astro's DOM and pairing to WP's DOM by
 * heading text (falling back to ground+backdrop). WP's coordinates are read
 * separately (heights differ between the two sites).
 *
 * Usage:
 *   node scripts/visual-diff.mjs <astroUrl> <wpUrl> [<vw> [<vh>]] [--threshold=0.15]
 * Outputs to _screens/task-7d/:
 *   astro-full-<vw>.png, wp-full-<vw>.png, diff-full-<vw>.png
 *   diff-<section>-<vw>.png (one per section)
 *   report-<vw>.json (per-section mismatch percentages)
 */
import { chromium } from 'playwright-core';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice( 2 );
const positional = args.filter( a => ! a.startsWith( '--' ) );
const flags = Object.fromEntries( args.filter( a => a.startsWith( '--' ) ).map( a => a.slice( 2 ).split( '=' ) ) );

const [astroUrl, wpUrl, vwArg, vhArg] = positional;
if ( ! astroUrl || ! wpUrl ) {
	console.error( 'usage: visual-diff.mjs <astroUrl> <wpUrl> [<vw> [<vh>]] [--threshold=0.15]' );
	process.exit( 2 );
}
const vw = Number( vwArg || 1440 );
const vh = Number( vhArg || 900 );
const threshold = Number( flags.threshold || 0.15 );

const outDir = fileURLToPath( new URL( '../_screens/task-7d/', import.meta.url ) );
if ( ! existsSync( outDir ) ) mkdirSync( outDir, { recursive: true } );

async function snap( url, label ) {
	const browser = await chromium.launch( { channel: 'chrome', headless: true } );
	const ctx = await browser.newContext( { viewport: { width: vw, height: vh }, deviceScaleFactor: 1, reducedMotion: 'reduce' } );
	const page = await ctx.newPage();
	await page.goto( url, { waitUntil: 'networkidle', timeout: 60_000 } );
	// Freeze CSS animations so the pixel-diff is deterministic.
	await page.addStyleTag( { content: '*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition-duration:0s!important;caret-color:transparent!important}' } );
	await page.evaluate( () => window.scrollTo( 0, 0 ) );
	await page.waitForTimeout( 250 );

	// Collect section bounding boxes at the initial (measurement) viewport so
	// vh-based rules (hero min-height: 58vh, etc.) match what the reader sees.
	// The fullPage screenshot below scrolls to capture everything at this
	// same viewport size, so section coords in the PNG line up with what we
	// measured here.
	const sections = await page.evaluate( () => {
		const wanted = Array.from( document.querySelectorAll( 'section, .wp-block-bozzies-section, [class*="ground-"], .site-header, .site-footer, header, footer' ) );
		// De-dupe by DOM containment: skip a section that is fully contained by another already listed.
		const chosen = [];
		for ( const el of wanted ) {
			const r = el.getBoundingClientRect();
			if ( r.height < 60 ) continue;
			const contained = chosen.find( ( c ) => c.el.contains( el ) );
			if ( contained ) continue;
			chosen.push( { el, r } );
		}
		return chosen.map( ( { el, r }, i ) => {
			const cls = typeof el.className === 'string' ? el.className : '';
			const groundMatch = cls.match( /(ground-\w+|is-style-\w+|site-header|site-footer)/ );
			const backdropMatch = cls.match( /has-backdrop-[\w-]+/ );
			const heading = el.querySelector( 'h1, h2, h3' );
			const title = heading ? heading.innerText.trim().split( '\n' )[0].slice( 0, 40 ) : '';
			return {
				idx: i,
				title,
				ground: groundMatch ? groundMatch[0] : '',
				backdrop: backdropMatch ? backdropMatch[0] : '',
				top: Math.round( r.top + window.scrollY ),
				bottom: Math.round( r.bottom + window.scrollY ),
				height: Math.round( r.height ),
			};
		} );
	} );

	// The viewport was already resized to at least the full page height above
	// so section coordinates match what the screenshot will contain.
	const scrollHeight = await page.evaluate( () => document.documentElement.scrollHeight );

	const buf = await page.screenshot( { fullPage: true, type: 'png' } );
	writeFileSync( outDir + `${label}-full-${vw}.png`, buf );
	await browser.close();
	return { pngBuf: buf, sections, scrollHeight };
}

const [astro, wp] = await Promise.all( [snap( astroUrl, 'astro' ), snap( wpUrl, 'wp' )] );

const aPng = PNG.sync.read( astro.pngBuf );
const wPng = PNG.sync.read( wp.pngBuf );

// Full-page diff: crop both to the smaller height so the diff has matching dims.
// pngjs v7 removes the bitblt helper — do a manual bounds-checked copy.
const commonH = Math.min( aPng.height, wPng.height );
function crop( png, top, height, width ) {
	const w = width || png.width;
	const h = Math.max( 0, Math.min( height, png.height - top ) );
	const out = new PNG( { width: w, height: h } );
	for ( let y = 0; y < h; y++ ) {
		const srcRow = ( top + y ) * png.width * 4;
		const dstRow = y * w * 4;
		png.data.copy( out.data, dstRow, srcRow, srcRow + w * 4 );
	}
	return out;
}
const aCropFull = crop( aPng, 0, commonH );
const wCropFull = crop( wPng, 0, commonH );
const diffFull = new PNG( { width: aPng.width, height: commonH } );
const totalPixels = aPng.width * commonH;
const changedFull = pixelmatch( aCropFull.data, wCropFull.data, diffFull.data, aPng.width, commonH, { threshold, alpha: 0.5, includeAA: false } );
writeFileSync( outDir + `diff-full-${vw}.png`, PNG.sync.write( diffFull ) );
const fullPct = 100 * changedFull / totalPixels;

// Pair sections by key: title (lowercased), else ground+backdrop.
function key( s ) {
	if ( s.title ) return 'h:' + s.title.toLowerCase();
	return 'g:' + s.ground + '/' + s.backdrop;
}
const aByKey = new Map();
for ( const s of astro.sections ) if ( ! aByKey.has( key( s ) ) ) aByKey.set( key( s ), s );
const wByKey = new Map();
for ( const s of wp.sections ) if ( ! wByKey.has( key( s ) ) ) wByKey.set( key( s ), s );

const perSection = [];
for ( const [k, aSec] of aByKey ) {
	const wSec = wByKey.get( k );
	if ( ! wSec ) {
		perSection.push( { key: k, title: aSec.title, missingInWp: true, astroHeight: aSec.height, wpHeight: 0, changedPct: 100 } );
		continue;
	}
	const h = Math.min( aSec.height, wSec.height );
	const width = aPng.width;
	if ( h < 8 ) continue;
	const aSub = crop( aPng, aSec.top, h, width );
	const wSub = crop( wPng, wSec.top, h, width );
	const dSub = new PNG( { width, height: h } );
	const changed = pixelmatch( aSub.data, wSub.data, dSub.data, width, h, { threshold, alpha: 0.5, includeAA: false } );
	const pct = 100 * changed / ( width * h );
	const outSlug = ( aSec.title || aSec.ground || 'sec' + aSec.idx ).replace( /[^a-z0-9]+/gi, '-' ).toLowerCase().slice( 0, 40 );
	const outPath = outDir + `diff-${outSlug}-${vw}.png`;
	writeFileSync( outPath, PNG.sync.write( dSub ) );
	perSection.push( {
		key: k,
		title: aSec.title,
		ground: aSec.ground,
		backdrop: aSec.backdrop,
		astroTop: aSec.top,
		wpTop: wSec.top,
		astroHeight: aSec.height,
		wpHeight: wSec.height,
		heightCompared: h,
		changed,
		changedPct: Number( pct.toFixed( 2 ) ),
		diffImage: outPath.replace( process.cwd() + '/', '' ),
	} );
}

const report = {
	viewport: vw,
	threshold,
	astroUrl,
	wpUrl,
	fullPage: {
		astroHeight: aPng.height,
		wpHeight: wPng.height,
		compared: commonH,
		changedPct: Number( fullPct.toFixed( 2 ) ),
		diffImage: ( outDir + `diff-full-${vw}.png` ).replace( process.cwd() + '/', '' ),
	},
	sections: perSection,
};
writeFileSync( outDir + `report-${vw}.json`, JSON.stringify( report, null, 2 ) );

console.log( `[diff] full-page ${vw}: ${fullPct.toFixed( 2 )}% changed (${changedFull.toLocaleString()} px of ${totalPixels.toLocaleString()})` );
for ( const s of perSection ) {
	console.log( `[diff] ${vw}  ${( s.title || s.ground || s.key ).padEnd( 40 )}  ${s.changedPct.toString().padStart( 6 )}%   astroH=${s.astroHeight}  wpH=${s.wpHeight}` );
}
console.log( `[diff] report: ${outDir}report-${vw}.json` );
