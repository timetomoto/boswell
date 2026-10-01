<?php
/**
 * Server-side render for bozzies/site-footer.
 *
 * Emits Astro's exact inner DOM verbatim from
 * ~/boswell-poc/src/components/Footer.astro L14-30:
 *
 *   <div class="container site-footer__inner">
 *     <div class="site-footer__mark">
 *       <p class="site-footer__wordmark">{siteName}</p>
 *       <p class="site-footer__tagline">{tagline}</p>
 *     </div>
 *     <nav aria-label="Footer" class="site-footer__nav">
 *       <ul role="list">
 *         <li><a href="…">…</a></li>
 *         …
 *       </ul>
 *     </nav>
 *     <div class="site-footer__meta">
 *       <p>{footerCredits}</p>
 *       <p>&copy; {year}</p>
 *     </div>
 *   </div>
 *
 * The outer `<footer class="site-footer ground-purple">` is the template-part
 * wrapper itself. `render_block_data` in `functions.php` injects the
 * `site-footer ground-purple` className into the footer template-part on
 * render so it becomes exactly
 * `<footer class="wp-block-template-part site-footer ground-purple">`,
 * matching Astro's `<footer class="site-footer ground-purple">` modulo the
 * harmless template-part class. Emitting the wrapping <footer> here would
 * nest two <footer>s and split the padding-block rule across two elements.
 *
 * Nav items come from the WP navigation menu post whose ID is on the
 * `navRef` attribute (default 4 — the "primary" menu, same as the header).
 * Astro's footer reuses the primary nav menu (Footer.astro L10-11).
 *
 * The cookie-settings button is theme plumbing that Astro doesn't have (the
 * Astro site has no cookie consent flow). It renders unconditionally so
 * keyboard and screen reader users always have a persistent way back to
 * the consent choice; `assets/js/consent.js` wires the click handler.
 * Kept when `showCookieButton` is true (default).
 *
 * @package bozzies
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$attrs = wp_parse_args(
	isset( $attributes ) && is_array( $attributes ) ? $attributes : array(),
	array(
		'siteName'         => 'The Boswell Sisters',
		'tagline'          => 'A tribute archive to Martha, Connee, and Vet Boswell, pioneers of American vocal harmony.',
		'footerCredits'    => 'Bozzies.com and Bozzies.org are non-profit organizations dedicated to keeping alive the memory of the Boswell Sisters and their wonderful contributions to the history of music and performance.',
		'showCookieButton' => true,
		'navRef'           => 4,
	)
);

/**
 * Load the primary nav items from the wp:navigation menu post. Each item is
 * a wp:navigation-link block with {label, url} in its attrs.
 *
 * @return array<int, array{label:string, href:string}>
 */
$items = array();
if ( ! empty( $attrs['navRef'] ) ) {
	$nav_post = get_post( (int) $attrs['navRef'] );
	if ( $nav_post && 'wp_navigation' === $nav_post->post_type ) {
		$parsed = parse_blocks( $nav_post->post_content );
		foreach ( $parsed as $block ) {
			if ( 'core/navigation-link' !== ( $block['blockName'] ?? '' ) ) {
				continue;
			}
			$label = isset( $block['attrs']['label'] ) ? (string) $block['attrs']['label'] : '';
			$url   = isset( $block['attrs']['url'] ) ? (string) $block['attrs']['url'] : '';
			if ( '' !== $label && '' !== $url ) {
				$items[] = array( 'label' => $label, 'href' => $url );
			}
		}
	}
}

$site_name      = html_entity_decode( (string) $attrs['siteName'],      ENT_QUOTES | ENT_HTML5, 'UTF-8' );
$tagline        = html_entity_decode( (string) $attrs['tagline'],       ENT_QUOTES | ENT_HTML5, 'UTF-8' );
$footer_credits = html_entity_decode( (string) $attrs['footerCredits'], ENT_QUOTES | ENT_HTML5, 'UTF-8' );
$year           = gmdate( 'Y' );
?>
<div class="container site-footer__inner">
	<div class="site-footer__mark">
		<p class="site-footer__wordmark"><?php echo esc_html( $site_name ); ?></p>
		<p class="site-footer__tagline"><?php echo esc_html( $tagline ); ?></p>
	</div>
	<nav aria-label="Footer" class="site-footer__nav">
		<ul role="list">
<?php foreach ( $items as $item ) :
	$label = html_entity_decode( $item['label'], ENT_QUOTES | ENT_HTML5, 'UTF-8' );
	$href  = $item['href'];
?>
			<li><a href="<?php echo esc_url( $href ); ?>"><?php echo esc_html( $label ); ?></a></li>
<?php endforeach; ?>
		</ul>
	</nav>
	<div class="site-footer__meta">
		<p><?php echo esc_html( $footer_credits ); ?></p>
		<p>&copy; <?php echo esc_html( $year ); ?></p>
<?php if ( ! empty( $attrs['showCookieButton'] ) ) : ?>
		<?php /* Always rendered + always focusable (no `hidden`, no
		    visually-hidden shim, no tabindex=-1) so keyboard and screen
		    reader users have a persistent way back to the consent choice.
		    assets/js/consent.js wires the click. WCAG 2.4.7 + 2.5.8. */ ?>
		<button type="button" class="bozzies-cookie-settings"><?php esc_html_e( 'Cookie settings', 'bozzies' ); ?></button>
<?php endif; ?>
	</div>
</div>
