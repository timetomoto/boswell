<?php
/**
 * Server-side render for bozzies/bio-body.
 *
 * Emits Astro's exact DOM verbatim from
 * ~/boswell-poc/src/pages/sisters/[slug].astro lines 80-96.
 *
 * @package bozzies
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$attrs = wp_parse_args(
	isset( $attributes ) && is_array( $attributes ) ? $attributes : array(),
	array(
		'portraitId'      => 0,
		'portraitUrl'     => '',
		'portraitAlt'     => '',
		'portraitCaption' => '',
	)
);

$anchor    = ( isset( $attributes['anchor'] ) && $attributes['anchor'] ) ? ' id="' . esc_attr( $attributes['anchor'] ) . '"' : '';
$extra_cls = ( isset( $attributes['className'] ) && $attributes['className'] ) ? ' ' . esc_attr( $attributes['className'] ) : '';

// Portrait caption may carry HTML entities from Astro markdown; decode to
// Unicode before esc_html so the browser sees the intended glyphs.
$caption = html_entity_decode( (string) $attrs['portraitCaption'], ENT_QUOTES | ENT_HTML5, 'UTF-8' );
$alt     = html_entity_decode( (string) $attrs['portraitAlt'], ENT_QUOTES | ENT_HTML5, 'UTF-8' );
$url     = (string) $attrs['portraitUrl'];
?>
<section<?php echo $anchor; ?> class="section ground-paper bio-body<?php echo $extra_cls; ?>">
	<div class="container bio-body__layout">
<?php if ( $url ) : ?>
		<figure class="bio-portrait">
			<img src="<?php echo esc_url( $url ); ?>" alt="<?php echo esc_attr( $alt ); ?>" loading="lazy" />
<?php if ( $caption ) : ?>
			<figcaption class="bio-portrait__caption"><?php echo esc_html( $caption ); ?></figcaption>
<?php endif; ?>
		</figure>
<?php endif; ?>
		<div class="prose">
<?php echo $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- InnerBlocks output. ?>
		</div>
	</div>
</section>
