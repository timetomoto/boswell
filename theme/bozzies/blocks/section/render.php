<?php
/**
 * Server-side render for bozzies/section.
 *
 * @package bozzies
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$attrs = isset( $attributes ) && is_array( $attributes ) ? $attributes : array();

$defaults = array(
	'backgroundStyle'     => 'paper',
	'customBackground'    => '',
	'backgroundImage'     => null,
	'backgroundFocalPoint' => array( 'x' => 0.5, 'y' => 0.5 ),
	'overlayColor'        => '#181615',
	'overlayStrength'     => 55,
	'backdrop'            => 'none',
	'backdropColor'       => '',
	'width'               => 'container',
	'headingWidth'        => 'container',
	'spacing'             => 'standard',
	'heroFrame'           => false,
	'imageGrayscale'      => false,
	'imageZoom'           => false,
);
$attrs = array_merge( $defaults, $attrs );

$backdrop_defaults = array(
	'vinyl'        => 'var(--wp--preset--color--purple)',
	'staves'       => 'var(--wp--preset--color--purple)',
	'notes'        => 'var(--wp--custom--color--yellow-soft)',
	'diamond-grid' => 'var(--wp--preset--color--purple)',
);

$is_custom_bg  = 'custom' === $attrs['backgroundStyle'];
$has_image     = is_array( $attrs['backgroundImage'] ) && ! empty( $attrs['backgroundImage']['url'] );
$has_backdrop  = 'none' !== $attrs['backdrop'];

$align_attr = isset( $attributes['align'] ) && $attributes['align'] ? $attributes['align'] : 'full';
$classes = array(
	'wp-block-bozzies-section',
	'align' . sanitize_html_class( $align_attr ),
	$is_custom_bg ? 'ground-custom' : 'ground-' . sanitize_html_class( $attrs['backgroundStyle'] ),
	$has_backdrop ? 'has-backdrop-' . sanitize_html_class( $attrs['backdrop'] ) : '',
	'has-width-' . sanitize_html_class( $attrs['width'] ),
	'has-heading-width-' . sanitize_html_class( $attrs['headingWidth'] ),
	'has-spacing-' . sanitize_html_class( $attrs['spacing'] ),
	$attrs['heroFrame'] ? 'has-hero-frame' : '',
	$has_image ? 'has-bg-image' : '',
	( $has_image && $attrs['imageGrayscale'] ) ? 'has-image-grayscale' : '',
	( $has_image && $attrs['imageZoom'] ) ? 'has-image-zoom' : '',
);
$class_str = trim( implode( ' ', array_filter( $classes ) ) );

$style_parts = array();
if ( $is_custom_bg && ! empty( $attrs['customBackground'] ) ) {
	$style_parts[] = '--bozzies-section-bg:' . esc_attr( $attrs['customBackground'] );
}
if ( $has_backdrop ) {
	$bd_color = ! empty( $attrs['backdropColor'] )
		? $attrs['backdropColor']
		: $backdrop_defaults[ $attrs['backdrop'] ];
	$style_parts[] = '--backdrop-color:' . esc_attr( $bd_color );
}
if ( $has_image ) {
	$focal_x = isset( $attrs['backgroundFocalPoint']['x'] ) ? floatval( $attrs['backgroundFocalPoint']['x'] ) : 0.5;
	$focal_y = isset( $attrs['backgroundFocalPoint']['y'] ) ? floatval( $attrs['backgroundFocalPoint']['y'] ) : 0.5;
	$style_parts[] = '--bozzies-section-image:url(' . esc_url( $attrs['backgroundImage']['url'] ) . ')';
	$style_parts[] = '--bozzies-section-focal:' . round( $focal_x * 100 ) . '% ' . round( $focal_y * 100 ) . '%';
	$style_parts[] = '--bozzies-section-overlay:' . esc_attr( $attrs['overlayColor'] );
	$style_parts[] = '--bozzies-section-overlay-alpha:' . floatval( $attrs['overlayStrength'] ) / 100;
}

$anchor = isset( $attrs['anchor'] ) && $attrs['anchor'] ? ' id="' . esc_attr( $attrs['anchor'] ) . '"' : '';
$style_attr = $style_parts ? ' style="' . esc_attr( implode( ';', $style_parts ) ) . '"' : '';

// Preserve any additional className added via customClassName.
if ( isset( $attributes['className'] ) && $attributes['className'] ) {
	$class_str .= ' ' . esc_attr( $attributes['className'] );
}
?>
<section<?php echo $anchor; ?> class="<?php echo esc_attr( $class_str ); ?>"<?php echo $style_attr; ?>>
	<?php if ( $has_image ) : ?>
		<div class="wp-block-bozzies-section__image" aria-hidden="true"></div>
		<div class="wp-block-bozzies-section__overlay" aria-hidden="true"></div>
	<?php endif; ?>
	<?php if ( $has_backdrop ) : ?>
		<div class="wp-block-bozzies-section__backdrop" aria-hidden="true"></div>
	<?php endif; ?>
	<?php if ( $attrs['heroFrame'] ) : ?>
		<div class="wp-block-bozzies-section__frame" aria-hidden="true"></div>
	<?php endif; ?>
	<div class="wp-block-bozzies-section__inner">
		<?php echo $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $content is InnerBlocks output already sanitized by WP. ?>
	</div>
</section>
