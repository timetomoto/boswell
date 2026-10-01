<?php
/**
 * Server-side render for bozzies/intro-section.
 *
 * Emits Astro's exact DOM verbatim from
 * ~/boswell-poc/src/pages/index.astro lines 39-51 (the {@code
 * introEyebrow} / {@code introLede} / {@code introBody} block).
 *
 * @package bozzies
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$attrs = wp_parse_args(
	isset( $attributes ) && is_array( $attributes ) ? $attributes : array(),
	array(
		'eyebrow'  => '',
		'lede'     => '',
		'bodyLead' => '',
		'body'     => '',
	)
);

$anchor    = ( isset( $attributes['anchor'] ) && $attributes['anchor'] ) ? ' id="' . esc_attr( $attributes['anchor'] ) . '"' : '';
$extra_cls = ( isset( $attributes['className'] ) && $attributes['className'] ) ? ' ' . esc_attr( $attributes['className'] ) : '';

// String attrs may carry HTML entities from Astro markdown; decode to Unicode
// so the browser sees the intended glyphs (curly quotes, en/em dashes).
$eyebrow   = html_entity_decode( (string) $attrs['eyebrow'], ENT_QUOTES | ENT_HTML5, 'UTF-8' );
$lede      = html_entity_decode( (string) $attrs['lede'], ENT_QUOTES | ENT_HTML5, 'UTF-8' );
$body_lead = html_entity_decode( (string) $attrs['bodyLead'], ENT_QUOTES | ENT_HTML5, 'UTF-8' );
$body      = html_entity_decode( (string) $attrs['body'], ENT_QUOTES | ENT_HTML5, 'UTF-8' );
?>
<section<?php echo $anchor; ?> class="section ground-paper intro-section<?php echo $extra_cls; ?>">
	<div class="container-narrow intro">
<?php if ( '' !== $eyebrow ) : ?>
		<span class="eyebrow eyebrow--purple"><?php echo esc_html( $eyebrow ); ?></span>
<?php endif; ?>
<?php if ( '' !== $lede ) : ?>
		<p class="intro__lede"><?php echo esc_html( $lede ); ?></p>
<?php endif; ?>
<?php if ( '' !== $body_lead ) : ?>
		<p class="intro__body intro__body--lead"><?php echo esc_html( $body_lead ); ?></p>
<?php endif; ?>
<?php if ( '' !== $body ) : ?>
		<p class="intro__body"><?php echo esc_html( $body ); ?></p>
<?php endif; ?>
	</div>
</section>
