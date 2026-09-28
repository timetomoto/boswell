<?php
/**
 * Server-side render for bozzies/sample-section.
 *
 * Emits Astro's exact DOM verbatim from
 * ~/boswell-poc/src/pages/index.astro lines 80-97 (the Sample the Sound
 * educational-lessons CTA section on the home page).
 *
 * The staves music-backdrop SVG is inlined verbatim from
 * ~/boswell-poc/src/components/MusicBackdrop.astro lines 250-277 with
 * `--mb-opacity:0.06; --mb-color:var(--purple)` matching index.astro L83.
 *
 * @package bozzies
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$attrs = wp_parse_args(
	isset( $attributes ) && is_array( $attributes ) ? $attributes : array(),
	array(
		'eyebrow'  => '',
		'title'    => '',
		'body'     => '',
		'href'     => '/media/lessons/1/',
		'ctaLabel' => 'Play Lesson 1',
	)
);

$anchor    = ( isset( $attributes['anchor'] ) && $attributes['anchor'] ) ? ' id="' . esc_attr( $attributes['anchor'] ) . '"' : '';
$extra_cls = ( isset( $attributes['className'] ) && $attributes['className'] ) ? ' ' . esc_attr( $attributes['className'] ) : '';

// Decode HTML entities so curly glyphs survive Gutenberg round-trips
// (Gutenberg re-serializes `&rsquo;` as `’` — decode here so the front DOM
// matches Astro's Unicode output instead of showing `&rsquo;`).
$eyebrow    = html_entity_decode( (string) $attrs['eyebrow'],  ENT_QUOTES | ENT_HTML5, 'UTF-8' );
$title      = html_entity_decode( (string) $attrs['title'],    ENT_QUOTES | ENT_HTML5, 'UTF-8' );
$body       = html_entity_decode( (string) $attrs['body'],     ENT_QUOTES | ENT_HTML5, 'UTF-8' );
$cta_label  = html_entity_decode( (string) $attrs['ctaLabel'], ENT_QUOTES | ENT_HTML5, 'UTF-8' );
$href       = isset( $attrs['href'] ) ? (string) $attrs['href'] : '';
?>
<section<?php echo $anchor; ?> class="section ground-paper sample-section<?php echo $extra_cls; ?>">
	<div class="music-backdrop" style="--mb-opacity:0.06; --mb-color:var(--purple); --mb-top:0px" aria-hidden="true">
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
	<div class="container-narrow sample__inner">
<?php if ( '' !== $eyebrow ) : ?>
		<span class="eyebrow eyebrow--purple"><?php echo esc_html( $eyebrow ); ?></span>
<?php endif; ?>
<?php if ( '' !== $title ) : ?>
		<h2 class="sample__title"><?php echo esc_html( $title ); ?></h2>
<?php endif; ?>
<?php if ( '' !== $body ) : ?>
		<p class="sample__body"><?php echo esc_html( $body ); ?></p>
<?php endif; ?>
		<a href="<?php echo esc_attr( $href ); ?>" class="sample__cta">
			<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
				<circle cx="12" cy="12" r="11" fill="none" stroke="currentColor" stroke-width="1.4"/>
				<path d="M9 7 L17 12 L9 17 Z" fill="currentColor"/>
			</svg>
			<?php echo esc_html( $cta_label ); ?>
		</a>
	</div>
</section>
