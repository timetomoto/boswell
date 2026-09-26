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
	register_block_style( 'core/paragraph', array(
		'name'  => 'eyebrow',
		'label' => __( 'Eyebrow', 'bozzies' ),
	) );
	register_block_style( 'core/separator', array(
		'name'  => 'hairline',
		'label' => __( 'Hairline', 'bozzies' ),
	) );
	register_block_style( 'core/separator', array(
		'name'  => 'hairline-thin',
		'label' => __( 'Hairline thin', 'bozzies' ),
	) );
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
