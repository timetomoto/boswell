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
	register_block_style( 'core/separator', array( 'name' => 'hairline',      'label' => __( 'Hairline', 'bozzies' ) ) );
	register_block_style( 'core/separator', array( 'name' => 'hairline-thin', 'label' => __( 'Hairline thin', 'bozzies' ) ) );
	register_block_style( 'core/separator', array( 'name' => 'jazz',          'label' => __( 'Jazz divider', 'bozzies' ) ) );
	register_block_style( 'core/quote',     array( 'name' => 'pull-quote',    'label' => __( 'Pull quote', 'bozzies' ) ) );
	register_block_style( 'core/group',     array( 'name' => 'card',          'label' => __( 'Card', 'bozzies' ) ) );
	register_block_style( 'core/columns',   array( 'name' => 'card',          'label' => __( 'Card', 'bozzies' ) ) );
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
