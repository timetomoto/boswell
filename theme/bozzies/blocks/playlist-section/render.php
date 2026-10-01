<?php
/**
 * Server-side render for bozzies/playlist-section.
 *
 * Emits Astro's exact DOM verbatim from
 * ~/boswell-poc/src/pages/index.astro lines 56-66 (the Music Playlist
 * section on the home page). Header holds eyebrow / title / blurb from
 * block attributes; inner blocks hold the playlist player (or a
 * placeholder paragraph until the interactive block ships).
 *
 * The vinyl music-backdrop SVG is inlined verbatim from
 * ~/boswell-poc/src/components/MusicBackdrop.astro lines 137-164 with
 * `--mb-opacity:0.05; --mb-color:var(--purple)` matching index.astro L57.
 *
 * @package bozzies
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$attrs = wp_parse_args(
	isset( $attributes ) && is_array( $attributes ) ? $attributes : array(),
	array(
		'eyebrow' => '',
		'title'   => '',
		'blurb'   => '',
	)
);

$anchor    = ( isset( $attributes['anchor'] ) && $attributes['anchor'] ) ? ' id="' . esc_attr( $attributes['anchor'] ) . '"' : '';
$extra_cls = ( isset( $attributes['className'] ) && $attributes['className'] ) ? ' ' . esc_attr( $attributes['className'] ) : '';

// String attrs may carry HTML entities from Astro markdown; decode to Unicode
// so the browser sees the intended glyphs (curly quotes, en/em dashes).
$eyebrow = html_entity_decode( (string) $attrs['eyebrow'], ENT_QUOTES | ENT_HTML5, 'UTF-8' );
$title   = html_entity_decode( (string) $attrs['title'],   ENT_QUOTES | ENT_HTML5, 'UTF-8' );
$blurb   = html_entity_decode( (string) $attrs['blurb'],   ENT_QUOTES | ENT_HTML5, 'UTF-8' );
?>
<section<?php echo $anchor; ?> class="section ground-paper playlist-section<?php echo $extra_cls; ?>">
	<div class="music-backdrop" style="--mb-opacity:0.05; --mb-color:var(--purple); --mb-top:0px" aria-hidden="true">
		<svg viewBox="0 0 640 400" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
			<defs>
				<pattern id="vinyl" width="440" height="440" patternUnits="userSpaceOnUse">
					<g fill="none" stroke="var(--mb-color)" stroke-width="0.9" transform="translate(220 220)">
						<circle r="210"/>
						<circle r="196" stroke-width="0.6"/>
						<circle r="182" stroke-width="0.6"/>
						<circle r="168" stroke-width="0.6"/>
						<circle r="154" stroke-width="0.6"/>
						<circle r="140" stroke-width="0.6"/>
						<circle r="126" stroke-width="0.6"/>
						<circle r="112" stroke-width="0.6"/>
						<circle r="98" stroke-width="0.6"/>
						<circle r="84" stroke-width="0.6"/>
						<circle r="70" stroke-width="0.7"/>
						<circle r="56" stroke-width="1.4"/>
						<circle r="40" stroke-width="0.7"/>
						<circle r="4" fill="var(--mb-color)" stroke="none"/>
					</g>
				</pattern>
			</defs>
			<rect width="100%" height="100%" fill="url(#vinyl)"/>
		</svg>
	</div>
	<div class="container">
		<header class="playlist-section__head">
<?php if ( '' !== $eyebrow ) : ?>
			<span class="eyebrow eyebrow--purple"><?php echo esc_html( $eyebrow ); ?></span>
<?php endif; ?>
<?php if ( '' !== $title ) : ?>
			<h2 class="playlist-section__title"><?php echo esc_html( $title ); ?></h2>
<?php endif; ?>
<?php if ( '' !== $blurb ) : ?>
			<p class="playlist-section__blurb"><?php echo esc_html( $blurb ); ?></p>
<?php endif; ?>
		</header>
<?php echo $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- InnerBlocks output. ?>
	</div>
</section>
