<?php
/**
 * Example: dev-tools/mu-plugins/dev-host.php
 *
 * Copy this file to dev-tools/mu-plugins/dev-host.php (the mu-plugins folder
 * is gitignored). wp-env mounts the folder into wp-content/mu-plugins via
 * .wp-env.override.json's `mappings`, so WordPress picks it up on start.
 *
 *   mkdir -p dev-tools/mu-plugins
 *   cp dev-tools/dev-host.example.php dev-tools/mu-plugins/dev-host.php
 *   npx wp-env stop && npx wp-env start   # to pick up the new mapping
 *
 * Then open the site from a phone on the same LAN at
 *   http://<your Mac's LAN IP>:8888/
 *
 * Find the Mac's IP with: `ipconfig getifaddr en0` (Wi-Fi) or `en1` (wired).
 *
 * How it works: WordPress stores siteurl/home as "http://localhost:8888".
 * WP_CONTENT_URL is baked from that at wp-config load. This mu-plugin
 * short-circuits `pre_option_home` / `pre_option_siteurl`, filters every
 * URL-building helper (home_url, site_url, content_url, admin_url, etc.),
 * and — as a nuclear fallback — starts an output buffer that swaps
 * `http(s)://localhost:8888` for `<scheme>://<HTTP_HOST>` in the response
 * body. Localhost access stays a no-op.
 */

if ( ! defined( 'ABSPATH' ) ) {
	return;
}
if ( empty( $_SERVER['HTTP_HOST'] ) ) {
	return;
}

$host  = (string) $_SERVER['HTTP_HOST'];
$proto = ( ! empty( $_SERVER['HTTPS'] ) && 'off' !== $_SERVER['HTTPS'] ) ? 'https' : 'http';
$base  = $proto . '://' . $host;

$STORED_HOSTS = array( 'http://localhost:8888', 'https://localhost:8888' );

add_filter( 'pre_option_home',    function () use ( $base ) { return $base; } );
add_filter( 'pre_option_siteurl', function () use ( $base ) { return $base; } );

$url_rewrite = function ( $url ) use ( $STORED_HOSTS, $base ) {
	return is_string( $url ) ? str_replace( $STORED_HOSTS, array( $base, $base ), $url ) : $url;
};

foreach ( array(
	'home_url', 'site_url', 'content_url', 'admin_url', 'includes_url', 'plugins_url',
	'stylesheet_directory_uri', 'template_directory_uri', 'wp_get_attachment_url',
	'the_content', 'the_excerpt', 'widget_text',
) as $f ) {
	add_filter( $f, $url_rewrite, 999 );
}

add_filter( 'render_block', function ( $c ) use ( $url_rewrite ) { return $url_rewrite( $c ); }, 999 );

if ( 'localhost:8888' !== $host ) {
	add_action( 'init', function () use ( $STORED_HOSTS, $base ) {
		if ( is_admin() && wp_doing_ajax() ) {
			return;
		}
		ob_start( function ( $html ) use ( $STORED_HOSTS, $base ) {
			return str_replace( $STORED_HOSTS, array( $base, $base ), $html );
		} );
	}, 0 );
}

remove_filter( 'template_redirect', 'redirect_canonical' );
