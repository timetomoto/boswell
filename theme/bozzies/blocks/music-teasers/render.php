<?php
/**
 * Server-side render for bozzies/music-teasers.
 *
 * Emits Astro's exact DOM verbatim from
 * ~/boswell-poc/src/pages/media/index.astro lines 98-139 (the
 * <section class="section ground-gold music-teasers"> wrapper with a
 * <MusicBackdrop variant="vinyl" opacity={0.08} color="var(--purple)" />
 * followed by <div class="container music-teasers__grid">).
 *
 * The vinyl SVG below is verbatim from MusicBackdrop.astro lines 137-164.
 *
 * @package bozzies
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$anchor    = ( isset( $attributes['anchor'] ) && $attributes['anchor'] ) ? ' id="' . esc_attr( $attributes['anchor'] ) . '"' : '';
$extra_cls = ( isset( $attributes['className'] ) && $attributes['className'] ) ? ' ' . esc_attr( $attributes['className'] ) : '';
?>
<section<?php echo $anchor; ?> class="section ground-gold music-teasers<?php echo $extra_cls; ?>">
	<div class="music-backdrop" style="--mb-opacity:0.08; --mb-color:var(--purple); --mb-top:0px" aria-hidden="true">
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
	<div class="container music-teasers__grid">
<?php echo $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- InnerBlocks output. ?>
	</div>
</section>
