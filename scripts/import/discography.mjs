#!/usr/bin/env node
// scripts/import/discography.mjs
//
// Populates the bozzies/discography block on /media/discography/ with the
// full session-by-session data from the Astro source markdown:
//
//   ~/boswell-poc/src/content/discography/trio-era.md
//   ~/boswell-poc/src/content/discography/connee-solo.md
//
// Astro renders these via getCollection('discographySessions'), sorts trio
// first, then connee-solo (discography.astro L5-9), and hands the entries to
// the .disc-scope / .disc-session / .disc-track loop. This script mirrors
// that sort and pushes both scopes onto the block's `scopes` attribute.
//
// The pre-rebuild placeholder on /media/discography/ is a
// bozzies/section {backgroundStyle:"paper",backdrop:"staves"…} wrapper with
// an eyebrow + h2 + "[Discography search: interactive block pending]"
// paragraph + attribution paragraph. This script replaces that wrapper with
// a single <!-- wp:bozzies/discography {…} /--> block.
//
// Idempotent: if the target region already contains wp:bozzies/discography,
// the block's attributes are simply refreshed with the current markdown.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { load } from 'js-yaml';
import { wp } from './lib.mjs';

// Gutenberg's client-side JSON serializer escapes only `--`, `<`, `>`, `&`
// (not `'`). Reused from other import scripts so straight apostrophes in
// session headers + track titles round-trip byte-identical.
const gbJson = ( obj ) =>
	JSON.stringify( obj )
		.replace( /--/g, '\\u002d\\u002d' )
		.replace( /</g, '\\u003c' )
		.replace( />/g, '\\u003e' )
		.replace( /&/g, '\\u0026' );

const __dirname = dirname( fileURLToPath( import.meta.url ) );

function readScope( filename ) {
	const path = resolve( __dirname, `../../../boswell-poc/src/content/discography/${ filename }` );
	const src = readFileSync( path, 'utf8' );
	const m = src.match( /^---\n([\s\S]*?)\n---/ );
	if ( ! m ) throw new Error( `${ path }: no frontmatter found` );
	const data = load( m[ 1 ] );

	const sessions = Array.isArray( data.sessions ) ? data.sessions : [];
	const normSessions = sessions.map( ( s ) => ( {
		header: s.header != null ? String( s.header ) : '',
		tracks: Array.isArray( s.tracks )
			? s.tracks.map( ( t ) => ( {
					matrix: t.matrix != null ? String( t.matrix ) : '',
					title: t.title != null ? String( t.title ) : '',
					notes: t.notes != null ? String( t.notes ) : '',
					refs: t.refs != null ? String( t.refs ) : '',
				} ) )
			: [],
	} ) );

	// The scope `id` mirrors Astro's collection id: the filename without
	// extension. discography.astro's sort keys off `id.includes('trio')`.
	const id = filename.replace( /\.md$/, '' );
	return {
		id,
		title: data.title != null ? String( data.title ) : '',
		subtitle: data.subtitle != null ? String( data.subtitle ) : '',
		attribution: data.attribution != null ? String( data.attribution ) : '',
		sessions: normSessions,
	};
}

function findPageId( slug ) {
	const out = wp(
		[ 'post', 'list', '--post_type=page', `--name=${ slug }`, '--fields=ID', '--format=ids' ],
		{ allowFail: true }
	);
	if ( ! out ) return null;
	const id = parseInt( out.split( /\s+/ )[ 0 ], 10 );
	return Number.isFinite( id ) ? id : null;
}

function phpStr( s ) {
	return `'${ String( s )
		.replace( /\\/g, '\\\\' )
		.replace( /'/g, "\\'" ) }'`;
}

// Matches the pre-rebuild placeholder region: a paper-ground bozzies/section
// wrapping an eyebrow paragraph + h2 + [Discography search: …] paragraph +
// attribution paragraph. Tolerates attribute order and whitespace variance
// between the section-comment opener and its inner blocks.
const PLACEHOLDER_RE = /<!-- wp:bozzies\/section \{[^}]*"backgroundStyle":"paper"[^}]*\} -->[\s\S]*?\[Discography search: interactive block pending\][\s\S]*?<!-- \/wp:bozzies\/section -->/;

// Matches an already-installed block so we can refresh its attributes.
const BLOCK_RE = /<!-- wp:bozzies\/discography(?:\s+\{[\s\S]*?\})?\s*\/-->/;

function run() {
	const trio = readScope( 'trio-era.md' );
	const connee = readScope( 'connee-solo.md' );

	// Sort matches discography.astro L5-9: trio-era first, then connee-solo.
	const scopes = [ trio, connee ];

	const totalSessions = scopes.reduce( ( n, s ) => n + s.sessions.length, 0 );
	const totalTracks = scopes.reduce(
		( n, s ) => n + s.sessions.reduce( ( m, sess ) => m + sess.tracks.length, 0 ),
		0
	);
	console.log(
		`  ${ scopes.length } scopes, ${ totalSessions } sessions, ${ totalTracks } tracks total`
	);

	const attrs = gbJson( {
		scopes,
		searchLabel: 'Search titles, matrix numbers, personnel…',
		searchPlaceholder: 'e.g. Heebie Jeebies, Brunswick, Dorsey',
	} );
	const block = `<!-- wp:bozzies/discography ${ attrs } /-->`;

	const id = findPageId( 'discography' );
	if ( ! id ) throw new Error( 'No page with slug "discography" found.' );
	console.log( `  discography id=${ id }` );

	const before = wp( [ 'post', 'get', String( id ), '--field=post_content' ] );
	console.log( `  before: ${ before.length } bytes` );

	let after;
	if ( BLOCK_RE.test( before ) ) {
		console.log( '  refreshing existing bozzies/discography block' );
		after = before.replace( BLOCK_RE, block );
	} else if ( PLACEHOLDER_RE.test( before ) ) {
		console.log( '  replacing pre-rebuild bozzies/section placeholder' );
		after = before.replace( PLACEHOLDER_RE, block );
	} else {
		throw new Error(
			'discography: neither bozzies/discography block nor the pre-rebuild placeholder found; abort.'
		);
	}
	console.log( `  after:  ${ after.length } bytes` );

	if ( after === before ) {
		console.log( '  no change (already up to date)' );
		return;
	}

	const php = `wp_update_post(['ID'=>${ id },'post_content'=>wp_slash(${ phpStr( after ) })]); echo 'OK';`;
	wp( [ 'eval', php ] );
	console.log( '  updated ok' );
}

run();
