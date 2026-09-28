<?php
/**
 * Server-side render for bozzies/page-hero.
 *
 * Emits Astro's exact DOM verbatim from
 * ~/boswell-poc/src/pages/sisters/career-timeline.astro lines 14-21,
 * ~/boswell-poc/src/pages/media/discography.astro lines 25-33, and
 * ~/boswell-poc/src/pages/media/reviews.astro lines 11-19 (the
 * <section class="page-hero ground-purple"> wrapper with a
 * <div class="container-narrow page-hero__inner"> holding the back-link,
 * optional eyebrow, h1 title, and optional subtitle).
 *
 * `backdrop` = "staves" inlines the MusicBackdrop.astro `staves` SVG
 * verbatim (lines 250-277) with Astro's props from reviews.astro L12
 * (opacity=0.07, color=var(--yellow-soft)).
 *
 * Gold-ground variant is handled in a later sub-item.
 *
 * @package bozzies
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$attrs = wp_parse_args(
	isset( $attributes ) && is_array( $attributes ) ? $attributes : array(),
	array(
		'backHref'  => '/',
		'backLabel' => 'Home',
		'eyebrow'   => '',
		'title'     => '',
		'subtitle'  => '',
		'backdrop'  => 'none',
	)
);

$anchor    = ( isset( $attributes['anchor'] ) && $attributes['anchor'] ) ? ' id="' . esc_attr( $attributes['anchor'] ) . '"' : '';
$extra_cls = ( isset( $attributes['className'] ) && $attributes['className'] ) ? ' ' . esc_attr( $attributes['className'] ) : '';

// Decode HTML entities on string attrs so curly glyphs survive round-trips
// (Gutenberg re-serializes `&rsquo;` as `’` — decode here so the DOM matches
// Astro's Unicode output rather than showing `&rsquo;` on the front).
$back_label = html_entity_decode( (string) $attrs['backLabel'], ENT_QUOTES | ENT_HTML5, 'UTF-8' );
$eyebrow    = html_entity_decode( (string) $attrs['eyebrow'],   ENT_QUOTES | ENT_HTML5, 'UTF-8' );
$title      = html_entity_decode( (string) $attrs['title'],     ENT_QUOTES | ENT_HTML5, 'UTF-8' );
$subtitle   = html_entity_decode( (string) $attrs['subtitle'],  ENT_QUOTES | ENT_HTML5, 'UTF-8' );
$back_href  = (string) $attrs['backHref'];
$backdrop   = (string) $attrs['backdrop'];
?>
<section<?php echo $anchor; ?> class="wp-block-bozzies-page-hero page-hero ground-purple<?php echo $extra_cls; ?>">
<?php if ( 'staves' === $backdrop ) : ?>
	<div class="music-backdrop" style="--mb-opacity:0.07; --mb-color:var(--yellow-soft); --mb-top:0px" aria-hidden="true">
		<svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
			<defs>
				<pattern id="staves" width="400" height="120" patternUnits="userSpaceOnUse">
					<g fill="none" stroke="var(--mb-color)" stroke-width="0.5">
						<line x1="0" y1="10" x2="400" y2="10"/>
						<line x1="0" y1="24" x2="400" y2="24"/>
						<line x1="0" y1="38" x2="400" y2="38"/>
						<line x1="0" y1="52" x2="400" y2="52"/>
						<line x1="0" y1="66" x2="400" y2="66"/>
					</g>
					<g fill="var(--mb-color)" stroke="var(--mb-color)" stroke-width="0.4">
						<ellipse cx="60"  cy="45" rx="5" ry="3.6" transform="rotate(-18 60 45)"/>
						<line x1="64" y1="43" x2="64" y2="10" fill="none"/>
						<ellipse cx="140" cy="31" rx="5" ry="3.6" transform="rotate(-18 140 31)"/>
						<line x1="144" y1="29" x2="144" y2="0" fill="none"/>
						<ellipse cx="220" cy="52" rx="5" ry="3.6" transform="rotate(-18 220 52)"/>
						<line x1="224" y1="50" x2="224" y2="18" fill="none"/>
						<ellipse cx="290" cy="38" rx="5" ry="3.6" transform="rotate(-18 290 38)"/>
						<line x1="294" y1="36" x2="294" y2="4" fill="none"/>
						<ellipse cx="350" cy="59" rx="5" ry="3.6" transform="rotate(-18 350 59)"/>
						<line x1="354" y1="57" x2="354" y2="24" fill="none"/>
					</g>
				</pattern>
			</defs>
			<rect width="100%" height="100%" fill="url(#staves)"/>
		</svg>
	</div>
<?php endif; ?>
	<div class="container-narrow page-hero__inner">
		<a href="<?php echo esc_url( $back_href ); ?>" class="page-hero__back">← <?php echo esc_html( $back_label ); ?></a>
<?php if ( '' !== $eyebrow ) : ?>
		<span class="eyebrow page-hero__eyebrow"><?php echo esc_html( $eyebrow ); ?></span>
<?php endif; ?>
<?php if ( '' !== $title ) : ?>
		<h1 class="page-hero__title"><?php echo esc_html( $title ); ?></h1>
<?php endif; ?>
<?php if ( '' !== $subtitle ) : ?>
		<p class="page-hero__subtitle"><?php echo esc_html( $subtitle ); ?></p>
<?php endif; ?>
	</div>
</section>
