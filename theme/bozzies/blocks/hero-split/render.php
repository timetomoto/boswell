<?php
/**
 * Server-side render for bozzies/hero-split.
 *
 * Emits Astro's exact DOM verbatim from
 * ~/boswell-poc/src/components/Hero.astro lines 24-64 (the split branch of
 * the <Hero layout="split"> component), used on the home page at
 * ~/boswell-poc/src/pages/index.astro L28-36.
 *
 * All four corner-bracket SVGs, the glyph SVG, the class list, and the
 * data-has-image attribute are verbatim from Hero.astro.
 *
 * @package bozzies
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$attrs = wp_parse_args(
	isset( $attributes ) && is_array( $attributes ) ? $attributes : array(),
	array(
		'eyebrow'     => '',
		'title'       => '',
		'subtitle'    => '',
		'tagline'     => '',
		'image'       => null,
		'imageAlt'    => '',
		'imageCredit' => '',
		'height'      => 'tall',
	)
);

$anchor    = ( isset( $attributes['anchor'] ) && $attributes['anchor'] ) ? ' id="' . esc_attr( $attributes['anchor'] ) . '"' : '';
$extra_cls = ( isset( $attributes['className'] ) && $attributes['className'] ) ? ' ' . esc_attr( $attributes['className'] ) : '';

// Decode HTML entities so curly glyphs authored in the editor land as
// Unicode in the DOM (Gutenberg re-serializes `&rsquo;` as `’`).
$eyebrow      = html_entity_decode( (string) $attrs['eyebrow'], ENT_QUOTES | ENT_HTML5, 'UTF-8' );
$title        = html_entity_decode( (string) $attrs['title'], ENT_QUOTES | ENT_HTML5, 'UTF-8' );
$subtitle     = html_entity_decode( (string) $attrs['subtitle'], ENT_QUOTES | ENT_HTML5, 'UTF-8' );
$tagline      = html_entity_decode( (string) $attrs['tagline'], ENT_QUOTES | ENT_HTML5, 'UTF-8' );
$image_credit = html_entity_decode( (string) $attrs['imageCredit'], ENT_QUOTES | ENT_HTML5, 'UTF-8' );

$image_url = '';
$image_alt = (string) $attrs['imageAlt'];
if ( is_array( $attrs['image'] ) ) {
	if ( ! empty( $attrs['image']['url'] ) ) {
		$image_url = (string) $attrs['image']['url'];
	}
	if ( '' === $image_alt && ! empty( $attrs['image']['alt'] ) ) {
		$image_alt = (string) $attrs['image']['alt'];
	}
}

$height   = in_array( $attrs['height'], array( 'tall', 'medium', 'short' ), true ) ? $attrs['height'] : 'tall';
// Astro's default `align` prop is 'center'; the split hero uses it but
// none of the .hero--left rules apply. Kept verbatim to match Astro's DOM.
$align    = 'center';
$sec_cls  = 'hero hero--split hero--' . $height . ' hero--' . $align . $extra_cls;
$has_image = $image_url ? 'true' : 'false';
?>
<section<?php echo $anchor; ?> class="<?php echo esc_attr( $sec_cls ); ?>" data-has-image="<?php echo esc_attr( $has_image ); ?>">
<?php if ( $image_url ) : ?>
	<div class="hero__split">
		<div class="hero__image-panel">
			<img class="hero__image hero__image--split" src="<?php echo esc_url( $image_url ); ?>" alt="<?php echo esc_attr( $image_alt ); ?>" loading="eager" fetchpriority="high" />
			<div class="hero__tint hero__tint--gradient"></div>
			<div class="hero__frame" aria-hidden="true">
				<svg class="hero__frame-corner hero__frame-corner--tl" viewBox="0 0 60 60"><g fill="none" stroke="currentColor" stroke-width="1"><path d="M0 22 L0 0 L22 0"/><path d="M6 6 L6 16 M6 6 L16 6" opacity="0.55"/></g></svg>
				<svg class="hero__frame-corner hero__frame-corner--tr" viewBox="0 0 60 60"><g fill="none" stroke="currentColor" stroke-width="1"><path d="M38 0 L60 0 L60 22"/><path d="M54 6 L54 16 M54 6 L44 6" opacity="0.55"/></g></svg>
				<svg class="hero__frame-corner hero__frame-corner--bl" viewBox="0 0 60 60"><g fill="none" stroke="currentColor" stroke-width="1"><path d="M0 38 L0 60 L22 60"/><path d="M6 54 L6 44 M6 54 L16 54" opacity="0.55"/></g></svg>
				<svg class="hero__frame-corner hero__frame-corner--br" viewBox="0 0 60 60"><g fill="none" stroke="currentColor" stroke-width="1"><path d="M38 60 L60 60 L60 38"/><path d="M54 54 L54 44 M54 54 L44 54" opacity="0.55"/></g></svg>
			</div>
			<?php if ( '' !== $image_credit ) : ?>
				<p class="hero__credit hero__credit--split"><span><?php echo esc_html( $image_credit ); ?></span></p>
			<?php endif; ?>
		</div>
		<div class="hero__text-panel">
			<div class="hero__text-inner">
				<?php if ( '' !== $eyebrow ) : ?>
					<span class="eyebrow hero__eyebrow"><?php echo esc_html( $eyebrow ); ?></span>
				<?php endif; ?>
				<h1 class="hero__title hero__title--split"><?php echo esc_html( $title ); ?></h1>
				<div class="hero__glyph" aria-hidden="true">
					<svg viewBox="0 0 80 20"><g fill="none" stroke="currentColor" stroke-width="0.7">
						<path d="M0 10 L28 10"/>
						<path d="M52 10 L80 10"/>
						<g transform="translate(40 10)">
							<path d="M-6 0 L-2 -4 L2 0 L-2 4 Z"/>
							<path d="M-10 0 L-6 -4 M6 4 L10 0" opacity="0.7"/>
							<circle cx="0" cy="0" r="1.4" fill="currentColor" stroke="none"/>
						</g>
					</g></svg>
				</div>
				<?php if ( '' !== $subtitle ) : ?>
					<p class="hero__subtitle hero__subtitle--split"><?php echo esc_html( $subtitle ); ?></p>
				<?php endif; ?>
				<?php if ( '' !== $tagline ) : ?>
					<p class="hero__tagline"><?php echo esc_html( $tagline ); ?></p>
				<?php endif; ?>
			</div>
		</div>
	</div>
<?php endif; ?>
</section>
