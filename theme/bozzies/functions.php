<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

require_once __DIR__ . '/inc/analytics.php';

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
