<?php
/**
 * Server-side render for bozzies/fact.
 *
 * Emits Astro's exact DOM verbatim from
 * ~/boswell-poc/src/pages/sisters/[slug].astro lines 69-73.
 *
 * @package bozzies
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$attrs = wp_parse_args(
	isset( $attributes ) && is_array( $attributes ) ? $attributes : array(),
	array(
		'label' => '',
		'value' => '',
	)
);

// Values imported from Astro Markdown may carry HTML entities like &prime;,
// &Prime;, &ndash;, &acute;. Decode them to Unicode before esc_html so the
// browser sees the intended glyphs instead of literal "&amp;prime;".
$label = html_entity_decode( (string) $attrs['label'], ENT_QUOTES | ENT_HTML5, 'UTF-8' );
$value = html_entity_decode( (string) $attrs['value'], ENT_QUOTES | ENT_HTML5, 'UTF-8' );
?>
<div class="facts__pair">
	<dt class="facts__label"><?php echo esc_html( $label ); ?></dt>
	<dd class="facts__value"><?php echo esc_html( $value ); ?></dd>
</div>
