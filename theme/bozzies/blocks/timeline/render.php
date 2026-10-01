<?php
/**
 * Server-side render for bozzies/timeline.
 *
 * Emits Astro's exact DOM verbatim from
 * ~/boswell-poc/src/components/Timeline.astro lines 28-52.
 *
 * Renders <ol class="timeline" style="--tl-accent:…"> with each entry as
 * <li class="timeline__entry [--alt]"> containing marker + year + event
 * (+ optional image). Alternates timeline__entry--alt on odd indexes to
 * match Astro's `i % 2 === 1` check.
 *
 * @package bozzies
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$attrs = wp_parse_args(
	isset( $attributes ) && is_array( $attributes ) ? $attributes : array(),
	array(
		'entries' => array(),
		'color'   => 'purple',
	)
);

$entries = is_array( $attrs['entries'] ) ? $attrs['entries'] : array();
$color   = (string) $attrs['color'];

$accent_map = array(
	'purple' => 'var(--purple)',
	'brass'  => 'var(--brass)',
	'yellow' => 'var(--yellow)',
	'copper' => 'var(--copper)',
);
$accent = isset( $accent_map[ $color ] ) ? $accent_map[ $color ] : 'var(--purple)';

$anchor    = ( isset( $attributes['anchor'] ) && $attributes['anchor'] ) ? ' id="' . esc_attr( $attributes['anchor'] ) . '"' : '';
$extra_cls = ( isset( $attributes['className'] ) && $attributes['className'] ) ? ' ' . esc_attr( $attributes['className'] ) : '';

if ( empty( $entries ) ) {
	// Match Astro's empty state: <p class="timeline__empty">...</p>
	?>
	<p<?php echo $anchor; ?> class="timeline__empty<?php echo $extra_cls; ?>">No timeline entries yet. Editors can add events via the CMS.</p>
	<?php
	return;
}
?>
<ol<?php echo $anchor; ?> class="timeline<?php echo $extra_cls; ?>" style="--tl-accent:<?php echo esc_attr( $accent ); ?>">
<?php foreach ( $entries as $i => $e ) :
	$year      = isset( $e['year'] )     ? (string) $e['year']     : '';
	$event     = isset( $e['event'] )    ? (string) $e['event']    : '';
	$image     = isset( $e['image'] )    ? (string) $e['image']    : '';
	$image_id  = isset( $e['imageId'] ) ? (int)    $e['imageId']  : 0;
	$image_alt = isset( $e['imageAlt'] ) ? (string) $e['imageAlt'] : '';
	// Prefer the media library URL when the entry has an imageId — that way
	// swapping an image in the editor's MediaUpload picker is reflected on
	// the front end even if the owner never retypes the `image` field. The
	// bare `image` attribute is kept as a fallback for pre-import content
	// and for owner-pasted external URLs.
	if ( $image_id > 0 ) {
		$resolved = wp_get_attachment_url( $image_id );
		if ( $resolved ) {
			$image = $resolved;
		}
	}
	$alt_class = ( $i % 2 === 1 ) ? ' timeline__entry--alt' : '';

	// Decode HTML entities from Astro's markdown (curly quotes, apostrophes,
	// em-dashes) so the browser sees the intended glyphs.
	$year_decoded  = html_entity_decode( $year,  ENT_QUOTES | ENT_HTML5, 'UTF-8' );
	$event_decoded = html_entity_decode( $event, ENT_QUOTES | ENT_HTML5, 'UTF-8' );
	$alt_decoded   = html_entity_decode( $image_alt, ENT_QUOTES | ENT_HTML5, 'UTF-8' );
?>
	<li class="timeline__entry<?php echo $alt_class; ?>">
		<div class="timeline__marker" aria-hidden="true">
			<span class="timeline__dot"></span>
		</div>
		<div class="timeline__year"><?php echo esc_html( $year_decoded ); ?></div>
		<div class="timeline__event">
			<p class="timeline__event-text"><?php echo esc_html( $event_decoded ); ?></p>
<?php if ( '' !== $image ) : ?>
			<img class="timeline__image" src="<?php echo esc_url( $image ); ?>" alt="<?php echo esc_attr( $alt_decoded ); ?>" loading="lazy" />
<?php endif; ?>
		</div>
	</li>
<?php endforeach; ?>
</ol>
