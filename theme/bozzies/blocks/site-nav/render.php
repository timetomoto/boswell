<?php
/**
 * Server-side render for bozzies/site-nav.
 *
 * Emits Astro's exact inner DOM verbatim from
 * ~/boswell-poc/src/components/Nav.astro L14-34:
 *
 *   <div class="site-nav__inner container">
 *     <a class="site-nav__mark" href="/" aria-label="…">
 *       <span class="site-nav__mark-line-1">…</span>
 *       <span class="site-nav__mark-line-2">…</span>
 *     </a>
 *     <nav aria-label="Primary">
 *       <ul class="site-nav__list" role="list">
 *         <li><a class="site-nav__link [is-active]">…</a></li>
 *         …
 *         <li><a class="site-nav__donate" target="_blank" rel="noopener noreferrer">…</a></li>
 *       </ul>
 *     </nav>
 *   </div>
 *
 * The outer `<header class="site-nav">` is the template-part wrapper itself.
 * `bozzies_site_nav_add_class()` in `functions.php` injects the `site-nav`
 * className into the header template-part on render so it becomes exactly
 * `<header class="wp-block-template-part site-nav">` — matching Astro's
 * `<header class="site-nav">` (modulo the harmless template-part class).
 * Emitting the wrapping <header> here would nest two <header>s and split
 * the sticky positioning across the two elements.
 *
 * Primary items come from the WP navigation menu post whose ID is on the
 * `navRef` attribute (default 4 — the "primary" menu). Owner edits menu
 * items via the WordPress Navigation editor.
 *
 * @package bozzies
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$attrs = wp_parse_args(
	isset( $attributes ) && is_array( $attributes ) ? $attributes : array(),
	array(
		'markLine1'     => 'The Boswell Sisters',
		'markLine2'     => '1925 to 1936',
		'markHref'      => '/',
		'markAriaLabel' => 'The Boswell Sisters, home',
		'donateLabel'   => 'Donate',
		'donateHref'    => '',
		'navRef'        => 4,
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

// Current path — used to compute `is-active` on links, matching Astro's
// `path.startsWith(item.href) && item.href !== '/'` at Nav.astro L25.
$request_uri  = isset( $_SERVER['REQUEST_URI'] ) ? (string) $_SERVER['REQUEST_URI'] : '/';
$current_path = (string) wp_parse_url( $request_uri, PHP_URL_PATH );
if ( '' === $current_path ) {
	$current_path = '/';
}

$mark_href    = '' !== $attrs['markHref'] ? (string) $attrs['markHref'] : '/';
$mark_aria    = html_entity_decode( (string) $attrs['markAriaLabel'], ENT_QUOTES | ENT_HTML5, 'UTF-8' );
$mark_line_1  = html_entity_decode( (string) $attrs['markLine1'],     ENT_QUOTES | ENT_HTML5, 'UTF-8' );
$mark_line_2  = html_entity_decode( (string) $attrs['markLine2'],     ENT_QUOTES | ENT_HTML5, 'UTF-8' );
// Site-wide donate URL comes from Settings → Bozzies (editable by the Editor
// role that doesn't have manage_options). The block still stores a donateHref
// attribute for backward compatibility with previously-authored template parts,
// but the setting always wins.
$donate_href  = bozzies_get_donate_url();
if ( '' === $donate_href ) {
	$donate_href = (string) $attrs['donateHref'];
}
$donate_label = html_entity_decode( (string) $attrs['donateLabel'],   ENT_QUOTES | ENT_HTML5, 'UTF-8' );
?>
<div class="site-nav__inner container">
	<a class="site-nav__mark" href="<?php echo esc_url( $mark_href ); ?>" aria-label="<?php echo esc_attr( $mark_aria ); ?>">
		<span class="site-nav__mark-line-1"><?php echo esc_html( $mark_line_1 ); ?></span>
		<span class="site-nav__mark-line-2"><?php echo esc_html( $mark_line_2 ); ?></span>
	</a>
	<nav aria-label="Primary">
		<ul class="site-nav__list" role="list">
<?php foreach ( $items as $item ) :
	$label     = html_entity_decode( $item['label'], ENT_QUOTES | ENT_HTML5, 'UTF-8' );
	$href      = $item['href'];
	$is_active = ( '/' !== $href ) && ( 0 === strpos( $current_path, $href ) );
	$cls       = 'site-nav__link' . ( $is_active ? ' is-active' : '' );
?>
			<li>
				<a href="<?php echo esc_url( $href ); ?>" class="<?php echo esc_attr( $cls ); ?>"><?php echo esc_html( $label ); ?></a>
			</li>
<?php endforeach; ?>
			<li>
				<a href="<?php echo esc_url( $donate_href ); ?>" class="site-nav__donate" target="_blank" rel="noopener noreferrer"><?php echo esc_html( $donate_label ); ?></a>
			</li>
		</ul>
	</nav>
</div>
