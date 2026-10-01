<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! defined( 'BOZZIES_GA_MEASUREMENT_ID' ) ) {
	define( 'BOZZIES_GA_MEASUREMENT_ID', 'G-K0G0LKX17Z' );
}

/**
 * Whether the consent + analytics flow should run for this request.
 * Guards: production environment, visitor is logged out, measurement ID set.
 * BOZZIES_ANALYTICS_FORCE bypasses env + logged-in checks for local testing only.
 */
function bozzies_analytics_active() {
	if ( ! BOZZIES_GA_MEASUREMENT_ID ) {
		return false;
	}
	if ( is_user_logged_in() ) {
		return false;
	}
	$force = defined( 'BOZZIES_ANALYTICS_FORCE' ) && BOZZIES_ANALYTICS_FORCE === true;
	if ( ! $force && 'production' !== wp_get_environment_type() ) {
		return false;
	}
	return true;
}

add_action( 'wp_enqueue_scripts', 'bozzies_analytics_enqueue' );
function bozzies_analytics_enqueue() {
	if ( ! bozzies_analytics_active() ) {
		return;
	}
	$dir_uri = get_stylesheet_directory_uri();

	wp_enqueue_style(
		'bozzies-consent',
		$dir_uri . '/assets/css/consent.css',
		array(),
		bozzies_asset_ver( 'assets/css/consent.css' )
	);

	wp_enqueue_script(
		'bozzies-consent',
		$dir_uri . '/assets/js/consent.js',
		array(),
		bozzies_asset_ver( 'assets/js/consent.js' ),
		array(
			'strategy'  => 'defer',
			'in_footer' => true,
		)
	);

	$privacy_url = get_privacy_policy_url();

	wp_add_inline_script(
		'bozzies-consent',
		'window.__BOZZIES_CONSENT__=' . wp_json_encode(
			array(
				'measurementId' => BOZZIES_GA_MEASUREMENT_ID,
				'privacyUrl'    => $privacy_url,
				'cookieDays'    => 180,
			)
		) . ';',
		'before'
	);
}

add_action( 'wp_footer', 'bozzies_analytics_banner_markup' );
function bozzies_analytics_banner_markup() {
	if ( ! bozzies_analytics_active() ) {
		return;
	}
	$privacy_url = get_privacy_policy_url();
	?>
	<aside id="bozzies-consent" class="bozzies-consent" role="region" aria-label="<?php esc_attr_e( 'Cookie consent', 'bozzies' ); ?>" aria-live="polite" hidden>
		<p class="bozzies-consent__text">
			<?php echo esc_html__( 'This site uses cookies for anonymous visitor statistics.', 'bozzies' ); ?>
			<?php if ( $privacy_url ) : ?>
				<a class="bozzies-consent__policy" href="<?php echo esc_url( $privacy_url ); ?>"><?php esc_html_e( 'Privacy policy', 'bozzies' ); ?></a>
			<?php endif; ?>
		</p>
		<div class="bozzies-consent__actions">
			<button type="button" class="bozzies-consent__btn" id="bozzies-consent-accept"><?php esc_html_e( 'Accept', 'bozzies' ); ?></button>
			<button type="button" class="bozzies-consent__btn" id="bozzies-consent-decline"><?php esc_html_e( 'Decline', 'bozzies' ); ?></button>
		</div>
	</aside>
	<?php
}
