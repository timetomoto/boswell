<?php
/**
 * Server-side render for bozzies/playlist-player.
 *
 * Emits Astro's exact DOM verbatim from
 * ~/boswell-poc/src/components/PlaylistPlayer.astro lines 18-77.
 *
 * The tracks array is stored on the block attribute and serialized into
 * a JSON <script type="application/json"> tag inside the .pp root so the
 * front-end playback script (assets/js/playlist-player.js — verbatim
 * port of PlaylistPlayer.astro lines 80-158) can read it.
 *
 * @package bozzies
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$attrs = wp_parse_args(
	isset( $attributes ) && is_array( $attributes ) ? $attributes : array(),
	array( 'tracks' => array() )
);

$tracks = is_array( $attrs['tracks'] ) ? $attrs['tracks'] : array();
if ( empty( $tracks ) ) {
	return;
}

$anchor    = ( isset( $attributes['anchor'] ) && $attributes['anchor'] ) ? ' id="' . esc_attr( $attributes['anchor'] ) . '"' : '';
$extra_cls = ( isset( $attributes['className'] ) && $attributes['className'] ) ? ' ' . esc_attr( $attributes['className'] ) : '';

$first = $tracks[0];
$first_title  = isset( $first['title'] )  ? (string) $first['title']  : '';
$first_artist = isset( $first['artist'] ) ? (string) $first['artist'] : '';
$first_year   = isset( $first['year'] )   ? (string) $first['year']   : '';
$first_meta_parts = array_values( array_filter( array( $first_artist, $first_year ), function ( $v ) { return '' !== $v; } ) );
$first_meta       = implode( ' · ', $first_meta_parts );

?>
<div<?php echo $anchor; ?> class="pp<?php echo $extra_cls; ?>" data-playlist>
	<div class="pp__player">
		<div class="pp__now">
			<span class="pp__now-eyebrow">Now playing</span>
			<span class="pp__now-title" data-title><?php echo esc_html( html_entity_decode( $first_title, ENT_QUOTES | ENT_HTML5, 'UTF-8' ) ); ?></span>
			<?php if ( '' !== $first_meta ) : ?>
			<span class="pp__now-meta" data-meta><?php echo esc_html( html_entity_decode( $first_meta, ENT_QUOTES | ENT_HTML5, 'UTF-8' ) ); ?></span>
			<?php endif; ?>
		</div>

		<div class="pp__controls">
			<button type="button" class="pp__btn" data-prev aria-label="Previous track">
				<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M6 4 L6 16 M14 4 L6 10 L14 16 Z" fill="currentColor"/></svg>
			</button>
			<button type="button" class="pp__btn pp__btn--play" data-play aria-label="Play or pause">
				<svg class="pp__icon-play" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5 L19 12 L7 19 Z" fill="currentColor"/></svg>
				<svg class="pp__icon-pause" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" style="display:none"><path d="M7 5 h4 v14 h-4 z M13 5 h4 v14 h-4 z" fill="currentColor"/></svg>
			</button>
			<button type="button" class="pp__btn" data-next aria-label="Next track">
				<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M14 4 L14 16 M6 4 L14 10 L6 16 Z" fill="currentColor"/></svg>
			</button>
		</div>

		<div class="pp__progress-wrap">
			<span class="pp__time" data-current>0:00</span>
			<div class="pp__progress" data-progress-container
					role="slider" tabindex="0"
					aria-label="Seek within track"
					aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
				<div class="pp__progress-bar" data-progress></div>
			</div>
			<span class="pp__time" data-duration>--:--</span>
		</div>

		<audio data-audio preload="metadata"></audio>
	</div>

	<ol class="pp__list" data-list role="list">
<?php foreach ( $tracks as $i => $t ) :
	$t_title    = isset( $t['title'] )    ? (string) $t['title']    : '';
	$t_artist   = isset( $t['artist'] )   ? (string) $t['artist']   : '';
	$t_year     = isset( $t['year'] )     ? (string) $t['year']     : '';
	$t_duration = isset( $t['duration'] ) ? (string) $t['duration'] : '';
	$t_meta_parts = array_values( array_filter( array( $t_artist, $t_year ), function ( $v ) { return '' !== $v; } ) );
	$t_meta       = implode( ' · ', $t_meta_parts );
	$aria_current = ( 0 === $i ) ? 'true' : 'false';
?>
		<li>
			<button type="button" class="pp__track" data-track="<?php echo (int) $i; ?>" aria-current="<?php echo esc_attr( $aria_current ); ?>">
				<span class="pp__track-index" aria-hidden="true"><?php echo esc_html( str_pad( (string) ( $i + 1 ), 2, '0', STR_PAD_LEFT ) ); ?></span>
				<span class="pp__track-body">
					<span class="pp__track-title"><?php echo esc_html( html_entity_decode( $t_title, ENT_QUOTES | ENT_HTML5, 'UTF-8' ) ); ?></span>
<?php if ( '' !== $t_meta ) : ?>
					<span class="pp__track-meta"><?php echo esc_html( html_entity_decode( $t_meta, ENT_QUOTES | ENT_HTML5, 'UTF-8' ) ); ?></span>
<?php endif; ?>
				</span>
<?php if ( '' !== $t_duration ) : ?>
				<span class="pp__track-duration"><?php echo esc_html( $t_duration ); ?></span>
<?php endif; ?>
				<span class="pp__track-icon" aria-hidden="true">
					<svg width="18" height="18" viewBox="0 0 18 18"><path d="M5 3 L14 9 L5 15 Z" fill="currentColor"/></svg>
				</span>
			</button>
		</li>
<?php endforeach; ?>
	</ol>

	<script type="application/json" data-tracks><?php echo wp_json_encode( $tracks ); ?></script>
</div>
