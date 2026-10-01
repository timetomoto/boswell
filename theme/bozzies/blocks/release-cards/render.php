<?php
/**
 * Server-side render for bozzies/release-cards.
 *
 * Emits Astro's exact DOM verbatim from
 * ~/boswell-poc/src/pages/press/index.astro lines 94-116 (the
 * <section class="section ground-gold press-releases"> wrapper with a
 * <MusicBackdrop variant="staves" opacity={0.08} color="var(--purple)" />,
 * <header class="releases-head"> and <ul class="releases-grid">).
 *
 * The staves SVG below is verbatim from MusicBackdrop.astro lines 250-277.
 *
 * @package bozzies
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$attrs = wp_parse_args(
	isset( $attributes ) && is_array( $attributes ) ? $attributes : array(),
	array(
		'eyebrow' => '',
		'title'   => '',
		'blurb'   => '',
	)
);

$anchor    = ( isset( $attributes['anchor'] ) && $attributes['anchor'] ) ? ' id="' . esc_attr( $attributes['anchor'] ) . '"' : '';
$extra_cls = ( isset( $attributes['className'] ) && $attributes['className'] ) ? ' ' . esc_attr( $attributes['className'] ) : '';

$eyebrow = html_entity_decode( (string) $attrs['eyebrow'], ENT_QUOTES | ENT_HTML5, 'UTF-8' );
$title   = html_entity_decode( (string) $attrs['title'],   ENT_QUOTES | ENT_HTML5, 'UTF-8' );
$blurb   = html_entity_decode( (string) $attrs['blurb'],   ENT_QUOTES | ENT_HTML5, 'UTF-8' );

// MusicBackdrop props for the "staves" variant used on this section
// (Astro: <MusicBackdrop variant="staves" opacity={0.08} color="var(--purple)" />).
$mb_style = '--mb-opacity:0.08; --mb-color:var(--purple); --mb-top:0px';
?>
<section<?php echo $anchor; ?> class="section ground-gold press-releases<?php echo $extra_cls; ?>">
	<div class="music-backdrop" style="<?php echo esc_attr( $mb_style ); ?>" aria-hidden="true">
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
	<div class="container">
		<?php if ( '' !== $eyebrow || '' !== $title || '' !== $blurb ) : ?>
		<header class="releases-head">
			<?php if ( '' !== $eyebrow ) : ?>
			<span class="eyebrow releases-head__eyebrow"><?php echo wp_kses_post( $eyebrow ); ?></span>
			<?php endif; ?>
			<?php if ( '' !== $title ) : ?>
			<h2 class="releases-head__title"><?php echo wp_kses_post( $title ); ?></h2>
			<?php endif; ?>
			<?php if ( '' !== $blurb ) : ?>
			<p class="releases-head__blurb"><?php echo wp_kses_post( $blurb ); ?></p>
			<?php endif; ?>
		</header>
		<?php endif; ?>
		<ul class="releases-grid" role="list">
<?php echo $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- InnerBlocks output. ?>
		</ul>
	</div>
</section>
