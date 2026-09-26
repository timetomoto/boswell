<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Numeric child page slugs (/media/lessons/1/ through /5/) collide with
 * WordPress' built-in single-post pagination (which uses the trailing /N/).
 * Without a specific rule, WP interprets the "1" as paged=1 on the parent
 * Lessons page and canonical-redirects to /media/lessons/. Force the router
 * to resolve those five URLs directly to the child pages.
 */
add_action( 'init', 'bozzies_add_lesson_rewrites', 20 );
function bozzies_add_lesson_rewrites() {
	for ( $n = 1; $n <= 5; $n++ ) {
		add_rewrite_rule(
			'^media/lessons/' . $n . '/?$',
			'index.php?pagename=media/lessons/' . $n,
			'top'
		);
	}
}
