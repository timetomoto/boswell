<?php
/**
 * Server-side render for bozzies/pull-quote.
 *
 * Emits Astro's exact DOM verbatim from
 * ~/boswell-poc/src/components/PullQuote.astro lines 4-9, wrapped in the
 * <section class="section ground-purple"> + <div class="container"> shell
 * used by sisters/index.astro L76-83, career-timeline.astro L24-30, and
 * bio-resources.astro L22-28.
 *
 * The optional "notes" music-backdrop SVG is inlined verbatim from
 * ~/boswell-poc/src/components/MusicBackdrop.astro lines 279-313 with
 * `--mb-opacity:0.10; --mb-color:var(--yellow-soft)` matching
 * sisters/index.astro L77.
 *
 * @package bozzies
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$attrs = wp_parse_args(
	isset( $attributes ) && is_array( $attributes ) ? $attributes : array(),
	array(
		'quote'       => '',
		'attribution' => '',
		'backdrop'    => 'none',
	)
);

$anchor    = ( isset( $attributes['anchor'] ) && $attributes['anchor'] ) ? ' id="' . esc_attr( $attributes['anchor'] ) . '"' : '';
$extra_cls = ( isset( $attributes['className'] ) && $attributes['className'] ) ? ' ' . esc_attr( $attributes['className'] ) : '';

// String attrs may carry HTML entities from Astro markdown; decode to Unicode
// so the browser sees the intended glyphs (curly quotes, en/em dashes).
$quote       = html_entity_decode( (string) $attrs['quote'], ENT_QUOTES | ENT_HTML5, 'UTF-8' );
$attribution = html_entity_decode( (string) $attrs['attribution'], ENT_QUOTES | ENT_HTML5, 'UTF-8' );
$backdrop    = ( isset( $attrs['backdrop'] ) && 'notes' === $attrs['backdrop'] ) ? 'notes' : 'none';
?>
<section<?php echo $anchor; ?> class="section ground-purple<?php echo $extra_cls; ?>">
<?php if ( 'notes' === $backdrop ) : ?>
	<div class="music-backdrop" style="--mb-opacity:0.1; --mb-color:var(--yellow-soft); --mb-top:0px" aria-hidden="true">
		<svg viewBox="0 0 240 240" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
			<defs>
				<pattern id="notes" width="240" height="240" patternUnits="userSpaceOnUse">
					<g fill="var(--mb-color)" stroke="var(--mb-color)" stroke-width="0.5">
						<g transform="translate(40 60)">
							<ellipse cx="0" cy="26" rx="6" ry="4.4" transform="rotate(-20 0 26)"/>
							<line x1="5" y1="24" x2="5" y2="-8" stroke-width="1" fill="none"/>
							<path d="M5 -8 C 14 -4, 16 2, 13 12" stroke-width="1" fill="none"/>
						</g>
						<g transform="translate(140 40)">
							<ellipse cx="0" cy="30" rx="6" ry="4.4" transform="rotate(-20 0 30)"/>
							<ellipse cx="26" cy="26" rx="6" ry="4.4" transform="rotate(-20 26 26)"/>
							<line x1="5" y1="28" x2="5" y2="-4" stroke-width="1"/>
							<line x1="31" y1="24" x2="31" y2="-8" stroke-width="1"/>
							<line x1="4" y1="-4" x2="32" y2="-8" stroke-width="2.2"/>
						</g>
						<g transform="translate(60 150)">
							<ellipse cx="0" cy="24" rx="6" ry="4.4" transform="rotate(-20 0 24)"/>
							<line x1="5" y1="22" x2="5" y2="-10" stroke-width="1.2"/>
						</g>
						<g transform="translate(180 130)" opacity="0.9">
							<path d="M0 40 C -8 30, -8 18, 0 12 C 8 6, 14 14, 10 22 C 6 30, -4 30, -4 22 C -4 12, 6 -6, 6 -14 C 6 -20, -2 -22, -6 -18"
								fill="none" stroke="var(--mb-color)" stroke-width="1.2"/>
						</g>
					</g>
				</pattern>
			</defs>
			<rect width="100%" height="100%" fill="url(#notes)"/>
		</svg>
	</div>
<?php endif; ?>
	<div class="container">
		<figure class="pull-quote">
			<blockquote class="pull-quote__quote"><?php echo esc_html( $quote ); ?></blockquote>
<?php if ( '' !== $attribution ) : ?>
			<figcaption class="pull-quote__attr">— <?php echo esc_html( $attribution ); ?></figcaption>
<?php endif; ?>
		</figure>
	</div>
</section>
