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
	'overlayStrength'     => 70,
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

// Detect the Astro-hero variant on className.
$user_class    = isset( $attributes['className'] ) ? (string) $attributes['className'] : '';
$is_hero_photo = false !== strpos( $user_class, 'is-hero-photo' );

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

// On the Astro-hero variant, also emit Astro's own class names on the
// outer <section> so the ported hero.css applies directly. Height comes
// from `hero--medium` (Astro's Sisters/Media/Press/About/Lessons value).
if ( $is_hero_photo ) {
	$classes[] = 'hero';
	$classes[] = 'hero--full-bleed';
	$classes[] = 'hero--medium';
	$classes[] = 'hero--center';
}

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
if ( $has_image && ! $is_hero_photo ) {
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

// Astro hero corner SVGs (verbatim from Hero.astro).
$hero_corner_svg = function ( $variant ) {
	$paths = array(
		'tl' => '<path d="M0 22 L0 0 L22 0"/><path d="M6 6 L6 16 M6 6 L16 6" opacity="0.55"/>',
		'tr' => '<path d="M38 0 L60 0 L60 22"/><path d="M54 6 L54 16 M54 6 L44 6" opacity="0.55"/>',
		'bl' => '<path d="M0 38 L0 60 L22 60"/><path d="M6 54 L6 44 M6 54 L16 54" opacity="0.55"/>',
		'br' => '<path d="M38 60 L60 60 L60 38"/><path d="M54 54 L54 44 M54 54 L44 54" opacity="0.55"/>',
	);
	return '<svg class="hero__frame-corner hero__frame-corner--' . $variant
		. '" viewBox="0 0 60 60"><g fill="none" stroke="currentColor" stroke-width="1">'
		. $paths[ $variant ] . '</g></svg>';
};

// Astro hero glyph (verbatim from Hero.astro).
$hero_glyph_svg = '<svg viewBox="0 0 80 20"><g fill="none" stroke="currentColor" stroke-width="0.7">'
	. '<path d="M0 10 L28 10"/>'
	. '<path d="M52 10 L80 10"/>'
	. '<g transform="translate(40 10)">'
	. '<path d="M-6 0 L-2 -4 L2 0 L-2 4 Z"/>'
	. '<path d="M-10 0 L-6 -4 M6 4 L10 0" opacity="0.7"/>'
	. '<circle cx="0" cy="0" r="1.4" fill="currentColor" stroke="none"/>'
	. '</g></g></svg>';
?>
<?php if ( $is_hero_photo ) : ?>
	<section<?php echo $anchor; ?> class="<?php echo esc_attr( $class_str ); ?>"<?php echo $style_attr; ?> data-has-image="<?php echo $has_image ? 'true' : 'false'; ?>">
		<?php if ( $has_image ) : ?>
			<div class="hero__image-wrap" aria-hidden="true">
				<img class="hero__image" src="<?php echo esc_url( $attrs['backgroundImage']['url'] ); ?>"
					alt="<?php echo esc_attr( isset( $attrs['backgroundImage']['alt'] ) ? $attrs['backgroundImage']['alt'] : '' ); ?>"
					loading="eager" fetchpriority="high" />
				<div class="hero__tint"></div>
				<div class="hero__scrim"></div>
			</div>
		<?php endif; ?>
		<div class="hero__frame" aria-hidden="true">
			<?php echo $hero_corner_svg( 'tl' ) . $hero_corner_svg( 'tr' ) . $hero_corner_svg( 'bl' ) . $hero_corner_svg( 'br' ); ?>
		</div>
		<div class="hero__content container">
			<?php echo $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- InnerBlocks output. ?>
			<div class="hero__glyph" aria-hidden="true"><?php echo $hero_glyph_svg; ?></div>
		</div>
	</section>
<?php else : ?>
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
<?php endif; ?>
