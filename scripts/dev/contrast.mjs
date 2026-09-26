#!/usr/bin/env node
// Print a WCAG contrast ratio table for the Section block's colour pairs.
function lum( hex ) {
	const h = hex.replace( '#', '' );
	const rgb = [ 0, 2, 4 ].map( ( i ) => {
		const c = parseInt( h.slice( i, i + 2 ), 16 ) / 255;
		return c <= 0.03928 ? c / 12.92 : Math.pow( ( c + 0.055 ) / 1.055, 2.4 );
	} );
	return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}
function ratio( a, b ) {
	const la = lum( a ), lb = lum( b );
	const [ hi, lo ] = la > lb ? [ la, lb ] : [ lb, la ];
	return ( hi + 0.05 ) / ( lo + 0.05 );
}
function mix( top, bottom, alpha ) {
	const p = ( h ) => [ 0, 2, 4 ].map( ( i ) => parseInt( h.replace( '#', '' ).slice( i, i + 2 ), 16 ) );
	const [ tr, tg, tb ] = p( top );
	const [ br, bg, bb ] = p( bottom );
	const m = ( t, b ) => Math.round( t * alpha + b * ( 1 - alpha ) );
	return `#${ [ m( tr, br ), m( tg, bg ), m( tb, bb ) ].map( ( v ) => v.toString( 16 ).padStart( 2, '0' ) ).join( '' ) }`;
}
const PAPER  = '#F4F0E8';
const INK    = '#181615';
const PURPLE = '#4A2E5A';
const GOLD   = '#C99A2A';
const CUSTOM = '#23453A'; // emerald example from theme.json custom colours
const TEXT_ON_PAPER  = '#1E1B18';
const TEXT_ON_INK    = '#EDE6D6';
const TEXT_ON_PURPLE = '#F1E4C4';
const OXBLOOD   = '#5A2E2E';
const CHAMPAGNE = '#C8A96A';
const WHITE     = '#FFFFFF';
const YELLOW_SOFT = '#E1C263';
const rows = [
	[ 'Paper',            'body text-on-paper',       TEXT_ON_PAPER,  PAPER ],
	[ 'Ink',              'body text-on-ink',         TEXT_ON_INK,    INK ],
	[ 'Purple',           'body text-on-purple',      TEXT_ON_PURPLE, PURPLE ],
	[ 'Gold',             'body ink',                 INK,            GOLD ],
	[ 'Custom (emerald)', 'body auto (light)',        TEXT_ON_INK,    CUSTOM ],
	[ 'Paper',            'pull-quote oxblood',       OXBLOOD,        PAPER ],
	[ 'Ink',              'pull-quote champagne',     CHAMPAGNE,      INK ],
	[ 'Purple',           'pull-quote white',         WHITE,          PURPLE ],
	[ 'Gold',             'pull-quote oxblood',       OXBLOOD,        GOLD ],
	[ 'Image + 70% ink overlay (default) on mid-grey image',
	                       'body text-on-ink',
	                       TEXT_ON_INK,   mix( INK, '#808080', 0.70 ) ],
	[ 'Image + 70% ink overlay (default) on worst-case white image',
	                       'body text-on-ink',
	                       TEXT_ON_INK,   mix( INK, '#FFFFFF', 0.70 ) ],
	[ 'Image + 70% ink overlay (default) on worst-case black image',
	                       'body text-on-ink',
	                       TEXT_ON_INK,   mix( INK, '#000000', 0.70 ) ],
	// New pairs from home page rebuild:
	[ 'Purple (hero panel)', 'hero subtitle text-on-ink',
	                       TEXT_ON_INK,   PURPLE ],
	[ 'Purple (hero panel)', 'hero tagline yellow-soft',
	                       YELLOW_SOFT,   PURPLE ],
	[ 'Purple (hero panel gradient at 100%, worst case)',
	                       'hero credit rgba(text-on-ink,0.75)',
	                       mix( TEXT_ON_INK, PURPLE, 0.75 ),   PURPLE ],
	[ 'Paper', 'intro__body--lead bold on paper', TEXT_ON_PAPER, PAPER ],
];
const AA_LARGE = 3;
const AA_BODY  = 4.5;
console.log( 'Ground\tText\tfg\tbg\tratio\tAA-body\tAA-large' );
for ( const [ ground, text, fg, bg ] of rows ) {
	const r = ratio( fg, bg );
	console.log( [ ground, text, fg, bg, r.toFixed( 2 ), r >= AA_BODY ? 'PASS' : 'FAIL', r >= AA_LARGE ? 'PASS' : 'FAIL' ].join( '\t' ) );
}
