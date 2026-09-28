<?php
/**
 * Server-side render for bozzies/release-card.
 *
 * Emits Astro's exact DOM verbatim from
 * ~/boswell-poc/src/pages/press/index.astro lines 104-111:
 *
 *   <li class="release-card">
 *     <a href="…" target="_blank" rel="noopener noreferrer" class="release-card__link">
 *       <span class="release-card__type">DOC</span>
 *       <h3 class="release-card__title">…</h3>
 *       {releaseDate && <p class="release-card__date">…</p>}
 *     </a>
 *   </li>
 *
 * @package bozzies
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$attrs = wp_parse_args(
	isset( $attributes ) && is_array( $attributes ) ? $attributes : array(),
	array(
		'documentType' => 'PDF',
		'title'        => '',
		'releaseDate'  => '',
		'href'         => '',
	)
);

// Decode HTML entities so curly glyphs survive round-trips (Gutenberg
// re-serializes `&rsquo;` etc. — decode here so the DOM matches Astro's
// Unicode output rather than showing `&rsquo;` on the front).
$documentType = html_entity_decode( (string) $attrs['documentType'], ENT_QUOTES | ENT_HTML5, 'UTF-8' );
$title        = html_entity_decode( (string) $attrs['title'],        ENT_QUOTES | ENT_HTML5, 'UTF-8' );
$releaseDate  = html_entity_decode( (string) $attrs['releaseDate'],  ENT_QUOTES | ENT_HTML5, 'UTF-8' );
$href         = $attrs['href'] ? esc_url( $attrs['href'] ) : '#';

// Astro uppercases documentType at render time
// (~/boswell-poc/src/pages/press/index.astro L107: `.toUpperCase() ?? 'DOC'`).
$documentType = strtoupper( '' !== $documentType ? $documentType : 'DOC' );
?>
<li class="release-card">
	<a href="<?php echo $href; ?>" target="_blank" rel="noopener noreferrer" class="release-card__link">
		<span class="release-card__type"><?php echo esc_html( $documentType ); ?></span>
		<h3 class="release-card__title"><?php echo esc_html( $title ); ?></h3>
<?php if ( '' !== $releaseDate ) : ?>
		<p class="release-card__date"><?php echo esc_html( $releaseDate ); ?></p>
<?php endif; ?>
	</a>
</li>
