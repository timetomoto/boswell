<?php
/**
 * Server-side render for bozzies/prose-body.
 *
 * Emits Astro's exact DOM verbatim from
 *   ~/boswell-poc/src/pages/media/charts.astro   L21-25
 *   ~/boswell-poc/src/pages/media/reviews.astro  L21-25
 *
 *   <section class="section ground-paper">
 *     <div class="container-narrow prose {variant}-body">
 *       <PageContent />
 *     </div>
 *   </section>
 *
 * The `variant` attr (`"charts"` / `"reviews"` / `"generic"`) picks the
 * page-specific typography scoped in assets/css/astro/prose-body.css.
 *
 * @package bozzies
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$attrs = wp_parse_args(
	isset( $attributes ) && is_array( $attributes ) ? $attributes : array(),
	array(
		'variant' => 'generic',
	)
);

$anchor    = ( isset( $attributes['anchor'] ) && $attributes['anchor'] ) ? ' id="' . esc_attr( $attributes['anchor'] ) . '"' : '';
$extra_cls = ( isset( $attributes['className'] ) && $attributes['className'] ) ? ' ' . esc_attr( $attributes['className'] ) : '';

$variant = (string) $attrs['variant'];
$prose_class = 'container-narrow prose';
if ( 'charts' === $variant || 'reviews' === $variant ) {
	$prose_class .= ' ' . $variant . '-body';
}
?>
<section<?php echo $anchor; ?> class="section ground-paper<?php echo $extra_cls; ?>">
	<div class="<?php echo esc_attr( $prose_class ); ?>">
<?php echo $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- InnerBlocks output. ?>
	</div>
</section>
