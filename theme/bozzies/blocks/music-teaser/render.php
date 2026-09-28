<?php
/**
 * Server-side render for bozzies/music-teaser.
 *
 * Emits Astro's exact DOM verbatim from
 * ~/boswell-poc/src/pages/media/index.astro lines 102-137.
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
		'title'    => '',
		'body'     => '',
		'href'     => '',
		'ctaLabel' => 'Explore',
	)
);

// Astro's arrow SVG (~/boswell-poc/src/pages/media/index.astro L108-110).
$arrow_svg = '<svg width="20" height="10" viewBox="0 0 20 10" aria-hidden="true"><path d="M0 5 H17 M13 1 L17 5 L13 9" stroke="currentColor" stroke-width="1" fill="none"/></svg>';

$href = $attrs['href'] ? esc_url( $attrs['href'] ) : '#';
// Decode HTML entities on string attrs so curly glyphs survive round-trips
// (Gutenberg re-serializes `&rsquo;` as `’` — decode here so the DOM matches
// Astro's Unicode output rather than showing `&rsquo;` on the front).
$eyebrow  = html_entity_decode( $attrs['eyebrow'], ENT_QUOTES | ENT_HTML5, 'UTF-8' );
$title    = html_entity_decode( $attrs['title'], ENT_QUOTES | ENT_HTML5, 'UTF-8' );
$body     = html_entity_decode( $attrs['body'], ENT_QUOTES | ENT_HTML5, 'UTF-8' );
$ctaLabel = html_entity_decode( $attrs['ctaLabel'], ENT_QUOTES | ENT_HTML5, 'UTF-8' );
?>
<a href="<?php echo $href; ?>" class="music-teaser">
	<?php if ( $eyebrow ) : ?>
		<span class="eyebrow music-teaser__eyebrow"><?php echo esc_html( $eyebrow ); ?></span>
	<?php endif; ?>
	<h3 class="music-teaser__title"><?php echo esc_html( $title ); ?></h3>
	<?php if ( $body ) : ?>
		<p class="music-teaser__body"><?php echo esc_html( $body ); ?></p>
	<?php endif; ?>
	<span class="music-teaser__cta">
		<?php echo esc_html( $ctaLabel ); ?>
		<?php echo $arrow_svg; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- static SVG. ?>
	</span>
</a>
