<?php
/**
 * Server-side render for bozzies/donate-teaser.
 *
 * Emits Astro's exact DOM verbatim from
 * ~/boswell-poc/src/pages/index.astro lines 100-110 (the
 * <section class="section ground-gold donate-teaser"> wrapper with a
 * <MusicBackdrop variant="diamond-grid" opacity={0.08} color="var(--purple)" />
 * followed by <div class="container-narrow donate-teaser__inner">).
 *
 * The diamond-grid SVG below is verbatim from MusicBackdrop.astro lines 82-95.
 *
 * @package bozzies
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$attrs = wp_parse_args(
	isset( $attributes ) && is_array( $attributes ) ? $attributes : array(),
	array(
		'eyebrow'  => 'Support the Work',
		'title'    => '',
		'body'     => '',
		'href'     => '',
		'ctaLabel' => 'Donate',
	)
);

$anchor    = ( isset( $attributes['anchor'] ) && $attributes['anchor'] ) ? ' id="' . esc_attr( $attributes['anchor'] ) . '"' : '';
$extra_cls = ( isset( $attributes['className'] ) && $attributes['className'] ) ? ' ' . esc_attr( $attributes['className'] ) : '';

// Decode HTML entities on string attrs so curly glyphs survive round-trips
// (Gutenberg re-serializes `&rsquo;` as `’` — decode here so the DOM matches
// Astro's Unicode output rather than showing `&rsquo;` on the front).
$eyebrow  = html_entity_decode( $attrs['eyebrow'], ENT_QUOTES | ENT_HTML5, 'UTF-8' );
$title    = html_entity_decode( $attrs['title'], ENT_QUOTES | ENT_HTML5, 'UTF-8' );
$body     = html_entity_decode( $attrs['body'], ENT_QUOTES | ENT_HTML5, 'UTF-8' );
$ctaLabel = html_entity_decode( $attrs['ctaLabel'], ENT_QUOTES | ENT_HTML5, 'UTF-8' );

// Astro renders literally `href=""` when the donate URL is empty; keep that
// exact behavior so the front-end DOM matches Astro (see
// ~/boswell-poc/src/pages/index.astro L107 — `href={donateUrl}`).
$href = isset( $attrs['href'] ) ? (string) $attrs['href'] : '';
?>
<section<?php echo $anchor; ?> class="section ground-gold donate-teaser<?php echo $extra_cls; ?>">
	<div class="music-backdrop" style="--mb-opacity:0.08; --mb-color:var(--purple); --mb-top:0px" aria-hidden="true">
		<svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
			<defs>
				<pattern id="dg" width="60" height="60" patternUnits="userSpaceOnUse">
					<g fill="none" stroke="var(--mb-color)" stroke-width="0.6">
						<path d="M30 0 L60 30 L30 60 L0 30 Z"/>
						<path d="M30 20 L40 30 L30 40 L20 30 Z" opacity="0.55"/>
						<circle cx="30" cy="30" r="1.4" fill="var(--mb-color)" stroke="none"/>
					</g>
				</pattern>
			</defs>
			<rect width="100%" height="100%" fill="url(#dg)"/>
		</svg>
	</div>
	<div class="container-narrow donate-teaser__inner">
		<?php if ( $eyebrow ) : ?>
			<span class="eyebrow eyebrow--purple"><?php echo esc_html( $eyebrow ); ?></span>
		<?php endif; ?>
		<?php if ( $title ) : ?>
			<h2 class="donate-teaser__title"><?php echo esc_html( $title ); ?></h2>
		<?php endif; ?>
		<?php if ( $body ) : ?>
			<p class="donate-teaser__body"><?php echo esc_html( $body ); ?></p>
		<?php endif; ?>
		<a href="<?php echo esc_attr( $href ); ?>" target="_blank" rel="noopener noreferrer" class="btn btn--purple"><?php echo esc_html( $ctaLabel ); ?></a>
	</div>
</section>
