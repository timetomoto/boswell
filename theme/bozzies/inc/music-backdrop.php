<?php
/**
 * Music backdrop — server-side render helper.
 *
 * Verbatim port of ~/boswell-poc/src/components/MusicBackdrop.astro (L20-352).
 * A single helper so every block that needs a backdrop (bozzies/section,
 * bio-hero, music-teasers, release-cards, donate-teaser, sample-section,
 * page-hero) can share the same DOM and SVGs. The wrapper CSS lives in
 * assets/css/astro/music-backdrop.css.
 *
 * Two variant families:
 *   Art Deco backgrounds: sunburst, chevrons, arcs, rays, diamond-grid
 *   Jazz / New Orleans:   staves, notes, fleur, ironwork, piano-keys,
 *                         vinyl, sheet-music
 *
 * @package bozzies
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Return the exact <div class="music-backdrop"> markup Astro emits.
 *
 * @param string $variant    One of the 12 named variants. Unknown values render an empty wrapper.
 * @param float  $opacity    CSS opacity for the pattern (0-1).
 * @param string $color      CSS color value (var() references allowed).
 * @param int    $top_offset Vertical offset in px (rarely used).
 * @return string HTML.
 */
function bozzies_music_backdrop_html( $variant, $opacity, $color, $top_offset = 0 ) {
	$style = sprintf(
		'--mb-opacity:%s; --mb-color:%s; --mb-top:%dpx',
		esc_attr( (string) $opacity ),
		esc_attr( $color ),
		(int) $top_offset
	);

	$svg = bozzies_music_backdrop_svg( $variant );

	return '<div class="music-backdrop" style="' . $style . '" aria-hidden="true">' . $svg . '</div>';
}

/**
 * Return the raw SVG for a given variant, verbatim from MusicBackdrop.astro.
 * Returns an empty string for unknown variants (leaving the wrapper empty
 * so the DOM shape stays consistent).
 */
function bozzies_music_backdrop_svg( $variant ) {
	switch ( $variant ) {
		case 'sunburst':
			$lines = '';
			for ( $i = 0; $i < 36; $i++ ) {
				$a  = ( ( $i - 17.5 ) / 36 ) * M_PI;
				$x2 = cos( $a ) * 700;
				$y2 = - abs( sin( $a ) ) * 700;
				$lines .= sprintf(
					'<line x1="0" y1="0" x2="%s" y2="%s"/>',
					rtrim( rtrim( sprintf( '%.15F', $x2 ), '0' ), '.' ),
					rtrim( rtrim( sprintf( '%.15F', $y2 ), '0' ), '.' )
				);
			}
			return '<svg viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">'
				. '<defs>'
				. '<radialGradient id="sunburst-fade" cx="50%" cy="100%" r="90%">'
				. '<stop offset="0%" stop-color="var(--mb-color)" stop-opacity="0.9"/>'
				. '<stop offset="100%" stop-color="var(--mb-color)" stop-opacity="0"/>'
				. '</radialGradient>'
				. '</defs>'
				. '<g fill="none" stroke="var(--mb-color)" stroke-width="0.6" transform="translate(400 600)">'
				. $lines
				. '<circle cx="0" cy="0" r="40" opacity="0.55"/>'
				. '<circle cx="0" cy="0" r="80" opacity="0.35"/>'
				. '<circle cx="0" cy="0" r="120" opacity="0.2"/>'
				. '</g>'
				. '</svg>';

		case 'chevrons':
			return '<svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">'
				. '<defs><pattern id="chev" width="80" height="40" patternUnits="userSpaceOnUse">'
				. '<g fill="none" stroke="var(--mb-color)" stroke-width="0.7">'
				. '<path d="M0 20 L20 4 L40 20 L60 4 L80 20"/>'
				. '<path d="M0 36 L20 20 L40 36 L60 20 L80 36" opacity="0.6"/>'
				. '</g></pattern></defs>'
				. '<rect width="100%" height="100%" fill="url(#chev)"/></svg>';

		case 'arcs':
			return '<svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">'
				. '<defs><pattern id="arcs" width="120" height="120" patternUnits="userSpaceOnUse">'
				. '<g fill="none" stroke="var(--mb-color)" stroke-width="0.6">'
				. '<path d="M0 60 A 60 60 0 0 1 120 60"/>'
				. '<path d="M0 60 A 44 44 0 0 1 120 60" opacity="0.7"/>'
				. '<path d="M0 60 A 28 28 0 0 1 120 60" opacity="0.5"/>'
				. '<path d="M0 60 A 12 12 0 0 1 120 60" opacity="0.35"/>'
				. '</g></pattern></defs>'
				. '<rect width="100%" height="100%" fill="url(#arcs)"/></svg>';

		case 'rays':
			$lines = '';
			for ( $i = 0; $i < 22; $i++ ) {
				$x = $i * 30;
				$lines .= '<line x1="' . $x . '" y1="0" x2="' . $x . '" y2="400"/>';
			}
			return '<svg viewBox="0 0 600 400" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">'
				. '<g fill="none" stroke="var(--mb-color)" stroke-width="0.55">'
				. $lines
				. '</g></svg>';

		case 'diamond-grid':
			return '<svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">'
				. '<defs><pattern id="dg" width="60" height="60" patternUnits="userSpaceOnUse">'
				. '<g fill="none" stroke="var(--mb-color)" stroke-width="0.6">'
				. '<path d="M30 0 L60 30 L30 60 L0 30 Z"/>'
				. '<path d="M30 20 L40 30 L30 40 L20 30 Z" opacity="0.55"/>'
				. '<circle cx="30" cy="30" r="1.4" fill="var(--mb-color)" stroke="none"/>'
				. '</g></pattern></defs>'
				. '<rect width="100%" height="100%" fill="url(#dg)"/></svg>';

		case 'piano-keys':
			return '<svg viewBox="0 0 480 200" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">'
				. '<defs><pattern id="pianoKeys" width="252" height="120" patternUnits="userSpaceOnUse">'
				. '<g fill="none" stroke="var(--mb-color)" stroke-width="1">'
				. '<rect x="0" y="0" width="252" height="120"/>'
				. '<line x1="21" y1="0" x2="21" y2="120"/>'
				. '<line x1="42" y1="0" x2="42" y2="120"/>'
				. '<line x1="63" y1="0" x2="63" y2="120"/>'
				. '<line x1="84" y1="0" x2="84" y2="120"/>'
				. '<line x1="105" y1="0" x2="105" y2="120"/>'
				. '<line x1="126" y1="0" x2="126" y2="120"/>'
				. '<line x1="147" y1="0" x2="147" y2="120"/>'
				. '<line x1="168" y1="0" x2="168" y2="120"/>'
				. '<line x1="189" y1="0" x2="189" y2="120"/>'
				. '<line x1="210" y1="0" x2="210" y2="120"/>'
				. '<line x1="231" y1="0" x2="231" y2="120"/>'
				. '</g>'
				. '<g fill="var(--mb-color)" fill-opacity="0.9">'
				. '<rect x="14" y="0" width="14" height="70"/>'
				. '<rect x="35" y="0" width="14" height="70"/>'
				. '<rect x="77" y="0" width="14" height="70"/>'
				. '<rect x="98" y="0" width="14" height="70"/>'
				. '<rect x="119" y="0" width="14" height="70"/>'
				. '<rect x="161" y="0" width="14" height="70"/>'
				. '<rect x="182" y="0" width="14" height="70"/>'
				. '<rect x="224" y="0" width="14" height="70"/>'
				. '<rect x="245" y="0" width="14" height="70"/>'
				. '</g></pattern></defs>'
				. '<rect width="100%" height="100%" fill="url(#pianoKeys)"/></svg>';

		case 'vinyl':
			return '<svg viewBox="0 0 640 400" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">'
				. '<defs><pattern id="vinyl" width="440" height="440" patternUnits="userSpaceOnUse">'
				. '<g fill="none" stroke="var(--mb-color)" stroke-width="0.9" transform="translate(220 220)">'
				. '<circle r="210"/>'
				. '<circle r="196" stroke-width="0.6"/>'
				. '<circle r="182" stroke-width="0.6"/>'
				. '<circle r="168" stroke-width="0.6"/>'
				. '<circle r="154" stroke-width="0.6"/>'
				. '<circle r="140" stroke-width="0.6"/>'
				. '<circle r="126" stroke-width="0.6"/>'
				. '<circle r="112" stroke-width="0.6"/>'
				. '<circle r="98" stroke-width="0.6"/>'
				. '<circle r="84" stroke-width="0.6"/>'
				. '<circle r="70" stroke-width="0.7"/>'
				. '<circle r="56" stroke-width="1.4"/>'
				. '<circle r="40" stroke-width="0.7"/>'
				. '<circle r="4" fill="var(--mb-color)" stroke="none"/>'
				. '</g></pattern></defs>'
				. '<rect width="100%" height="100%" fill="url(#vinyl)"/></svg>';

		case 'sheet-music':
			return '<svg viewBox="0 0 600 400" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">'
				. '<defs><pattern id="sheet" width="600" height="200" patternUnits="userSpaceOnUse">'
				. '<g fill="none" stroke="var(--mb-color)" stroke-width="0.6">'
				. '<g transform="translate(0 30)">'
				. '<line x1="10" y1="0" x2="590" y2="0"/>'
				. '<line x1="10" y1="6" x2="590" y2="6"/>'
				. '<line x1="10" y1="12" x2="590" y2="12"/>'
				. '<line x1="10" y1="18" x2="590" y2="18"/>'
				. '<line x1="10" y1="24" x2="590" y2="24"/>'
				. '<line x1="10" y1="-2" x2="10" y2="26"/>'
				. '<line x1="590" y1="-2" x2="590" y2="26" stroke-width="0.9"/>'
				. '<g transform="translate(28 12)" stroke-width="0.9">'
				. '<path d="M4 -14 C -4 -8, -6 4, 6 8 C 14 10, 14 -2, 6 -6 C -2 -10, -4 12, 4 16 C 12 20, 14 12, 12 8"/>'
				. '</g>'
				. '<g fill="var(--mb-color)" stroke="var(--mb-color)" stroke-width="0.5">'
				. '<ellipse cx="72" cy="18" rx="3.6" ry="2.4" transform="rotate(-18 72 18)"/>'
				. '<line x1="75" y1="17" x2="75" y2="-4" stroke-width="0.8" fill="none"/>'
				. '<ellipse cx="94" cy="12" rx="3.6" ry="2.4" transform="rotate(-18 94 12)"/>'
				. '<line x1="97" y1="11" x2="97" y2="-8" stroke-width="0.8" fill="none"/>'
				. '<line x1="74" y1="-4" x2="98" y2="-8" stroke-width="1.6" fill="none"/>'
				. '<ellipse cx="130" cy="18" rx="3.6" ry="2.4" transform="rotate(-18 130 18)"/>'
				. '<line x1="133" y1="17" x2="133" y2="-4" stroke-width="0.8" fill="none"/>'
				. '<ellipse cx="160" cy="6" rx="3.6" ry="2.4" transform="rotate(-18 160 6)" fill="none" stroke-width="0.9"/>'
				. '<line x1="163" y1="4" x2="163" y2="-16" stroke-width="0.8" fill="none"/>'
				. '<ellipse cx="200" cy="12" rx="3.6" ry="2.4" transform="rotate(-18 200 12)"/>'
				. '<line x1="203" y1="11" x2="203" y2="-8" stroke-width="0.8" fill="none"/>'
				. '<ellipse cx="230" cy="18" rx="3.6" ry="2.4" transform="rotate(-18 230 18)"/>'
				. '<line x1="233" y1="17" x2="233" y2="-4" stroke-width="0.8" fill="none"/>'
				. '<ellipse cx="266" cy="12" rx="3.6" ry="2.4" transform="rotate(-18 266 12)"/>'
				. '<line x1="269" y1="11" x2="269" y2="-8" stroke-width="0.8" fill="none"/>'
				. '<ellipse cx="286" cy="6" rx="3.6" ry="2.4" transform="rotate(-18 286 6)"/>'
				. '<line x1="289" y1="5" x2="289" y2="-14" stroke-width="0.8" fill="none"/>'
				. '<line x1="268" y1="-8" x2="290" y2="-14" stroke-width="1.6" fill="none"/>'
				. '<line x1="320" y1="0" x2="320" y2="24" stroke-width="0.7" fill="none"/>'
				. '<ellipse cx="358" cy="12" rx="3.6" ry="2.4" transform="rotate(-18 358 12)"/>'
				. '<line x1="361" y1="11" x2="361" y2="-8" stroke-width="0.8" fill="none"/>'
				. '<ellipse cx="400" cy="18" rx="3.6" ry="2.4" transform="rotate(-18 400 18)"/>'
				. '<line x1="403" y1="17" x2="403" y2="-4" stroke-width="0.8" fill="none"/>'
				. '<ellipse cx="440" cy="6" rx="3.6" ry="2.4" transform="rotate(-18 440 6)" fill="none" stroke-width="0.9"/>'
				. '<line x1="443" y1="4" x2="443" y2="-16" stroke-width="0.8" fill="none"/>'
				. '</g></g>'
				. '<g transform="translate(0 130)">'
				. '<line x1="10" y1="0" x2="590" y2="0"/>'
				. '<line x1="10" y1="6" x2="590" y2="6"/>'
				. '<line x1="10" y1="12" x2="590" y2="12"/>'
				. '<line x1="10" y1="18" x2="590" y2="18"/>'
				. '<line x1="10" y1="24" x2="590" y2="24"/>'
				. '<line x1="10" y1="-2" x2="10" y2="26"/>'
				. '<line x1="590" y1="-2" x2="590" y2="26" stroke-width="0.9"/>'
				. '<g fill="var(--mb-color)" stroke="var(--mb-color)" stroke-width="0.5">'
				. '<ellipse cx="60" cy="18" rx="3.6" ry="2.4" transform="rotate(-18 60 18)"/>'
				. '<line x1="63" y1="17" x2="63" y2="-4" stroke-width="0.8" fill="none"/>'
				. '<ellipse cx="120" cy="12" rx="3.6" ry="2.4" transform="rotate(-18 120 12)"/>'
				. '<line x1="123" y1="11" x2="123" y2="-8" stroke-width="0.8" fill="none"/>'
				. '<ellipse cx="180" cy="18" rx="3.6" ry="2.4" transform="rotate(-18 180 18)"/>'
				. '<line x1="183" y1="17" x2="183" y2="-4" stroke-width="0.8" fill="none"/>'
				. '<ellipse cx="240" cy="6" rx="3.6" ry="2.4" transform="rotate(-18 240 6)" fill="none" stroke-width="0.9"/>'
				. '<line x1="243" y1="4" x2="243" y2="-16" stroke-width="0.8" fill="none"/>'
				. '<ellipse cx="300" cy="12" rx="3.6" ry="2.4" transform="rotate(-18 300 12)"/>'
				. '<line x1="303" y1="11" x2="303" y2="-8" stroke-width="0.8" fill="none"/>'
				. '<ellipse cx="360" cy="18" rx="3.6" ry="2.4" transform="rotate(-18 360 18)"/>'
				. '<line x1="363" y1="17" x2="363" y2="-4" stroke-width="0.8" fill="none"/>'
				. '<ellipse cx="420" cy="6" rx="3.6" ry="2.4" transform="rotate(-18 420 6)"/>'
				. '<line x1="423" y1="5" x2="423" y2="-14" stroke-width="0.8" fill="none"/>'
				. '<ellipse cx="480" cy="12" rx="3.6" ry="2.4" transform="rotate(-18 480 12)"/>'
				. '<line x1="483" y1="11" x2="483" y2="-8" stroke-width="0.8" fill="none"/>'
				. '</g></g>'
				. '</g></pattern></defs>'
				. '<rect width="100%" height="100%" fill="url(#sheet)"/></svg>';

		case 'staves':
			return '<svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">'
				. '<defs><pattern id="staves" width="400" height="120" patternUnits="userSpaceOnUse">'
				. '<g fill="none" stroke="var(--mb-color)" stroke-width="0.5">'
				. '<line x1="0" y1="10" x2="400" y2="10"/>'
				. '<line x1="0" y1="24" x2="400" y2="24"/>'
				. '<line x1="0" y1="38" x2="400" y2="38"/>'
				. '<line x1="0" y1="52" x2="400" y2="52"/>'
				. '<line x1="0" y1="66" x2="400" y2="66"/>'
				. '</g>'
				. '<g fill="var(--mb-color)" stroke="var(--mb-color)" stroke-width="0.4">'
				. '<ellipse cx="60" cy="45" rx="5" ry="3.6" transform="rotate(-18 60 45)"/>'
				. '<line x1="64" y1="43" x2="64" y2="10" fill="none"/>'
				. '<ellipse cx="140" cy="31" rx="5" ry="3.6" transform="rotate(-18 140 31)"/>'
				. '<line x1="144" y1="29" x2="144" y2="0" fill="none"/>'
				. '<ellipse cx="220" cy="52" rx="5" ry="3.6" transform="rotate(-18 220 52)"/>'
				. '<line x1="224" y1="50" x2="224" y2="18" fill="none"/>'
				. '<ellipse cx="290" cy="38" rx="5" ry="3.6" transform="rotate(-18 290 38)"/>'
				. '<line x1="294" y1="36" x2="294" y2="4" fill="none"/>'
				. '<ellipse cx="350" cy="59" rx="5" ry="3.6" transform="rotate(-18 350 59)"/>'
				. '<line x1="354" y1="57" x2="354" y2="24" fill="none"/>'
				. '</g></pattern></defs>'
				. '<rect width="100%" height="100%" fill="url(#staves)"/></svg>';

		case 'notes':
			return '<svg viewBox="0 0 240 240" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">'
				. '<defs><pattern id="notes" width="240" height="240" patternUnits="userSpaceOnUse">'
				. '<g fill="var(--mb-color)" stroke="var(--mb-color)" stroke-width="0.5">'
				. '<g transform="translate(40 60)">'
				. '<ellipse cx="0" cy="26" rx="6" ry="4.4" transform="rotate(-20 0 26)"/>'
				. '<line x1="5" y1="24" x2="5" y2="-8" stroke-width="1" fill="none"/>'
				. '<path d="M5 -8 C 14 -4, 16 2, 13 12" stroke-width="1" fill="none"/>'
				. '</g>'
				. '<g transform="translate(140 40)">'
				. '<ellipse cx="0" cy="30" rx="6" ry="4.4" transform="rotate(-20 0 30)"/>'
				. '<ellipse cx="26" cy="26" rx="6" ry="4.4" transform="rotate(-20 26 26)"/>'
				. '<line x1="5" y1="28" x2="5" y2="-4" stroke-width="1"/>'
				. '<line x1="31" y1="24" x2="31" y2="-8" stroke-width="1"/>'
				. '<line x1="4" y1="-4" x2="32" y2="-8" stroke-width="2.2"/>'
				. '</g>'
				. '<g transform="translate(60 150)">'
				. '<ellipse cx="0" cy="24" rx="6" ry="4.4" transform="rotate(-20 0 24)"/>'
				. '<line x1="5" y1="22" x2="5" y2="-10" stroke-width="1.2"/>'
				. '</g>'
				. '<g transform="translate(180 130)" opacity="0.9">'
				. '<path d="M0 40 C -8 30, -8 18, 0 12 C 8 6, 14 14, 10 22 C 6 30, -4 30, -4 22 C -4 12, 6 -6, 6 -14 C 6 -20, -2 -22, -6 -18" fill="none" stroke="var(--mb-color)" stroke-width="1.2"/>'
				. '</g>'
				. '</g></pattern></defs>'
				. '<rect width="100%" height="100%" fill="url(#notes)"/></svg>';

		case 'fleur':
			return '<svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">'
				. '<defs><pattern id="fleur" width="200" height="200" patternUnits="userSpaceOnUse">'
				. '<g fill="none" stroke="var(--mb-color)" stroke-width="0.7" transform="translate(100 100)">'
				. '<path d="M0 -40 C 6 -30, 4 -16, 0 -10 C -4 -16, -6 -30, 0 -40 Z"/>'
				. '<path d="M0 -10 C 14 -22, 22 -8, 16 4 C 10 -2, 4 -4, 0 -6"/>'
				. '<path d="M0 -10 C -14 -22, -22 -8, -16 4 C -10 -2, -4 -4, 0 -6"/>'
				. '<line x1="-18" y1="8" x2="18" y2="8"/>'
				. '<path d="M0 8 L 0 28"/>'
				. '<path d="M-8 20 L 8 20"/>'
				. '</g></pattern></defs>'
				. '<rect width="100%" height="100%" fill="url(#fleur)"/></svg>';

		case 'ironwork':
			return '<svg viewBox="0 0 160 160" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">'
				. '<defs><pattern id="iron" width="160" height="160" patternUnits="userSpaceOnUse">'
				. '<g fill="none" stroke="var(--mb-color)" stroke-width="0.6">'
				. '<circle cx="40" cy="40" r="24"/>'
				. '<circle cx="120" cy="40" r="24"/>'
				. '<circle cx="40" cy="120" r="24"/>'
				. '<circle cx="120" cy="120" r="24"/>'
				. '<circle cx="80" cy="80" r="20" opacity="0.7"/>'
				. '<path d="M40 16 C 60 24, 60 56, 40 64 M120 16 C 100 24, 100 56, 120 64" opacity="0.5"/>'
				. '</g></pattern></defs>'
				. '<rect width="100%" height="100%" fill="url(#iron)"/></svg>';

		default:
			return '';
	}
}

/**
 * Astro's per-usage default values (opacity + color).
 *
 * Sourced from every `<MusicBackdrop … />` call on the live site
 * (see `~/boswell-poc/src/pages/**` grep). Colors are stored as
 * WP custom-property tokens so palette changes flow through.
 *
 * Blocks that need a specific opacity/color (e.g. bio-hero uses
 * yellow-soft not purple) should pass their own values instead of
 * using these defaults.
 */
function bozzies_music_backdrop_defaults( $variant ) {
	$defaults = array(
		'sunburst'     => array( 'opacity' => 0.055, 'color' => 'currentColor' ),
		'chevrons'     => array( 'opacity' => 0.055, 'color' => 'currentColor' ),
		'arcs'         => array( 'opacity' => 0.055, 'color' => 'currentColor' ),
		'rays'         => array( 'opacity' => 0.055, 'color' => 'currentColor' ),
		'diamond-grid' => array( 'opacity' => 0.08,  'color' => 'var(--wp--preset--color--purple)' ),
		'piano-keys'   => array( 'opacity' => 0.055, 'color' => 'currentColor' ),
		'vinyl'        => array( 'opacity' => 0.05,  'color' => 'var(--wp--preset--color--purple)' ),
		'sheet-music'  => array( 'opacity' => 0.055, 'color' => 'currentColor' ),
		'staves'       => array( 'opacity' => 0.06,  'color' => 'var(--wp--preset--color--purple)' ),
		'notes'        => array( 'opacity' => 0.09,  'color' => 'var(--wp--custom--color--yellow-soft)' ),
		'fleur'        => array( 'opacity' => 0.055, 'color' => 'currentColor' ),
		'ironwork'     => array( 'opacity' => 0.055, 'color' => 'currentColor' ),
	);
	return isset( $defaults[ $variant ] ) ? $defaults[ $variant ] : array( 'opacity' => 0.055, 'color' => 'currentColor' );
}
