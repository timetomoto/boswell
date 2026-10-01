<?php
/**
 * Server-side render for bozzies/bio-hero.
 *
 * Emits Astro's exact DOM verbatim from
 * ~/boswell-poc/src/pages/sisters/[slug].astro lines 46-63,
 * with the MusicBackdrop.astro "staves" SVG inlined
 * (~/boswell-poc/src/components/MusicBackdrop.astro lines 250-277).
 *
 * @package bozzies
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$attrs = wp_parse_args(
	isset( $attributes ) && is_array( $attributes ) ? $attributes : array(),
	array(
		'nickname'             => '',
		'name'                 => '',
		'pullQuote'            => '',
		'pullQuoteAttribution' => '',
		'backHref'             => '/sisters/',
		'backLabel'            => 'The Sisters',
	)
);

$anchor    = ( isset( $attributes['anchor'] ) && $attributes['anchor'] ) ? ' id="' . esc_attr( $attributes['anchor'] ) . '"' : '';
$extra_cls = ( isset( $attributes['className'] ) && $attributes['className'] ) ? ' ' . esc_attr( $attributes['className'] ) : '';

// RichText attribute strings may contain HTML entities from Astro markdown
// (e.g. &rsquo;, &ldquo;). Decode to Unicode so the browser sees the intended
// glyphs, matching Astro's output which uses the raw characters.
$nickname   = html_entity_decode( (string) $attrs['nickname'],             ENT_QUOTES | ENT_HTML5, 'UTF-8' );
$name       = html_entity_decode( (string) $attrs['name'],                 ENT_QUOTES | ENT_HTML5, 'UTF-8' );
$quote_body = html_entity_decode( (string) $attrs['pullQuote'],            ENT_QUOTES | ENT_HTML5, 'UTF-8' );
$quote_attr = html_entity_decode( (string) $attrs['pullQuoteAttribution'], ENT_QUOTES | ENT_HTML5, 'UTF-8' );
$back_label = html_entity_decode( (string) $attrs['backLabel'],            ENT_QUOTES | ENT_HTML5, 'UTF-8' );
$back_href  = (string) $attrs['backHref'];

// MusicBackdrop props for the "staves" variant used on every bio hero
// (Astro: <MusicBackdrop variant="staves" opacity={0.07} color="var(--yellow-soft)" />).
$mb_style = '--mb-opacity:0.07; --mb-color:var(--yellow-soft); --mb-top:0px';
?>
<section<?php echo $anchor; ?> class="bio-hero ground-purple<?php echo $extra_cls; ?>">
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
	<div class="container-narrow bio-hero__inner">
<?php if ( '' !== $back_label ) : ?>
		<a href="<?php echo esc_url( $back_href ); ?>" class="bio-hero__back">← <?php echo esc_html( $back_label ); ?></a>
<?php endif; ?>
<?php if ( '' !== $nickname ) : ?>
		<span class="eyebrow bio-hero__eyebrow"><?php echo wp_kses_post( $nickname ); ?></span>
<?php endif; ?>
<?php if ( '' !== $name ) : ?>
		<h1 class="bio-hero__name"><?php echo wp_kses_post( $name ); ?></h1>
<?php endif; ?>
<?php if ( '' !== $quote_body ) : ?>
		<blockquote class="bio-hero__quote">
			<span aria-hidden="true">"</span><?php echo wp_kses_post( $quote_body ); ?><span aria-hidden="true">"</span>
<?php if ( '' !== $quote_attr ) : ?>
			<cite>— <?php echo wp_kses_post( $quote_attr ); ?></cite>
<?php endif; ?>
		</blockquote>
<?php endif; ?>
	</div>
</section>
