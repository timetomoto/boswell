<?php
/**
 * Server-side render for bozzies/page-hero.
 *
 * Emits Astro's exact DOM verbatim from
 * ~/boswell-poc/src/pages/sisters/career-timeline.astro lines 14-21 and
 * ~/boswell-poc/src/pages/media/discography.astro lines 25-33 (the
 * <section class="page-hero ground-purple"> wrapper with a
 * <div class="container-narrow page-hero__inner"> holding the back-link,
 * optional eyebrow, h1 title, and optional subtitle).
 *
 * Backdrop + gold-ground variants are handled in later sub-items.
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
?>
<section<?php echo $anchor; ?> class="wp-block-bozzies-page-hero page-hero ground-purple<?php echo $extra_cls; ?>">
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
