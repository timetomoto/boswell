#!/usr/bin/env node
// Diff visible text of two URLs (main tag only, ignoring header/footer chrome).
// Usage: node visible-text-diff.mjs <urlA> <urlB> [<vw>]
import { chromium } from 'playwright-core';

const A = process.argv[2];
const B = process.argv[3];
const width = Number( process.argv[4] || 1440 );
if ( ! A || ! B ) {
	console.error( 'usage: visible-text-diff.mjs <urlA> <urlB> [<vw>]' );
	process.exit( 2 );
}

async function extract( url ) {
	const browser = await chromium.launch( { channel: 'chrome', headless: true } );
	const context = await browser.newContext( { viewport: { width, height: 900 }, deviceScaleFactor: 1 } );
	const page    = await context.newPage();
	await page.goto( url, { waitUntil: 'networkidle', timeout: 60_000 } );
	const text = await page.evaluate( () => {
		const main = document.querySelector( 'main' ) || document.body;
		// Walk visible text nodes only.
		const walker = document.createTreeWalker( main, NodeFilter.SHOW_TEXT, {
			acceptNode: ( n ) => {
				if ( ! n.nodeValue || ! n.nodeValue.trim() ) return NodeFilter.FILTER_REJECT;
				const el = n.parentElement;
				if ( ! el ) return NodeFilter.FILTER_REJECT;
				const cs = getComputedStyle( el );
				if ( cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0' ) return NodeFilter.FILTER_REJECT;
				if ( el.closest( '[aria-hidden="true"]' ) ) return NodeFilter.FILTER_REJECT;
				if ( el.closest( 'script, style, noscript' ) ) return NodeFilter.FILTER_REJECT;
				return NodeFilter.FILTER_ACCEPT;
			},
		} );
		const out = [];
		let node;
		while ( ( node = walker.nextNode() ) ) {
			const t = node.nodeValue.replace( /\s+/g, ' ' ).trim();
			if ( t ) out.push( t );
		}
		return out;
	} );
	await browser.close();
	return text;
}

const a = await extract( A );
const b = await extract( B );

console.log( `--- ${ A } (${ a.length } strings)` );
console.log( `+++ ${ B } (${ b.length } strings)` );
console.log( '' );

// Simple sequence diff: label each string, print A-only and B-only lists.
const norm = ( s ) => s.replace( /\s+/g, ' ' ).trim();
const setA = new Map();
for ( const s of a ) setA.set( norm( s ), ( setA.get( norm( s ) ) || 0 ) + 1 );
const setB = new Map();
for ( const s of b ) setB.set( norm( s ), ( setB.get( norm( s ) ) || 0 ) + 1 );

const onlyA = [];
for ( const [ s, count ] of setA ) {
	const bCount = setB.get( s ) || 0;
	for ( let i = 0; i < count - bCount; i++ ) onlyA.push( s );
}
const onlyB = [];
for ( const [ s, count ] of setB ) {
	const aCount = setA.get( s ) || 0;
	for ( let i = 0; i < count - aCount; i++ ) onlyB.push( s );
}

console.log( '# Only in A (Astro/Vercel):' );
for ( const s of onlyA ) console.log( `  - ${ JSON.stringify( s ) }` );
console.log( '' );
console.log( '# Only in B (WordPress):' );
for ( const s of onlyB ) console.log( `  + ${ JSON.stringify( s ) }` );
console.log( '' );
console.log( `# Summary: ${ onlyA.length } strings only in A, ${ onlyB.length } only in B` );
