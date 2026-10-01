<?php
/**
 * Server-side render for bozzies/bio-nav.
 *
 * Emits Astro's exact DOM verbatim from
 * ~/boswell-poc/src/pages/sisters/[slug].astro lines 114-129.
 *
 * @package bozzies
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$attrs = wp_parse_args(
	isset( $attributes ) && is_array( $attributes ) ? $attributes : array(),
	array(
		'prevHref'  => '',
		'prevLabel' => 'Previous',
		'prevName'  => '',
		'allHref'   => '/sisters/',
		'allLabel'  => 'All',
		'allName'   => 'The Sisters',
		'nextHref'  => '',
		'nextLabel' => 'Next',
		'nextName'  => '',
		'ariaLabel' => 'Sisters navigation',
	)
);

$anchor    = ( isset( $attributes['anchor'] ) && $attributes['anchor'] ) ? ' id="' . esc_attr( $attributes['anchor'] ) . '"' : '';
$extra_cls = ( isset( $attributes['className'] ) && $attributes['className'] ) ? ' ' . esc_attr( $attributes['className'] ) : '';

// RichText string attributes may carry HTML entities from Astro markdown;
// decode to Unicode so the browser sees the intended glyphs, matching Astro.
$prev_label = html_entity_decode( (string) $attrs['prevLabel'], ENT_QUOTES | ENT_HTML5, 'UTF-8' );
$prev_name  = html_entity_decode( (string) $attrs['prevName'],  ENT_QUOTES | ENT_HTML5, 'UTF-8' );
$all_label  = html_entity_decode( (string) $attrs['allLabel'],  ENT_QUOTES | ENT_HTML5, 'UTF-8' );
$all_name   = html_entity_decode( (string) $attrs['allName'],   ENT_QUOTES | ENT_HTML5, 'UTF-8' );
$next_label = html_entity_decode( (string) $attrs['nextLabel'], ENT_QUOTES | ENT_HTML5, 'UTF-8' );
$next_name  = html_entity_decode( (string) $attrs['nextName'],  ENT_QUOTES | ENT_HTML5, 'UTF-8' );
$aria_label = html_entity_decode( (string) $attrs['ariaLabel'], ENT_QUOTES | ENT_HTML5, 'UTF-8' );
$prev_href  = (string) $attrs['prevHref'];
$all_href   = (string) $attrs['allHref'];
$next_href  = (string) $attrs['nextHref'];
?>
<nav<?php echo $anchor; ?> class="section-tight ground-paper bio-nav<?php echo $extra_cls; ?>" aria-label="<?php echo esc_attr( $aria_label ); ?>">
	<div class="container bio-nav__inner">
		<a href="<?php echo esc_url( $prev_href ); ?>" class="bio-nav__link bio-nav__link--prev">
			<span class="bio-nav__label"><?php echo esc_html( $prev_label ); ?></span>
			<span class="bio-nav__name"><?php echo esc_html( $prev_name ); ?></span>
		</a>
		<a href="<?php echo esc_url( $all_href ); ?>" class="bio-nav__link bio-nav__link--all">
			<span class="bio-nav__label"><?php echo esc_html( $all_label ); ?></span>
			<span class="bio-nav__name"><?php echo esc_html( $all_name ); ?></span>
		</a>
		<a href="<?php echo esc_url( $next_href ); ?>" class="bio-nav__link bio-nav__link--next">
			<span class="bio-nav__label"><?php echo esc_html( $next_label ); ?></span>
			<span class="bio-nav__name"><?php echo esc_html( $next_name ); ?></span>
		</a>
	</div>
</nav>
