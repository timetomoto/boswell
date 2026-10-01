<?php
/**
 * Server-side render for bozzies/quotes-carousel.
 *
 * Emits Astro's exact DOM verbatim from
 * ~/boswell-poc/src/components/QuotesCarousel.astro lines 16-42.
 *
 * The quotes array is stored on the block attribute. Front-end JS lives at
 * assets/js/quotes-carousel.js (verbatim port of QuotesCarousel.astro L44-91)
 * and reads slides + dots directly from the DOM rather than a JSON blob.
 *
 * @package bozzies
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$attrs = wp_parse_args(
	isset( $attributes ) && is_array( $attributes ) ? $attributes : array(),
	array(
		'quotes'     => array(),
		'intervalMs' => 7000,
	)
);

$quotes = is_array( $attrs['quotes'] ) ? $attrs['quotes'] : array();
if ( empty( $quotes ) ) {
	return;
}
$interval = (int) $attrs['intervalMs'];
if ( $interval <= 0 ) {
	$interval = 7000;
}

$anchor    = ( isset( $attributes['anchor'] ) && $attributes['anchor'] ) ? ' id="' . esc_attr( $attributes['anchor'] ) . '"' : '';
$extra_cls = ( isset( $attributes['className'] ) && $attributes['className'] ) ? ' ' . esc_attr( $attributes['className'] ) : '';

$total = count( $quotes );
?>
<div<?php echo $anchor; ?> class="qc<?php echo $extra_cls; ?>" data-carousel data-interval="<?php echo esc_attr( (string) $interval ); ?>" role="region" aria-roledescription="carousel" aria-label="Quotes about the Boswell Sisters" tabindex="0">
	<div class="qc__viewport" aria-live="polite" aria-atomic="true">
<?php foreach ( $quotes as $i => $q ) :
	$text        = isset( $q['text'] )        ? (string) $q['text']        : '';
	$attribution = isset( $q['attribution'] ) ? (string) $q['attribution'] : '';
	$is_first    = ( 0 === $i );
	$active      = $is_first ? 'true' : 'false';
	$hidden      = $is_first ? 'false' : 'true';
?>
		<figure class="qc__slide" data-slide="<?php echo (int) $i; ?>" aria-hidden="<?php echo esc_attr( $hidden ); ?>" data-active="<?php echo esc_attr( $active ); ?>">
			<blockquote class="qc__quote">
				<span aria-hidden="true">&ldquo;</span><?php echo esc_html( html_entity_decode( $text, ENT_QUOTES | ENT_HTML5, 'UTF-8' ) ); ?><span aria-hidden="true">&rdquo;</span>
			</blockquote>
			<figcaption class="qc__attr">&mdash; <?php echo esc_html( html_entity_decode( $attribution, ENT_QUOTES | ENT_HTML5, 'UTF-8' ) ); ?></figcaption>
		</figure>
<?php endforeach; ?>
	</div>
	<div class="qc__controls">
		<button type="button" class="qc__btn" data-prev aria-label="Previous quote">
			<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M13 4 L7 10 L13 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
		</button>
		<ol class="qc__dots" data-dots role="tablist" aria-label="Choose a quote">
<?php foreach ( $quotes as $i => $q ) :
	$selected = ( 0 === $i ) ? 'true' : 'false';
	$label    = sprintf( 'Quote %d of %d', $i + 1, $total );
?>
			<li>
				<button type="button" class="qc__dot" data-dot="<?php echo (int) $i; ?>" role="tab" aria-selected="<?php echo esc_attr( $selected ); ?>" aria-label="<?php echo esc_attr( $label ); ?>"></button>
			</li>
<?php endforeach; ?>
		</ol>
		<button type="button" class="qc__btn" data-next aria-label="Next quote">
			<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M7 4 L13 10 L7 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
		</button>
	</div>
</div>
