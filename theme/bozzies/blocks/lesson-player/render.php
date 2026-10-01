<?php
/**
 * Server-side render for bozzies/lesson-player.
 *
 * Emits Astro's exact DOM verbatim from
 * ~/boswell-poc/src/pages/media/lessons/[order].astro lines 37-68 —
 * the paper-ground section that holds the audio player module and a
 * .prose.lesson-notes region for the narration copy.
 *
 * Attributes carry the lesson metadata (order + title + audio URL/ID).
 * Inner blocks hold the narration prose.
 *
 * @package bozzies
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$attrs = wp_parse_args(
	isset( $attributes ) && is_array( $attributes ) ? $attributes : array(),
	array(
		'order'    => 0,
		'title'    => '',
		'audioUrl' => '',
	)
);

$anchor    = ( isset( $attributes['anchor'] ) && $attributes['anchor'] ) ? ' id="' . esc_attr( $attributes['anchor'] ) . '"' : '';
$extra_cls = ( isset( $attributes['className'] ) && $attributes['className'] ) ? ' ' . esc_attr( $attributes['className'] ) : '';

// RichText / string attrs may carry HTML entities from Astro markdown; decode
// to Unicode so the browser sees the intended glyphs (curly quotes etc.).
$title     = html_entity_decode( (string) $attrs['title'], ENT_QUOTES | ENT_HTML5, 'UTF-8' );
$order     = (int) $attrs['order'];
$audio_url = (string) $attrs['audioUrl'];
?>
<section<?php echo $anchor; ?> class="section ground-paper lesson-player-section<?php echo $extra_cls; ?>">
	<div class="container-narrow">
		<div class="lesson-player">
			<div class="lesson-player__label">
				<svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
					<circle cx="20" cy="20" r="19" fill="none" stroke="currentColor" stroke-width="1"/>
					<path d="M15 12 L28 20 L15 28 Z" fill="currentColor"/>
				</svg>
				<div>
					<span class="lesson-player__label-kicker">Lesson <?php echo esc_html( (string) $order ); ?></span>
					<span class="lesson-player__label-title"><?php echo wp_kses_post( $title ); ?></span>
				</div>
			</div>
			<audio
				class="lesson-player__audio"
				controls
				preload="metadata"
				src="<?php echo esc_url( $audio_url ); ?>"
			>
				Your browser does not support the audio element.
				<a href="<?php echo esc_url( $audio_url ); ?>">Download the MP3</a>
			</audio>
			<a class="lesson-player__download" href="<?php echo esc_url( $audio_url ); ?>" download>
				Download MP3
			</a>
		</div>

		<div class="prose lesson-notes">
<?php echo $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- InnerBlocks output. ?>
		</div>
	</div>
</section>
