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
}

add_action( 'after_setup_theme', 'bozzies_add_editor_styles' );
function bozzies_add_editor_styles() {
	// Load the front chrome inside the block editor iframe so existing
	// Group-based ground styles, backdrops, and pull-quote overrides render
	// consistently in edit mode.
	add_editor_style( 'assets/css/chrome.css' );
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
