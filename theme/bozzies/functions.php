<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

require_once __DIR__ . '/inc/analytics.php';
require_once __DIR__ . '/inc/bindings.php';

add_action( 'init', 'bozzies_register_section_styles' );
function bozzies_register_section_styles() {
	$blocks = array( 'core/group', 'core/columns', 'core/cover' );
	$styles = array(
		array( 'name' => 'paper',  'label' => __( 'Paper',  'bozzies' ) ),
		array( 'name' => 'ink',    'label' => __( 'Ink',    'bozzies' ) ),
		array( 'name' => 'purple', 'label' => __( 'Purple', 'bozzies' ) ),
		array( 'name' => 'gold',   'label' => __( 'Gold',   'bozzies' ) ),
	);
	foreach ( $styles as $style ) {
		register_block_style( $blocks, $style );
	}
}

add_action( 'init', 'bozzies_register_editor_style_variations' );
function bozzies_register_editor_style_variations() {
	register_block_style( 'core/paragraph', array( 'name' => 'eyebrow',       'label' => __( 'Eyebrow', 'bozzies' ) ) );
	register_block_style( 'core/paragraph', array( 'name' => 'lede',          'label' => __( 'Lede', 'bozzies' ) ) );
	register_block_style( 'core/separator', array( 'name' => 'hairline',      'label' => __( 'Hairline', 'bozzies' ) ) );
	register_block_style( 'core/separator', array( 'name' => 'hairline-thin', 'label' => __( 'Hairline thin', 'bozzies' ) ) );
	register_block_style( 'core/separator', array( 'name' => 'jazz',          'label' => __( 'Jazz divider', 'bozzies' ) ) );
	register_block_style( 'core/quote',     array( 'name' => 'pull-quote',    'label' => __( 'Pull quote', 'bozzies' ) ) );
	register_block_style( 'core/group',     array( 'name' => 'card',          'label' => __( 'Card', 'bozzies' ) ) );
	register_block_style( 'core/columns',   array( 'name' => 'card',          'label' => __( 'Card', 'bozzies' ) ) );
	/* "Card plain" — paper-ground variant used on Sisters hub etc. */
	register_block_style( 'core/group',     array( 'name' => 'card-plain',    'label' => __( 'Card (paper)', 'bozzies' ) ) );
	register_block_style( 'core/columns',   array( 'name' => 'card-plain',    'label' => __( 'Card (paper)', 'bozzies' ) ) );
	/* "Play" button style prepends an inline play-icon SVG before the label. */
	register_block_style( 'core/button', array( 'name' => 'play', 'label' => __( 'Play', 'bozzies' ) ) );
	/* "Large" button style adds extra padding — Astro's .btn--purple CTA. */
	register_block_style( 'core/button', array( 'name' => 'large', 'label' => __( 'Large', 'bozzies' ) ) );
}

add_action( 'init', 'bozzies_register_pattern_categories', 9 );
function bozzies_register_pattern_categories() {
	register_block_pattern_category( 'boswell', array(
		'label'       => __( 'Boswell', 'bozzies' ),
		'description' => __( 'Patterns tuned to the Boswell Sisters editorial design.', 'bozzies' ),
	) );
}

add_action( 'init', 'bozzies_register_theme_blocks' );
function bozzies_register_theme_blocks() {
	foreach ( glob( __DIR__ . '/blocks/*/block.json' ) as $block_json ) {
		register_block_type( dirname( $block_json ) );
	}
}

add_action( 'wp_enqueue_scripts', 'bozzies_enqueue_chrome' );
function bozzies_enqueue_chrome() {
	$ver     = wp_get_theme()->get( 'Version' );
	$dir_uri = get_stylesheet_directory_uri();
	wp_enqueue_style(
		'bozzies-chrome',
		$dir_uri . '/assets/css/chrome.css',
		array(),
		$ver
	);
	// Astro hero CSS — verbatim port of Hero.astro's <style> plus the
	// .eyebrow / .container rules from Astro's global.css. Owned by the
	// section block's is-hero-photo variant.
	wp_enqueue_style(
		'bozzies-astro-hero',
		$dir_uri . '/assets/css/astro/hero.css',
		array( 'bozzies-chrome' ),
		$ver
	);
}

add_action( 'after_setup_theme', 'bozzies_add_editor_styles' );
function bozzies_add_editor_styles() {
	// Load the front chrome inside the block editor iframe so existing
	// Group-based ground styles, backdrops, and pull-quote overrides render
	// consistently in edit mode.
	add_editor_style( 'assets/css/chrome.css' );
	// Same Astro hero CSS the front uses, so the owner sees the real hero
	// look while editing a hub page.
	add_editor_style( 'assets/css/astro/hero.css' );
}

/**
 * Enqueue the "Article details" sidebar plugin on post-editor screens only.
 * The meta keys are underscore-prefixed so Custom Fields hides them; this
 * panel gives the owner a normal Gutenberg control that writes through REST.
 */
add_action( 'enqueue_block_editor_assets', 'bozzies_enqueue_article_meta_panel' );
function bozzies_enqueue_article_meta_panel() {
	$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
	if ( $screen && isset( $screen->post_type ) && 'post' !== $screen->post_type ) {
		return;
	}
	$ver = wp_get_theme()->get( 'Version' );
	wp_enqueue_script(
		'bozzies-article-meta-panel',
		get_stylesheet_directory_uri() . '/assets/js/article-meta-panel.js',
		array( 'wp-plugins', 'wp-edit-post', 'wp-element', 'wp-components', 'wp-data', 'wp-core-data', 'wp-i18n' ),
		$ver,
		true
	);
}

// Authors on this site write copy that must land on the front verbatim (it
// often mirrors the Astro reference character-for-character). WordPress
// auto-textures apostrophes and quotes into curly typographers' variants;
// switch that off so straight quotes stay straight and match the source.
add_filter( 'run_wptexturize', '__return_false' );

/**
 * Rewrite YouTube embed URLs to the privacy-enhanced youtube-nocookie.com
 * domain everywhere: core Embed blocks, oEmbed HTML cached in the DB,
 * bare iframe HTML in Custom HTML blocks, and post content. Applies to both
 * watch URLs (converted to /embed/ form by WP's YouTube handler) and any
 * direct youtube.com/embed/ iframe src.
 */
function bozzies_youtube_nocookie( $html ) {
	if ( is_string( $html ) && strpos( $html, 'youtube.com' ) !== false ) {
		$html = preg_replace( '#(https?:)?//(?:www\.)?youtube\.com/embed/#i', '$1//www.youtube-nocookie.com/embed/', $html );
	}
	return $html;
}
add_filter( 'embed_oembed_html', 'bozzies_youtube_nocookie', 20 );
add_filter( 'oembed_result', 'bozzies_youtube_nocookie', 20 );
add_filter( 'the_content', 'bozzies_youtube_nocookie', 20 );
add_filter( 'render_block', function ( $block_content, $block ) {
	if ( in_array( $block['blockName'], array( 'core/embed', 'core/html' ), true ) ) {
		return bozzies_youtube_nocookie( $block_content );
	}
	return $block_content;
}, 20, 2 );

/**
 * Give /press/{category}/{postname}/ post URLs priority over WP's verbose
 * page-hierarchy resolution. Without this, WP treats /press/ as a page and
 * refuses to dispatch descendant URLs to posts (the "press" page hub blocks
 * all article URLs). See settled decisions: articles are posts, sub-hubs are
 * categories, article URLs are /press/{category}/{slug}/.
 */
add_action( 'init', 'bozzies_press_rewrite_rule', 11 );
function bozzies_press_rewrite_rule() {
	add_rewrite_rule(
		'^press/([^/]+)/([^/]+)/?$',
		'index.php?category_name=$matches[1]&name=$matches[2]',
		'top'
	);
}

/**
 * Astro's article rows show a zero-padded row number as visible text
 * (`<span class="article-row__num">01</span>`). CSS counters via `::before`
 * would be visually correct but wouldn't land in the DOM, so screen readers
 * and text-diff tooling wouldn't see them. Inject a real <span> at render
 * time on any post-template with the `bozzies-article-list` class.
 */
add_filter( 'render_block_core/post-template', 'bozzies_number_article_rows', 10, 2 );
function bozzies_number_article_rows( $block_content, $block ) {
	$cls = isset( $block['attrs']['className'] ) ? (string) $block['attrs']['className'] : '';
	if ( strpos( $cls, 'bozzies-article-list' ) === false ) {
		return $block_content;
	}
	$i = 0;
	return preg_replace_callback(
		'#<li([^>]*)>#',
		function ( $m ) use ( &$i ) {
			$i++;
			$num = str_pad( (string) $i, 2, '0', STR_PAD_LEFT );
			return '<li' . $m[1] . '><span class="bozzies-article-row__num">' . $num . '</span>';
		},
		$block_content,
		-1
	);
}

/**
 * Category archives (press sub-hubs) sort articles by menu_order asc so the
 * on-page order matches Astro's frontmatter `order` field (vintage 2..12
 * first, then the fill-in indices for the other sub-hubs). Without this the
 * default query is date-desc, which reverses the Astro order.
 */
/**
 * Adjacent-post navigation (prev/next on single articles) sorts by
 * menu_order — mirroring Astro's `order` frontmatter — instead of the WP
 * default post_date. Otherwise articles that carry a publicationDate
 * (year → 1937-01-01) fall out of order compared to Astro.
 */
add_filter( 'get_previous_post_sort', 'bozzies_adjacent_post_sort' );
add_filter( 'get_next_post_sort',     'bozzies_adjacent_post_sort' );
add_filter( 'get_previous_post_where','bozzies_previous_post_where', 10, 5 );
add_filter( 'get_next_post_where',    'bozzies_next_post_where',     10, 5 );
function bozzies_adjacent_post_sort( $sort ) {
	// Preserve caller's ORDER BY direction — get_previous_post uses DESC,
	// get_next_post uses ASC. Replace the date column with menu_order.
	$dir = false !== strpos( $sort, 'DESC' ) ? 'DESC' : 'ASC';
	return "ORDER BY p.menu_order $dir LIMIT 1";
}
function bozzies_previous_post_where( $where, $in_same_term, $excluded_terms, $taxonomy, $post ) {
	global $wpdb;
	// WP's default WHERE is: `WHERE p.post_date < '...' AND p.post_type = 'post' ...`
	// (older WP) or the parens form `WHERE (p.post_date < '...' OR (p.post_date = ... AND p.ID < ...))`.
	// Replace either shape with a single menu_order comparison.
	$where = preg_replace(
		'/WHERE\s+\(?\s*p\.post_date\s*<\s*\'[^\']+\'(?:\s+OR\s+\(p\.post_date\s*=\s*\'[^\']+\'\s+AND\s+p\.ID\s*<\s*\d+\)\s*)?\)?/',
		$wpdb->prepare( 'WHERE p.menu_order < %d', (int) $post->menu_order ),
		$where
	);
	return $where;
}
function bozzies_next_post_where( $where, $in_same_term, $excluded_terms, $taxonomy, $post ) {
	global $wpdb;
	$where = preg_replace(
		'/WHERE\s+\(?\s*p\.post_date\s*>\s*\'[^\']+\'(?:\s+OR\s+\(p\.post_date\s*=\s*\'[^\']+\'\s+AND\s+p\.ID\s*>\s*\d+\)\s*)?\)?/',
		$wpdb->prepare( 'WHERE p.menu_order > %d', (int) $post->menu_order ),
		$where
	);
	return $where;
}

/**
 * Astro's article-nav wraps around: at the last article in a sub-hub, "Next"
 * links to the first; at the first, "Previous" links to the last. WP's
 * post-navigation-link renders nothing when there's no adjacent post. Fill
 * in the wraparound render so the UI (and the visible-text diff) matches.
 */
add_filter( 'render_block_core/post-navigation-link', 'bozzies_wrap_post_navigation', 10, 2 );
function bozzies_wrap_post_navigation( $block_content, $block ) {
	// WP still wraps an empty adjacent-post navigation in a `<div class="…"></div>`.
	// Treat "no <a> inside" as the empty case rather than an entirely empty string.
	if ( strpos( $block_content, '<a ' ) !== false ) {
		return $block_content;
	}
	$type = ( isset( $block['attrs']['type'] ) && 'next' === $block['attrs']['type'] ) ? 'next' : 'previous';
	$post = get_post();
	if ( ! $post ) {
		return $block_content;
	}
	$terms = get_the_terms( $post, 'category' );
	if ( empty( $terms ) || is_wp_error( $terms ) ) {
		return $block_content;
	}
	$term_ids = wp_list_pluck( $terms, 'term_id' );
	$args = array(
		'post_type'      => 'post',
		'posts_per_page' => 1,
		'category__in'   => $term_ids,
		'post__not_in'   => array( $post->ID ),
		'orderby'        => 'menu_order',
		'order'          => 'next' === $type ? 'ASC' : 'DESC',
		'no_found_rows'  => true,
	);
	$wrap = get_posts( $args );
	if ( empty( $wrap ) ) {
		return $block_content;
	}
	$target = $wrap[0];
	$label  = 'next' === $type ? 'Next' : 'Previous';
	$rel    = 'next' === $type ? 'next' : 'prev';
	$cls    = 'next' === $type
		? 'post-navigation-link-next wp-block-post-navigation-link'
		: 'post-navigation-link-previous wp-block-post-navigation-link';
	return sprintf(
		'<div class="%s"><span class="post-navigation-link__label">%s</span> <a href="%s" rel="%s">%s</a></div>',
		esc_attr( $cls ),
		esc_html( $label ),
		esc_url( get_permalink( $target ) ),
		esc_attr( $rel ),
		esc_html( get_the_title( $target ) )
	);
}

add_action( 'pre_get_posts', 'bozzies_press_category_order' );
function bozzies_press_category_order( $query ) {
	if ( is_admin() || ! $query->is_main_query() ) {
		return;
	}
	if ( ! $query->is_category() ) {
		return;
	}
	$query->set( 'orderby',         'menu_order' );
	$query->set( 'order',           'ASC' );
	$query->set( 'posts_per_page',  -1 ); // Show every article — no pagination.
}

/**
 * Register the article-meta post meta fields — author, publication, and the
 * raw publication-date string. The date string is stored verbatim so the
 * front matches the Astro source ("1932" stays "1932" instead of becoming
 * "January 1, 1932"); post_date is set separately for sortability.
 *
 * `show_in_rest` is on so the fields appear in the block editor sidebar
 * (Custom Fields panel + REST API), which lets the owner edit them without
 * leaving Gutenberg. Sanitized as plain text — no HTML.
 */
add_action( 'init', 'bozzies_register_article_meta' );
function bozzies_register_article_meta() {
	$args = array(
		'type'              => 'string',
		'single'            => true,
		'show_in_rest'      => true,
		'default'           => '',
		'sanitize_callback' => 'sanitize_text_field',
		'auth_callback'     => function () { return current_user_can( 'edit_posts' ); },
	);
	register_post_meta( 'post', '_bozzies_author',           $args );
	register_post_meta( 'post', '_bozzies_publication',      $args );
	register_post_meta( 'post', '_bozzies_publication_date', $args );
	register_term_meta( 'category', '_bozzies_kicker', array(
		'type'              => 'string',
		'single'            => true,
		'show_in_rest'      => true,
		'default'           => '',
		'sanitize_callback' => 'sanitize_text_field',
		'auth_callback'     => function () { return current_user_can( 'manage_categories' ); },
	) );
}
