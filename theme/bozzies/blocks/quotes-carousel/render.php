<?php
/**
 * Server-side render for bozzies/quotes-carousel.
 *
 * Based on Astro's QuotesCarousel.astro (L16-42) but with a11y edits:
 *   - Dots are plain <button>s with aria-current, no role=tab, no li wrapper,
 *     no role=tablist on parent (axe aria-required-parent / -children fail
 *     when the Astro pattern put <li> between <ol role=tablist> and the tab).
 *   - A visible Pause/Play button covers WCAG 2.2.2; pause-on-hover /
 *     pause-on-focus still work for mouse / keyboard users.
 *   - aria-live moved off .qc__viewport onto a sibling .qc__status so SRs
 *     don't hear every auto-rotation tick. JS populates .qc__status only on
 *     user action (prev / next / dot / arrow key) or Pause/Play toggle.
 *   - 24×24 CSS hit target on dots (visual circle stays small, drawn by a
 *     ::before pseudo); passes WCAG 2.5.8.
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
	<div class="qc__viewport">
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
	<div class="qc__status visually-hidden" data-status aria-live="polite" aria-atomic="true"></div>
	<div class="qc__controls">
		<button type="button" class="qc__btn" data-prev aria-label="Previous quote">
			<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M13 4 L7 10 L13 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
		</button>
		<button type="button" class="qc__btn qc__btn--play" data-playtoggle aria-label="Pause quotes" aria-pressed="false">
			<svg class="qc__icon qc__icon--pause" width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><rect x="5" y="4" width="3.6" height="12" fill="currentColor"/><rect x="11.4" y="4" width="3.6" height="12" fill="currentColor"/></svg>
			<svg class="qc__icon qc__icon--play" width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" hidden><path d="M6 4 L15 10 L6 16 Z" fill="currentColor"/></svg>
		</button>
		<div class="qc__dots" data-dots>
<?php foreach ( $quotes as $i => $q ) :
	$aria_current = ( 0 === $i ) ? ' aria-current="true"' : '';
	$label        = sprintf( 'Show quote %d of %d', $i + 1, $total );
?>
			<button type="button" class="qc__dot" data-dot="<?php echo (int) $i; ?>"<?php echo $aria_current; ?> aria-label="<?php echo esc_attr( $label ); ?>"></button>
<?php endforeach; ?>
		</div>
		<button type="button" class="qc__btn" data-next aria-label="Next quote">
			<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M7 4 L13 10 L7 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
		</button>
	</div>
</div>
