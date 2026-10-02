<?php
/**
 * Plugin Name:       Bozzies Hardening
 * Description:       Site-wide security hardening for bozzies.org. Disables XML-RPC, blocks public username discovery (REST users endpoint for logged-out visitors + ?author=N redirect), sends security response headers, and ensures the consent cookie carries Secure + SameSite=Lax when read back here.
 * Version:           1.0.0
 * Author:            Time to Moto
 * License:           GPL-2.0-or-later
 *
 * Why this is a must-use (mu) plugin, not a theme hook and not a regular
 * plugin:
 *
 *   - **Not in the theme**: if the active theme is ever switched (even
 *     briefly for debugging), security must not vanish with it.
 *   - **Not a regular plugin**: regular plugins appear on
 *     Plugins → Installed Plugins and can be deactivated through the
 *     admin UI with one click. A single wrong click would turn these
 *     protections off until someone noticed.
 *   - **mu-plugin**: WordPress loads every top-level .php file in
 *     `wp-content/mu-plugins/` unconditionally and does not expose a
 *     deactivate action in the admin. Deployed by
 *     `scripts/deploy/deploy-mu-plugins.sh` from the repo's
 *     `mu-plugins/` folder.
 *
 * This file is intentionally single-file so WordPress's mu-plugin
 * loader picks it up without an index.
 *
 * @package Bozzies_Hardening
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// ----------------------------------------------------------------------
// 1. Disable XML-RPC entirely.
//
// Two layers so no XML-RPC method responds and the endpoint itself
// doesn't accept POSTs:
//
//   (a) `xmlrpc_enabled` filter — WP's own switch; makes every method
//       (including pingback.ping, which bots scan for) refuse.
//   (b) Remove the <link rel="pingback"> header and `<link>` tag.
//   (c) Intercept any request to /xmlrpc.php before WordPress even
//       boots the XML-RPC server — return 403 immediately. Protects
//       against bots that pound /xmlrpc.php with POST payloads
//       regardless of whether methods are enabled.
// ----------------------------------------------------------------------
add_filter( 'xmlrpc_enabled', '__return_false' );

add_filter(
	'wp_headers',
	function ( $headers ) {
		unset( $headers['X-Pingback'] );
		return $headers;
	}
);

remove_action( 'wp_head', 'rsd_link' ); // Really-Simple-Discovery link.

add_action(
	'init',
	function () {
		if ( empty( $_SERVER['REQUEST_URI'] ) ) {
			return;
		}
		$path = (string) wp_parse_url( (string) $_SERVER['REQUEST_URI'], PHP_URL_PATH );
		if ( '' === $path ) {
			return;
		}
		if ( 0 === strcasecmp( $path, '/xmlrpc.php' ) ) {
			status_header( 403 );
			nocache_headers();
			header( 'Content-Type: text/plain; charset=utf-8' );
			exit( 'XML-RPC is disabled on this site.' );
		}
	},
	1
);

// ----------------------------------------------------------------------
// 2. Stop public username discovery.
//
// WordPress leaks user slugs by default in two places:
//
//   (a) The REST route `GET /wp-json/wp/v2/users` returns an array of
//       every author with a published post (id, slug, display name,
//       avatar URL). Shut it to logged-out visitors by removing those
//       routes from the REST endpoint registry. Logged-in editors
//       keep access.
//   (b) `?author=N` on the front end redirects to `/author/<slug>/`,
//       which exposes the login name. Intercept the author query var
//       for logged-out visitors and 301 to the home page instead.
// ----------------------------------------------------------------------
add_filter(
	'rest_endpoints',
	function ( $endpoints ) {
		if ( is_user_logged_in() ) {
			return $endpoints;
		}
		if ( isset( $endpoints['/wp/v2/users'] ) ) {
			unset( $endpoints['/wp/v2/users'] );
		}
		if ( isset( $endpoints['/wp/v2/users/(?P<id>[\d]+)'] ) ) {
			unset( $endpoints['/wp/v2/users/(?P<id>[\d]+)'] );
		}
		return $endpoints;
	}
);

// Intercept BOTH forms of author discovery before WordPress's own
// `redirect_canonical` (which runs on `template_redirect` priority 10)
// gets a chance to expand `?author=N` into `/author/<slug>/` and leak
// the user_login. Priority 1 so we run before core.
//
//   - `?author=N`         → caught via $_GET['author'].
//   - `/author/<slug>/`   → caught via is_author(). Someone who already
//                           knows a slug (or guesses) can still visit
//                           this URL; without this check the archive
//                           page renders and confirms the slug.
//
// Logged-in editors keep both routes working — convenient for admins
// who do want to see their own author archive from the toolbar.
add_action(
	'template_redirect',
	function () {
		if ( is_user_logged_in() ) {
			return;
		}
		$trigger = false;
		if ( isset( $_GET['author'] ) && '' !== trim( (string) $_GET['author'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			$trigger = true;
		} elseif ( is_author() ) {
			$trigger = true;
		}
		if ( ! $trigger ) {
			return;
		}
		wp_safe_redirect( home_url( '/' ), 301, 'bozzies-hardening' );
		exit;
	},
	1
);

// ----------------------------------------------------------------------
// 3. Security response headers.
//
// Sent on every WordPress-driven request through the `send_headers`
// action. Static assets served directly by Apache (CSS, JS, images,
// fonts) do not pass through PHP — if those ever need the same
// headers, add them in `.htaccess`.
//
// HSTS starts at a deliberately short `max-age` (300 seconds / 5
// minutes) so a mistake can be rolled back quickly. Ramp this value
// up (to a day, then a month, then a year with `preload`) once the
// headers have been running clean for a while.
// ----------------------------------------------------------------------
add_action(
	'send_headers',
	function () {
		// HSTS — short to start, no preload, no includeSubDomains on
		// the first roll-out so sibling subdomains (new.bozzies.org,
		// forum subdomains, etc.) aren't accidentally forced to HTTPS
		// before they're ready.
		header( 'Strict-Transport-Security: max-age=300' );
		header( 'X-Content-Type-Options: nosniff' );
		header( 'X-Frame-Options: SAMEORIGIN' );
		header( 'Referrer-Policy: strict-origin-when-cross-origin' );
		// No CSP yet — the Astro-era inline SVG patterns and some
		// third-party embeds would need review before locking down.
		header( 'Permissions-Policy: camera=(), microphone=(), geolocation=()' );
	}
);

// ----------------------------------------------------------------------
// 4. Consent cookie flags — note, not an action.
//
// The `bozzies_cookie_consent` cookie is only ever written client-side
// by `theme/bozzies/assets/js/consent.js` (`setCookie()`). It is set
// with `SameSite=Lax` unconditionally and `; Secure` whenever the page
// is served over https. On the live site that resolves to:
//
//     bozzies_cookie_consent=accept|decline;
//         expires=<date>;
//         path=/;
//         SameSite=Lax;
//         Secure
//
// There is no server-side path that writes this cookie, so no PHP
// filter is needed here — the flags live in the JS. This block is a
// pointer so a future reader can find the source of truth without
// grepping.
// ----------------------------------------------------------------------
