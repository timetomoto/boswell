<?php
/**
 * Server-side render for bozzies/about-cta.
 *
 * Emits Astro's exact DOM verbatim from
 * ~/boswell-poc/src/pages/about.astro lines 41-54 (the
 * <section class="section ground-gold about-cta"> wrapper with a
 * <MusicBackdrop variant="notes" opacity={0.10} color="var(--purple)" />
 * followed by <div class="container about-cta__inner"> containing a
 * <header class="about-cta__head"> and a <div class="about-cta__actions">
 * with two anchors: btn--outline Contact and btn--gold Donate).
 *
 * The notes SVG below is verbatim from MusicBackdrop.astro lines 279-313.
 *
 * @package bozzies
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$attrs = wp_parse_args(
	isset( $attributes ) && is_array( $attributes ) ? $attributes : array(),
	array(
		'eyebrow'      => 'Get in touch',
		'title'        => '',
		'body'         => '',
		'contactHref'  => '',
		'contactLabel' => 'Contact',
		'donateHref'   => '',
		'donateLabel'  => 'Donate',
	)
);

$anchor    = ( isset( $attributes['anchor'] ) && $attributes['anchor'] ) ? ' id="' . esc_attr( $attributes['anchor'] ) . '"' : '';
$extra_cls = ( isset( $attributes['className'] ) && $attributes['className'] ) ? ' ' . esc_attr( $attributes['className'] ) : '';

// Decode HTML entities on string attrs so curly glyphs survive round-trips.
$eyebrow      = html_entity_decode( $attrs['eyebrow'], ENT_QUOTES | ENT_HTML5, 'UTF-8' );
$title        = html_entity_decode( $attrs['title'], ENT_QUOTES | ENT_HTML5, 'UTF-8' );
$body         = html_entity_decode( $attrs['body'], ENT_QUOTES | ENT_HTML5, 'UTF-8' );
$contactLabel = html_entity_decode( $attrs['contactLabel'], ENT_QUOTES | ENT_HTML5, 'UTF-8' );
$donateLabel  = html_entity_decode( $attrs['donateLabel'], ENT_QUOTES | ENT_HTML5, 'UTF-8' );

// Astro renders literally `href=""` when the URL is empty; keep that exact
// behavior so the front-end DOM matches Astro (see about.astro L50 for
// the contact fallback and L51 for the donate URL).
$contactHref = isset( $attrs['contactHref'] ) ? (string) $attrs['contactHref'] : '';
$donateHref  = isset( $attrs['donateHref'] ) ? (string) $attrs['donateHref'] : '';
?>
<section<?php echo $anchor; ?> class="section ground-gold about-cta<?php echo $extra_cls; ?>">
	<div class="music-backdrop" style="--mb-opacity:0.1; --mb-color:var(--purple); --mb-top:0px" aria-hidden="true">
		<svg viewBox="0 0 240 240" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
			<defs>
				<pattern id="notes" width="240" height="240" patternUnits="userSpaceOnUse">
					<g fill="var(--mb-color)" stroke="var(--mb-color)" stroke-width="0.5">
						<g transform="translate(40 60)">
							<ellipse cx="0" cy="26" rx="6" ry="4.4" transform="rotate(-20 0 26)"/>
							<line x1="5" y1="24" x2="5" y2="-8" stroke-width="1" fill="none"/>
							<path d="M5 -8 C 14 -4, 16 2, 13 12" stroke-width="1" fill="none"/>
						</g>
						<g transform="translate(140 40)">
							<ellipse cx="0" cy="30" rx="6" ry="4.4" transform="rotate(-20 0 30)"/>
							<ellipse cx="26" cy="26" rx="6" ry="4.4" transform="rotate(-20 26 26)"/>
							<line x1="5" y1="28" x2="5" y2="-4" stroke-width="1"/>
							<line x1="31" y1="24" x2="31" y2="-8" stroke-width="1"/>
							<line x1="4" y1="-4" x2="32" y2="-8" stroke-width="2.2"/>
						</g>
						<g transform="translate(60 150)">
							<ellipse cx="0" cy="24" rx="6" ry="4.4" transform="rotate(-20 0 24)"/>
							<line x1="5" y1="22" x2="5" y2="-10" stroke-width="1.2"/>
						</g>
						<g transform="translate(180 130)" opacity="0.9">
							<path d="M0 40 C -8 30, -8 18, 0 12 C 8 6, 14 14, 10 22 C 6 30, -4 30, -4 22 C -4 12, 6 -6, 6 -14 C 6 -20, -2 -22, -6 -18"
								  fill="none" stroke="var(--mb-color)" stroke-width="1.2"/>
						</g>
					</g>
				</pattern>
			</defs>
			<rect width="100%" height="100%" fill="url(#notes)"/>
		</svg>
	</div>
	<div class="container about-cta__inner">
		<header class="about-cta__head">
			<?php if ( $eyebrow ) : ?>
				<span class="eyebrow about-cta__eyebrow"><?php echo esc_html( $eyebrow ); ?></span>
			<?php endif; ?>
			<?php if ( $title ) : ?>
				<h2 class="about-cta__title"><?php echo esc_html( $title ); ?></h2>
			<?php endif; ?>
			<?php if ( $body ) : ?>
				<p class="about-cta__body"><?php echo esc_html( $body ); ?></p>
			<?php endif; ?>
		</header>
		<div class="about-cta__actions">
			<a href="<?php echo esc_attr( $contactHref ); ?>" class="btn btn--outline"><?php echo esc_html( $contactLabel ); ?></a>
			<a href="<?php echo esc_attr( $donateHref ); ?>" target="_blank" rel="noopener noreferrer" class="btn btn--gold"><?php echo esc_html( $donateLabel ); ?></a>
		</div>
	</div>
</section>
