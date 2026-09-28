<?php
/**
 * Server-side render for bozzies/see-also.
 *
 * Emits Astro's exact DOM verbatim from
 * ~/boswell-poc/src/pages/media/charts.astro lines 27-39 and
 * ~/boswell-poc/src/pages/media/discography.astro lines 86-98:
 *
 *   <section class="section ground-gold see-also">
 *     <div class="container see-also__grid">
 *       <a class="see-also__card" href="…">
 *         <span class="eyebrow see-also__eyebrow">See also</span>
 *         <h2 class="see-also__title">…</h2>
 *         <p class="see-also__body">…</p>
 *         <span class="see-also__cta">
 *           …
 *           <svg …>arrow</svg>
 *         </span>
 *       </a>
 *     </div>
 *   </section>
 *
 * @package bozzies
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$attrs = wp_parse_args(
	isset( $attributes ) && is_array( $attributes ) ? $attributes : array(),
	array(
		'eyebrow'  => 'See also',
		'title'    => '',
		'body'     => '',
		'href'     => '',
		'ctaLabel' => 'Explore',
	)
);

$anchor    = ( isset( $attributes['anchor'] ) && $attributes['anchor'] ) ? ' id="' . esc_attr( $attributes['anchor'] ) . '"' : '';
$extra_cls = ( isset( $attributes['className'] ) && $attributes['className'] ) ? ' ' . esc_attr( $attributes['className'] ) : '';

// Astro's arrow SVG (~/boswell-poc/src/pages/media/charts.astro L35, discography.astro L94).
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
<section<?php echo $anchor; ?> class="section ground-gold see-also<?php echo $extra_cls; ?>">
	<div class="container see-also__grid">
		<a href="<?php echo $href; ?>" class="see-also__card">
			<?php if ( $eyebrow ) : ?>
				<span class="eyebrow see-also__eyebrow"><?php echo esc_html( $eyebrow ); ?></span>
			<?php endif; ?>
			<h2 class="see-also__title"><?php echo esc_html( $title ); ?></h2>
			<?php if ( $body ) : ?>
				<p class="see-also__body"><?php echo esc_html( $body ); ?></p>
			<?php endif; ?>
			<span class="see-also__cta">
				<?php echo esc_html( $ctaLabel ); ?>
				<?php echo $arrow_svg; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- static SVG. ?>
			</span>
		</a>
	</div>
</section>
