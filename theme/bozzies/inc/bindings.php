<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_action( 'init', 'bozzies_register_bindings' );
function bozzies_register_bindings() {
	if ( ! function_exists( 'register_block_bindings_source' ) ) {
		return;
	}
	register_block_bindings_source(
		'bozzies/copyright-year',
		array(
			'label'              => __( 'Current copyright line', 'bozzies' ),
			'get_value_callback' => 'bozzies_bindings_copyright_year',
		)
	);
}

function bozzies_bindings_copyright_year( $source_args, $block_instance, $attribute_name ) {
	return '© ' . gmdate( 'Y' );
}
