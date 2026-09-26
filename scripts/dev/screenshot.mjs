#!/usr/bin/env node
// Take a full-page screenshot of a URL at a given viewport.
// Usage: node screenshot.mjs <url> <out.png> [<vw>] [<vh>]
import { chromium } from 'playwright-core';
const url  = process.argv[2];
const out  = process.argv[3];
const w    = Number( process.argv[4] || 1440 );
const h    = Number( process.argv[5] || 900 );
if ( ! url || ! out ) {
	console.error( 'usage: screenshot.mjs <url> <out.png> [<vw>] [<vh>]' );
	process.exit( 2 );
}
const browser = await chromium.launch( { channel: 'chrome', headless: true } );
const context = await browser.newContext( { viewport: { width: w, height: h }, deviceScaleFactor: 1 } );
const page    = await context.newPage();
await page.goto( url, { waitUntil: 'networkidle', timeout: 60_000 } );
await page.screenshot( { path: out, fullPage: true } );
await browser.close();
console.log( `wrote ${ out } (${ w }x${ h })` );
