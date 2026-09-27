<?php
/**
 * Server-side render for bozzies/sister-card.
 *
 * Emits Astro's exact DOM verbatim from
 * ~/boswell-poc/src/pages/sisters/index.astro lines 49-70.
 *
 * @package bozzies
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$attrs = wp_parse_args(
	isset( $attributes ) && is_array( $attributes ) ? $attributes : array(),
	array(
		'order'    => '',
		'nickname' => '',
		'name'     => '',
		'quote'    => '',
		'href'     => '',
		'ctaLabel' => 'Read the bio',
	)
);

// Astro's arrow SVG (~/boswell-poc/src/pages/sisters/index.astro lines 64-66).
$arrow_svg = '<svg width="20" height="10" viewBox="0 0 20 10" aria-hidden="true"><path d="M0 5 H17 M13 1 L17 5 L13 9" stroke="currentColor" stroke-width="1" fill="none"/></svg>';

$href = $attrs['href'] ? esc_url( $attrs['href'] ) : '#';
?>
<li class="sister-card">
	<a class="sister-card__link" href="<?php echo $href; ?>">
		<div class="sister-card__meta">
			<span class="sister-card__order"><?php echo esc_html( $attrs['order'] ); ?></span>
			<span class="sister-card__nickname"><?php echo esc_html( $attrs['nickname'] ); ?></span>
		</div>
		<h3 class="sister-card__name"><?php echo esc_html( $attrs['name'] ); ?></h3>
		<?php if ( $attrs['quote'] ) : ?>
			<blockquote class="sister-card__quote"><span aria-hidden="true">&quot;</span><?php echo esc_html( $attrs['quote'] ); ?><span aria-hidden="true">&quot;</span></blockquote>
		<?php endif; ?>
		<span class="sister-card__cta">
			<?php echo esc_html( $attrs['ctaLabel'] ); ?>
			<?php echo $arrow_svg; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- static SVG. ?>
		</span>
	</a>
</li>
