<?php
/**
 * Bozzies settings — owner-editable site-wide options.
 *
 * The site owner has the Editor role in production. Editors don't have
 * `manage_options`, and they can't reach the site-editor template parts
 * (header / footer). This screen exposes site-wide options they DO need
 * to change from the admin.
 *
 * Screen: Bozzies (top-level admin menu), capability `edit_pages` — Editors
 * have it, Contributors and Subscribers don't. Uses the Settings API for the
 * form + option registration + nonces.
 *
 * Options registered here:
 *   - `bozzies_donate_url` (string) — the destination for header + footer
 *     "Donate" buttons. Empty means the buttons render without an href.
 *
 * @package bozzies
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Site-wide donate URL. Header + footer donate buttons read from this;
 * in-content donate buttons (bozzies/donate-teaser, bozzies/about-cta, etc.)
 * keep their own per-block URL attributes so owners can edit them in place.
 */
function bozzies_get_donate_url() {
	return trim( (string) get_option( 'bozzies_donate_url', '' ) );
}

add_action( 'admin_init', 'bozzies_register_settings' );
function bozzies_register_settings() {
	register_setting(
		'bozzies_settings',
		'bozzies_donate_url',
		array(
			'type'              => 'string',
			'sanitize_callback' => 'bozzies_sanitize_donate_url',
			'default'           => '',
			'show_in_rest'      => false,
		)
	);
}

/**
 * Accept empty or an absolute http(s) URL. Anything else is coerced to empty
 * so the header renders an inert `<a href="">` (matches the pre-launch state).
 */
function bozzies_sanitize_donate_url( $value ) {
	$value = trim( (string) $value );
	if ( '' === $value ) {
		return '';
	}
	$url = esc_url_raw( $value, array( 'http', 'https' ) );
	return $url ? $url : '';
}

add_action( 'admin_menu', 'bozzies_admin_menu' );
function bozzies_admin_menu() {
	add_menu_page(
		__( 'Bozzies settings', 'bozzies' ),
		__( 'Bozzies', 'bozzies' ),
		'edit_pages',            // Editors have this capability.
		'bozzies-settings',
		'bozzies_render_settings_page',
		'dashicons-heart',
		80                       // Below Comments (25), above Appearance (60).
	);
}

function bozzies_render_settings_page() {
	if ( ! current_user_can( 'edit_pages' ) ) {
		wp_die( esc_html__( 'Sorry, you are not allowed to access this page.', 'bozzies' ) );
	}
	$current = bozzies_get_donate_url();
	?>
	<div class="wrap">
		<h1><?php esc_html_e( 'Bozzies settings', 'bozzies' ); ?></h1>
		<form method="post" action="options.php" novalidate>
			<?php settings_fields( 'bozzies_settings' ); ?>
			<table class="form-table" role="presentation">
				<tbody>
					<tr>
						<th scope="row">
							<label for="bozzies_donate_url"><?php esc_html_e( 'Donate URL', 'bozzies' ); ?></label>
						</th>
						<td>
							<input
								type="url"
								id="bozzies_donate_url"
								name="bozzies_donate_url"
								value="<?php echo esc_attr( $current ); ?>"
								placeholder="https://…"
								class="regular-text code"
								inputmode="url"
								autocomplete="url"
							/>
							<p class="description">
								<?php esc_html_e( 'The header and footer Donate buttons link here. Leave empty to hide the destination. Donate buttons inside page content (home, about, sub-hubs) are edited in place on each page.', 'bozzies' ); ?>
							</p>
						</td>
					</tr>
				</tbody>
			</table>
			<?php submit_button( __( 'Save changes', 'bozzies' ) ); ?>
		</form>
	</div>
	<?php
}
