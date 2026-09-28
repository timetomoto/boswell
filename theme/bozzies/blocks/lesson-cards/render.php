<?php
/**
 * Server-side render for bozzies/lesson-cards.
 *
 * Emits Astro's exact DOM verbatim from
 * ~/boswell-poc/src/pages/media/index.astro lines 65-96 (the
 * <section class="section ground-paper lessons-grid"> wrapper with
 * <div class="container"> holding a <header class="lessons-grid__head">
 * and <ol class="lessons-cards" role="list"> of lesson-card children).
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
		'lede'    => '',
	)
);

$anchor    = ( isset( $attributes['anchor'] ) && $attributes['anchor'] ) ? ' id="' . esc_attr( $attributes['anchor'] ) . '"' : '';
$extra_cls = ( isset( $attributes['className'] ) && $attributes['className'] ) ? ' ' . esc_attr( $attributes['className'] ) : '';

// Decode HTML entities on string attrs so curly glyphs survive round-trips.
$eyebrow = html_entity_decode( $attrs['eyebrow'], ENT_QUOTES | ENT_HTML5, 'UTF-8' );
$title   = html_entity_decode( $attrs['title'], ENT_QUOTES | ENT_HTML5, 'UTF-8' );
$lede    = html_entity_decode( $attrs['lede'], ENT_QUOTES | ENT_HTML5, 'UTF-8' );
?>
<section<?php echo $anchor; ?> class="section ground-paper lessons-grid<?php echo $extra_cls; ?>">
	<div class="container">
		<header class="lessons-grid__head">
			<?php if ( $eyebrow ) : ?>
				<span class="eyebrow eyebrow--purple"><?php echo esc_html( $eyebrow ); ?></span>
			<?php endif; ?>
			<?php if ( $title ) : ?>
				<h2 class="lessons-grid__title"><?php echo esc_html( $title ); ?></h2>
			<?php endif; ?>
			<?php if ( $lede ) : ?>
				<p class="lessons-grid__lede"><?php echo esc_html( $lede ); ?></p>
			<?php endif; ?>
		</header>
		<ol class="lessons-cards" role="list">
<?php echo $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- InnerBlocks output. ?>
		</ol>
	</div>
</section>
