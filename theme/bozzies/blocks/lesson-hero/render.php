<?php
/**
 * Server-side render for bozzies/lesson-hero.
 *
 * Emits Astro's exact DOM verbatim from
 * ~/boswell-poc/src/pages/media/lessons/[order].astro lines 25-35,
 * with the MusicBackdrop.astro "staves" SVG inlined
 * (~/boswell-poc/src/components/MusicBackdrop.astro lines 250-277) via
 * bozzies_music_backdrop_html().
 *
 * @package bozzies
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$attrs = wp_parse_args(
	isset( $attributes ) && is_array( $attributes ) ? $attributes : array(),
	array(
		'eyebrow'   => '',
		'title'     => '',
		'summary'   => '',
		'backHref'  => '/media/',
		'backLabel' => 'Media',
	)
);

$anchor    = ( isset( $attributes['anchor'] ) && $attributes['anchor'] ) ? ' id="' . esc_attr( $attributes['anchor'] ) . '"' : '';
$extra_cls = ( isset( $attributes['className'] ) && $attributes['className'] ) ? ' ' . esc_attr( $attributes['className'] ) : '';

// RichText attribute strings may contain HTML entities from Astro markdown
// (e.g. &rsquo;, &ldquo;). Decode to Unicode so the browser sees the intended
// glyphs, matching Astro's output.
$eyebrow    = html_entity_decode( (string) $attrs['eyebrow'],   ENT_QUOTES | ENT_HTML5, 'UTF-8' );
$title      = html_entity_decode( (string) $attrs['title'],     ENT_QUOTES | ENT_HTML5, 'UTF-8' );
$summary    = html_entity_decode( (string) $attrs['summary'],   ENT_QUOTES | ENT_HTML5, 'UTF-8' );
$back_label = html_entity_decode( (string) $attrs['backLabel'], ENT_QUOTES | ENT_HTML5, 'UTF-8' );
$back_href  = (string) $attrs['backHref'];

// MusicBackdrop props for the "staves" variant used on every lesson hero:
// Astro <MusicBackdrop variant="staves" opacity={0.08} color="var(--yellow-soft)" />.
$backdrop_html = function_exists( 'bozzies_music_backdrop_html' )
	? bozzies_music_backdrop_html( 'staves', 0.08, 'var(--yellow-soft)', 0 )
	: '';
?>
<section<?php echo $anchor; ?> class="lesson-hero ground-purple<?php echo $extra_cls; ?>">
	<?php echo $backdrop_html; ?>
	<div class="container-narrow lesson-hero__inner">
<?php if ( '' !== $back_label ) : ?>
		<a href="<?php echo esc_url( $back_href ); ?>" class="lesson-hero__back">← <?php echo esc_html( $back_label ); ?></a>
<?php endif; ?>
<?php if ( '' !== $eyebrow ) : ?>
		<span class="eyebrow lesson-hero__eyebrow"><?php echo wp_kses_post( $eyebrow ); ?></span>
<?php endif; ?>
<?php if ( '' !== $title ) : ?>
		<h1 class="lesson-hero__title"><?php echo wp_kses_post( $title ); ?></h1>
<?php endif; ?>
<?php if ( '' !== $summary ) : ?>
		<p class="lesson-hero__summary"><?php echo wp_kses_post( $summary ); ?></p>
<?php endif; ?>
	</div>
</section>
