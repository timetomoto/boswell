<?php
/**
 * Server-side render for bozzies/lesson-card.
 *
 * Emits Astro's exact DOM verbatim from
 * ~/boswell-poc/src/pages/media/index.astro lines 73-93 (one
 * <li class="lesson-card"> containing a <a class="lesson-card__link">
 * with .lesson-card__num, .lesson-card__body, and .lesson-card__cta).
 *
 * @package bozzies
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$attrs = wp_parse_args(
	isset( $attributes ) && is_array( $attributes ) ? $attributes : array(),
	array(
		'order'    => 1,
		'title'    => '',
		'summary'  => '',
		'href'     => '',
		'ctaLabel' => 'Listen',
	)
);

// Astro's play-circle SVG (media/index.astro L85-88).
$play_svg = '<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="none" stroke="currentColor" stroke-width="1"/><path d="M9 7 L17 12 L9 17 Z" fill="currentColor"/></svg>';

$href     = $attrs['href'] ? esc_url( $attrs['href'] ) : '#';
$order    = (int) $attrs['order'];
$order_2d = str_pad( (string) $order, 2, '0', STR_PAD_LEFT );
// Decode HTML entities so curly glyphs survive round-trips.
$title    = html_entity_decode( $attrs['title'], ENT_QUOTES | ENT_HTML5, 'UTF-8' );
$summary  = html_entity_decode( $attrs['summary'], ENT_QUOTES | ENT_HTML5, 'UTF-8' );
$ctaLabel = html_entity_decode( $attrs['ctaLabel'], ENT_QUOTES | ENT_HTML5, 'UTF-8' );
?>
<li class="lesson-card">
	<a href="<?php echo $href; ?>" class="lesson-card__link">
		<div class="lesson-card__num">
			<span class="lesson-card__num-label">Lesson</span>
			<span class="lesson-card__num-value"><?php echo esc_html( $order_2d ); ?></span>
		</div>
		<div class="lesson-card__body">
			<h3 class="lesson-card__title"><?php echo esc_html( $title ); ?></h3>
			<?php if ( $summary ) : ?>
				<p class="lesson-card__summary"><?php echo esc_html( $summary ); ?></p>
			<?php endif; ?>
		</div>
		<div class="lesson-card__cta">
			<?php echo $play_svg; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- static SVG. ?>
			<span><?php echo esc_html( $ctaLabel ); ?></span>
		</div>
	</a>
</li>
