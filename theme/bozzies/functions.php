<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

require_once __DIR__ . '/inc/analytics.php';
require_once __DIR__ . '/inc/bindings.php';
require_once __DIR__ . '/inc/music-backdrop.php';

add_action( 'init', 'bozzies_register_editor_style_variations' );
function bozzies_register_editor_style_variations() {
	register_block_style( 'core/paragraph', array( 'name' => 'eyebrow',       'label' => __( 'Eyebrow', 'bozzies' ) ) );
	register_block_style( 'core/paragraph', array( 'name' => 'lede',          'label' => __( 'Lede', 'bozzies' ) ) );
	register_block_style( 'core/separator', array( 'name' => 'hairline',      'label' => __( 'Hairline', 'bozzies' ) ) );
	register_block_style( 'core/separator', array( 'name' => 'hairline-thin', 'label' => __( 'Hairline thin', 'bozzies' ) ) );
	/* "Large" button style adds extra padding — used on /sisters/bio-resources/. */
	register_block_style( 'core/button', array( 'name' => 'large', 'label' => __( 'Large', 'bozzies' ) ) );
}

add_action( 'init', 'bozzies_register_pattern_categories', 9 );
function bozzies_register_pattern_categories() {
	register_block_pattern_category( 'boswell', array(
		'label'       => __( 'Boswell', 'bozzies' ),
		'description' => __( 'Patterns tuned to the Boswell Sisters editorial design.', 'bozzies' ),
	) );
	// Owner-facing section patterns are grouped here so the block inserter
	// shows one obvious "Bozzies sections" heading instead of the generic
	// "Boswell" label.
	register_block_pattern_category( 'bozzies-sections', array(
		'label'       => __( 'Bozzies sections', 'bozzies' ),
		'description' => __( 'Full-bleed section layouts built for this site — heroes, card grids, quote blocks.', 'bozzies' ),
	) );
}

add_action( 'init', 'bozzies_register_theme_blocks' );
function bozzies_register_theme_blocks() {
	foreach ( glob( __DIR__ . '/blocks/*/block.json' ) as $block_json ) {
		register_block_type( dirname( $block_json ) );
	}
}

add_action( 'wp_enqueue_scripts', 'bozzies_enqueue_chrome' );
function bozzies_enqueue_chrome() {
	$ver     = wp_get_theme()->get( 'Version' );
	$dir_uri = get_stylesheet_directory_uri();
	// Astro's global styles — the sitewide reset + typography + grounds
	// + layout helpers + eyebrow + hairline + skip-link + visually-hidden.
	// Verbatim port of ~/boswell-poc/src/styles/global.css.
	wp_enqueue_style(
		'bozzies-astro-global',
		$dir_uri . '/assets/css/astro/global.css',
		array(),
		$ver
	);
	// Astro hero CSS — verbatim port of Hero.astro's <style>. Owned by
	// the section block's is-hero-photo variant.
	wp_enqueue_style(
		'bozzies-astro-hero',
		$dir_uri . '/assets/css/astro/hero.css',
		array( 'bozzies-astro-global' ),
		$ver
	);
	// Astro article CSS — verbatim port of the article-list, article-row,
	// article-hero, page-hero, article-nav, prose and video-embed rules
	// from Astro's press/**/*.astro pages.
	wp_enqueue_style(
		'bozzies-astro-article',
		$dir_uri . '/assets/css/astro/article.css',
		array( 'bozzies-astro-global' ),
		$ver
	);
	// Astro cards CSS — sister-card, subpage-card, bio-body, bio-portrait,
	// facts, bio-timeline, bio-nav (from sisters/**), release-card (from
	// press/index.astro), music-teaser + lessons-grid + lesson-card (from
	// media/index.astro). Future card families (see-also) get appended.
	wp_enqueue_style(
		'bozzies-astro-cards',
		$dir_uri . '/assets/css/astro/cards.css',
		array( 'bozzies-astro-global' ),
		$ver
	);
	// Astro music-backdrop CSS — verbatim port of MusicBackdrop.astro's
	// <style>. Currently used by the bozzies/bio-hero block (staves variant);
	// step 12 extends the section block's backdrop enum to share it.
	wp_enqueue_style(
		'bozzies-astro-music-backdrop',
		$dir_uri . '/assets/css/astro/music-backdrop.css',
		array( 'bozzies-astro-global' ),
		$ver
	);
	// Astro bio-hero CSS — verbatim port of sisters/[slug].astro's .bio-hero*
	// rules. Owned by the bozzies/bio-hero block.
	wp_enqueue_style(
		'bozzies-astro-bio-hero',
		$dir_uri . '/assets/css/astro/bio-hero.css',
		array( 'bozzies-astro-global', 'bozzies-astro-music-backdrop' ),
		$ver
	);
	// Astro lesson-hero CSS — verbatim port of media/lessons/[order].astro's
	// .lesson-hero* rules. Owned by the bozzies/lesson-hero block.
	wp_enqueue_style(
		'bozzies-astro-lesson-hero',
		$dir_uri . '/assets/css/astro/lesson-hero.css',
		array( 'bozzies-astro-global', 'bozzies-astro-music-backdrop' ),
		$ver
	);
	// Astro lesson-player CSS — verbatim port of media/lessons/[order].astro's
	// .lesson-player* + .lesson-notes rules. Owned by the bozzies/lesson-player
	// block; `.prose` rules the same Astro file also declares are already in
	// article.css.
	wp_enqueue_style(
		'bozzies-astro-lesson-player',
		$dir_uri . '/assets/css/astro/lesson-player.css',
		array( 'bozzies-astro-global', 'bozzies-astro-article' ),
		$ver
	);
	// Astro lesson-nav CSS — verbatim port of media/lessons/[order].astro's
	// .lesson-nav* rules. Owned by the bozzies/lesson-nav block.
	wp_enqueue_style(
		'bozzies-astro-lesson-nav',
		$dir_uri . '/assets/css/astro/lesson-nav.css',
		array( 'bozzies-astro-global' ),
		$ver
	);
	// Astro pages CSS — per-page scoped rules from Astro pages that live
	// outside a component. Holds the home intro (index.astro L117-135),
	// donate teaser (index.astro L169-200) and eyebrow color modifiers
	// (L137-140), plus the about CTA (about.astro L74-97); later commits
	// (home hub playlist/voices/sample, about hub intro) will append.
	wp_enqueue_style(
		'bozzies-astro-pages',
		$dir_uri . '/assets/css/astro/pages.css',
		array( 'bozzies-astro-global', 'bozzies-astro-music-backdrop' ),
		$ver
	);
	// Astro pull-quote CSS — verbatim port of PullQuote.astro's <style>.
	// Owned by the bozzies/pull-quote block.
	wp_enqueue_style(
		'bozzies-astro-pull-quote',
		$dir_uri . '/assets/css/astro/pull-quote.css',
		array( 'bozzies-astro-global' ),
		$ver
	);
	// Astro section-divider CSS — verbatim port of SectionDivider.astro's
	// <style>. Owned by the bozzies/divider block.
	wp_enqueue_style(
		'bozzies-astro-section-divider',
		$dir_uri . '/assets/css/astro/section-divider.css',
		array( 'bozzies-astro-global' ),
		$ver
	);
	// Astro nav CSS — verbatim port of Nav.astro's <style>. Owned by the
	// bozzies/site-nav block; used by parts/header.html.
	wp_enqueue_style(
		'bozzies-astro-nav',
		$dir_uri . '/assets/css/astro/nav.css',
		array( 'bozzies-astro-global' ),
		$ver
	);
	// Astro footer CSS — verbatim port of Footer.astro's <style>. Owned by
	// the bozzies/site-footer block; used by parts/footer.html.
	wp_enqueue_style(
		'bozzies-astro-footer',
		$dir_uri . '/assets/css/astro/footer.css',
		array( 'bozzies-astro-global' ),
		$ver
	);
	// Astro prose-body CSS — verbatim port of the .charts-body and
	// .reviews-body page-scoped prose rules from charts.astro and
	// reviews.astro. Owned by the bozzies/prose-body block. Base .prose
	// rules already live in article.css.
	wp_enqueue_style(
		'bozzies-astro-prose-body',
		$dir_uri . '/assets/css/astro/prose-body.css',
		array( 'bozzies-astro-global', 'bozzies-astro-article' ),
		$ver
	);
	// Astro playlist-player CSS — verbatim port of PlaylistPlayer.astro's
	// <style>. Owned by the bozzies/playlist-player block.
	wp_enqueue_style(
		'bozzies-astro-playlist-player',
		$dir_uri . '/assets/css/astro/playlist-player.css',
		array( 'bozzies-astro-global' ),
		$ver
	);
	// Astro quotes-carousel CSS — verbatim port of QuotesCarousel.astro's
	// <style>. Owned by the bozzies/quotes-carousel block.
	wp_enqueue_style(
		'bozzies-astro-quotes-carousel',
		$dir_uri . '/assets/css/astro/quotes-carousel.css',
		array( 'bozzies-astro-global' ),
		$ver
	);
	// Astro timeline CSS — verbatim port of Timeline.astro's <style>
	// plus career-timeline.astro's `.timeline-section` wrapper rules.
	// Owned by the bozzies/timeline block.
	wp_enqueue_style(
		'bozzies-astro-timeline',
		$dir_uri . '/assets/css/astro/timeline.css',
		array( 'bozzies-astro-global' ),
		$ver
	);
	// Astro discography CSS — verbatim port of the .disc-search / .disc-scope
	// / .disc-session / .disc-track rules from media/discography.astro L175-265.
	// Owned by the bozzies/discography block.
	wp_enqueue_style(
		'bozzies-astro-discography',
		$dir_uri . '/assets/css/astro/discography.css',
		array( 'bozzies-astro-global' ),
		$ver
	);
	// chrome.css is what remains of the pre-rebuild theme CSS. During the
	// rebuild it is being pared down commit-by-commit as ports land; it
	// will end up holding only WordPress-specific plumbing (or be deleted
	// entirely). Kept last so ported Astro CSS wins any tie.
	wp_enqueue_style(
		'bozzies-chrome',
		$dir_uri . '/assets/css/chrome.css',
		array( 'bozzies-astro-global', 'bozzies-astro-hero', 'bozzies-astro-article', 'bozzies-astro-cards', 'bozzies-astro-music-backdrop', 'bozzies-astro-bio-hero', 'bozzies-astro-lesson-hero', 'bozzies-astro-lesson-player', 'bozzies-astro-lesson-nav', 'bozzies-astro-pages', 'bozzies-astro-pull-quote', 'bozzies-astro-section-divider', 'bozzies-astro-nav', 'bozzies-astro-footer', 'bozzies-astro-prose-body', 'bozzies-astro-playlist-player', 'bozzies-astro-quotes-carousel', 'bozzies-astro-timeline', 'bozzies-astro-discography' ),
		$ver
	);

	// Playlist player front-end JS — verbatim port of PlaylistPlayer.astro's
	// <script>. Enqueued only when the current page contains the
	// bozzies/playlist-player block, so pages without a player pay nothing.
	if ( is_singular() && has_block( 'bozzies/playlist-player' ) ) {
		wp_enqueue_script(
			'bozzies-playlist-player',
			$dir_uri . '/assets/js/playlist-player.js',
			array(),
			$ver,
			true
		);
	}

	// Quotes carousel front-end JS — verbatim port of QuotesCarousel.astro's
	// <script>. Enqueued only when the current page contains the
	// bozzies/quotes-carousel block.
	if ( is_singular() && has_block( 'bozzies/quotes-carousel' ) ) {
		wp_enqueue_script(
			'bozzies-quotes-carousel',
			$dir_uri . '/assets/js/quotes-carousel.js',
			array(),
			$ver,
			true
		);
	}

	// Discography search front-end JS — verbatim port of the client-side
	// <script> at media/discography.astro L101-147. Enqueued only when the
	// current page contains the bozzies/discography block.
	if ( is_singular() && has_block( 'bozzies/discography' ) ) {
		wp_enqueue_script(
			'bozzies-discography-search',
			$dir_uri . '/assets/js/discography-search.js',
			array(),
			$ver,
			true
		);
	}
}

add_action( 'after_setup_theme', 'bozzies_add_editor_styles' );
function bozzies_add_editor_styles() {
	// Same Astro CSS the front uses, so the owner sees the real look
	// while editing.
	add_editor_style( 'assets/css/astro/global.css' );
	add_editor_style( 'assets/css/astro/hero.css' );
	add_editor_style( 'assets/css/astro/article.css' );
	add_editor_style( 'assets/css/astro/cards.css' );
	add_editor_style( 'assets/css/astro/music-backdrop.css' );
	add_editor_style( 'assets/css/astro/bio-hero.css' );
	add_editor_style( 'assets/css/astro/lesson-hero.css' );
	add_editor_style( 'assets/css/astro/lesson-player.css' );
	add_editor_style( 'assets/css/astro/lesson-nav.css' );
	add_editor_style( 'assets/css/astro/pages.css' );
	add_editor_style( 'assets/css/astro/pull-quote.css' );
	add_editor_style( 'assets/css/astro/section-divider.css' );
	add_editor_style( 'assets/css/astro/nav.css' );
	add_editor_style( 'assets/css/astro/footer.css' );
	add_editor_style( 'assets/css/astro/prose-body.css' );
	add_editor_style( 'assets/css/astro/playlist-player.css' );
	add_editor_style( 'assets/css/astro/quotes-carousel.css' );
	add_editor_style( 'assets/css/astro/timeline.css' );
	add_editor_style( 'assets/css/astro/discography.css' );
	add_editor_style( 'assets/css/chrome.css' );
}

/**
 * Enqueue the "Article details" sidebar plugin on post-editor screens only.
 * The meta keys are underscore-prefixed so Custom Fields hides them; this
 * panel gives the owner a normal Gutenberg control that writes through REST.
 */
add_action( 'enqueue_block_editor_assets', 'bozzies_enqueue_article_meta_panel' );
function bozzies_enqueue_article_meta_panel() {
	$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
	if ( $screen && isset( $screen->post_type ) && 'post' !== $screen->post_type ) {
		return;
	}
	$ver = wp_get_theme()->get( 'Version' );
	wp_enqueue_script(
		'bozzies-article-meta-panel',
		get_stylesheet_directory_uri() . '/assets/js/article-meta-panel.js',
		array( 'wp-plugins', 'wp-edit-post', 'wp-element', 'wp-components', 'wp-data', 'wp-core-data', 'wp-i18n' ),
		$ver,
		true
	);
}

// Authors on this site write copy that must land on the front verbatim (it
// often mirrors the Astro reference character-for-character). WordPress
// auto-textures apostrophes and quotes into curly typographers' variants;
// switch that off so straight quotes stay straight and match the source.
add_filter( 'run_wptexturize', '__return_false' );

/**
 * Inject template-part className into the header/footer template-parts so
 * Astro's per-element rules apply to the outermost wrapper element:
 *
 *   header slug → adds `site-nav` (sticky + backdrop-filter live on <header>)
 *   footer slug → adds `site-footer ground-purple` (padding-block + purple
 *                 ground live on <footer>, matching Astro's exact class list)
 *
 * The bozzies/site-nav and bozzies/site-footer blocks' render.php emit only
 * inner DOM; this filter turns the surrounding template-part wrapper
 * `<header class="wp-block-template-part">` /
 * `<footer class="wp-block-template-part">` into
 * `<header class="wp-block-template-part site-nav">` /
 * `<footer class="wp-block-template-part site-footer ground-purple">`.
 */
add_filter( 'render_block_data', function ( $block ) {
	if ( 'core/template-part' !== ( $block['blockName'] ?? '' ) ) {
		return $block;
	}
	$slug = $block['attrs']['slug'] ?? '';
	$add  = '';
	if ( 'header' === $slug ) {
		$add = 'site-nav';
	} elseif ( 'footer' === $slug ) {
		$add = 'site-footer ground-purple';
	}
	if ( '' === $add ) {
		return $block;
	}
	$existing = isset( $block['attrs']['className'] ) ? trim( (string) $block['attrs']['className'] ) : '';
	// Add each token only if not already present (idempotent).
	foreach ( preg_split( '/\s+/', $add ) as $token ) {
		if ( '' === $token ) {
			continue;
		}
		if ( false === strpos( ' ' . $existing . ' ', ' ' . $token . ' ' ) ) {
			$existing = trim( $existing . ' ' . $token );
		}
	}
	$block['attrs']['className'] = $existing;
	return $block;
} );

// Add a `page-slug-<slug>` class to <body> on singular pages/posts so per-page
// CSS can hook off the slug (Astro's scoped <style> blocks are equivalent to
// per-page selectors). Astro's `.page-hero__title` and `.page-hero__subtitle`
// max-widths differ across career-timeline (34ch/58ch), discography
// (34ch/58ch), reviews (none/52ch), charts (none/52ch), and bio-resources
// (none/46ch). Slug scoping lets the shared bozzies/page-hero block match each.
add_filter( 'body_class', function ( $classes ) {
	if ( is_singular() ) {
		$post = get_queried_object();
		if ( $post && ! empty( $post->post_name ) ) {
			$classes[] = 'page-slug-' . sanitize_html_class( $post->post_name );
		}
	}
	return $classes;
} );

/**
 * Rewrite YouTube embed URLs to the privacy-enhanced youtube-nocookie.com
 * domain everywhere: core Embed blocks, oEmbed HTML cached in the DB,
 * bare iframe HTML in Custom HTML blocks, and post content. Applies to both
 * watch URLs (converted to /embed/ form by WP's YouTube handler) and any
 * direct youtube.com/embed/ iframe src.
 */
function bozzies_youtube_nocookie( $html ) {
	if ( is_string( $html ) && strpos( $html, 'youtube.com' ) !== false ) {
		$html = preg_replace( '#(https?:)?//(?:www\.)?youtube\.com/embed/#i', '$1//www.youtube-nocookie.com/embed/', $html );
	}
	return $html;
}
add_filter( 'embed_oembed_html', 'bozzies_youtube_nocookie', 20 );
add_filter( 'oembed_result', 'bozzies_youtube_nocookie', 20 );
add_filter( 'the_content', 'bozzies_youtube_nocookie', 20 );
add_filter( 'render_block', function ( $block_content, $block ) {
	if ( in_array( $block['blockName'], array( 'core/embed', 'core/html' ), true ) ) {
		return bozzies_youtube_nocookie( $block_content );
	}
	return $block_content;
}, 20, 2 );

/**
 * Give /press/{category}/{postname}/ post URLs priority over WP's verbose
 * page-hierarchy resolution. Without this, WP treats /press/ as a page and
 * refuses to dispatch descendant URLs to posts (the "press" page hub blocks
 * all article URLs). See settled decisions: articles are posts, sub-hubs are
 * categories, article URLs are /press/{category}/{slug}/.
 */
add_action( 'init', 'bozzies_press_rewrite_rule', 11 );
function bozzies_press_rewrite_rule() {
	add_rewrite_rule(
		'^press/([^/]+)/([^/]+)/?$',
		'index.php?category_name=$matches[1]&name=$matches[2]',
		'top'
	);
}

/**
 * Astro's article rows show a zero-padded row number as visible text
 * (`<span class="article-row__num">01</span>`). CSS counters via `::before`
 * would be visually correct but wouldn't land in the DOM, so screen readers
 * and text-diff tooling wouldn't see them. Inject a real <span> at render
 * time on any post-template with the `bozzies-article-list` class.
 */
/**
 * Rebuild each row of an article list (`core/post-template` with the
 * `article-list` className) to Astro's exact DOM:
 *
 *   <li class="article-row">
 *     <a class="article-row__link" href="POST_URL">
 *       <span class="article-row__num">01</span>
 *       <div class="article-row__body">
 *         <h3 class="article-row__title">Title</h3>
 *         <p class="article-row__meta">Meta</p>
 *       </div>
 *       <svg class="article-row__arrow" …>…</svg>
 *     </a>
 *   </li>
 *
 * We parse the URL out of the title link WordPress already emitted, then
 * discard the default row markup and rebuild it into Astro's shape. This
 * fires on the press hub, all 5 category archives, and anywhere else a
 * Query Loop is authored with the `article-list` className.
 */
add_filter( 'render_block_core/post-template', 'bozzies_astro_article_rows', 10, 2 );
function bozzies_astro_article_rows( $block_content, $block ) {
	$cls = isset( $block['attrs']['className'] ) ? (string) $block['attrs']['className'] : '';
	if ( strpos( $cls, 'article-list' ) === false ) {
		return $block_content;
	}

	// Astro's arrow is a <span class="article-row__arrow"> wrapping a
	// 24×10 SVG with a horizontal path + arrowhead. Match verbatim from
	// ~/boswell-poc/src/pages/press/index.astro lines 81-85.
	$arrow_svg = '<span class="article-row__arrow" aria-hidden="true"><svg width="24" height="10" viewBox="0 0 24 10" fill="none"><path d="M0 5 H21 M17 1 L21 5 L17 9" stroke="currentColor" stroke-width="1" fill="none"/></svg></span>';

	$i = 0;
	return preg_replace_callback(
		'#<li([^>]*)>(.*?)</li>#s',
		function ( $m ) use ( &$i, $arrow_svg ) {
			$i++;
			$num  = str_pad( (string) $i, 2, '0', STR_PAD_LEFT );
			$row  = $m[2];

			// Extract the title link (WP renders it as <h3 class="article-row__title"><a>Title</a></h3>).
			$url   = '';
			$title = '';
			if ( preg_match( '#<h[1-6][^>]*article-row__title[^>]*>(.*?)</h[1-6]>#is', $row, $h ) ) {
				$inner = $h[1];
				if ( preg_match( '#<a[^>]*href=(?:"([^"]+)"|\'([^\']+)\')[^>]*>(.*?)</a>#is', $inner, $a ) ) {
					$url   = html_entity_decode( $a[1] ?: $a[2], ENT_QUOTES );
					$title = trim( strip_tags( $a[3] ) );
				} else {
					$title = trim( strip_tags( $inner ) );
				}
			}

			// Extract the meta paragraph (bozzies/article-meta binding).
			$meta = '';
			if ( preg_match( '#<p[^>]*article-row__meta[^>]*>(.*?)</p>#is', $row, $p ) ) {
				$meta = trim( strip_tags( $p[1] ) );
			}

			// Preserve any `class` on the <li> WP already emitted but ensure
			// `article-row` is present exactly once.
			$li_attrs = $m[1];
			if ( preg_match( '#class="([^"]*)"#', $li_attrs, $c ) ) {
				$existing = trim( $c[1] );
				if ( strpos( $existing, 'article-row' ) === false ) {
					$existing = trim( $existing . ' article-row' );
				}
				$li_attrs = preg_replace( '#class="[^"]*"#', 'class="' . esc_attr( $existing ) . '"', $li_attrs, 1 );
			} else {
				$li_attrs .= ' class="article-row"';
			}

			$html  = '<li' . $li_attrs . '>';
			$html .= '<a class="article-row__link" href="' . esc_url( $url ) . '">';
			$html .= '<span class="article-row__num">' . esc_html( $num ) . '</span>';
			$html .= '<div class="article-row__body">';
			$html .= '<h3 class="article-row__title">' . esc_html( $title ) . '</h3>';
			if ( '' !== $meta ) {
				$html .= '<p class="article-row__meta">' . esc_html( $meta ) . '</p>';
			}
			$html .= '</div>';
			$html .= $arrow_svg;
			$html .= '</a>';
			$html .= '</li>';
			return $html;
		},
		$block_content,
		-1
	);
}

/**
 * Category archives (press sub-hubs) sort articles by menu_order asc so the
 * on-page order matches Astro's frontmatter `order` field (vintage 2..12
 * first, then the fill-in indices for the other sub-hubs). Without this the
 * default query is date-desc, which reverses the Astro order.
 */
/**
 * Adjacent-post navigation (prev/next on single articles) sorts by
 * menu_order — mirroring Astro's `order` frontmatter — instead of the WP
 * default post_date. Otherwise articles that carry a publicationDate
 * (year → 1937-01-01) fall out of order compared to Astro.
 */
add_filter( 'get_previous_post_sort', 'bozzies_adjacent_post_sort' );
add_filter( 'get_next_post_sort',     'bozzies_adjacent_post_sort' );
add_filter( 'get_previous_post_where','bozzies_previous_post_where', 10, 5 );
add_filter( 'get_next_post_where',    'bozzies_next_post_where',     10, 5 );
function bozzies_adjacent_post_sort( $sort ) {
	// Preserve caller's ORDER BY direction — get_previous_post uses DESC,
	// get_next_post uses ASC. Replace the date column with menu_order.
	$dir = false !== strpos( $sort, 'DESC' ) ? 'DESC' : 'ASC';
	return "ORDER BY p.menu_order $dir LIMIT 1";
}
function bozzies_previous_post_where( $where, $in_same_term, $excluded_terms, $taxonomy, $post ) {
	global $wpdb;
	// WP's default WHERE is: `WHERE p.post_date < '...' AND p.post_type = 'post' ...`
	// (older WP) or the parens form `WHERE (p.post_date < '...' OR (p.post_date = ... AND p.ID < ...))`.
	// Replace either shape with a single menu_order comparison.
	$where = preg_replace(
		'/WHERE\s+\(?\s*p\.post_date\s*<\s*\'[^\']+\'(?:\s+OR\s+\(p\.post_date\s*=\s*\'[^\']+\'\s+AND\s+p\.ID\s*<\s*\d+\)\s*)?\)?/',
		$wpdb->prepare( 'WHERE p.menu_order < %d', (int) $post->menu_order ),
		$where
	);
	return $where;
}
function bozzies_next_post_where( $where, $in_same_term, $excluded_terms, $taxonomy, $post ) {
	global $wpdb;
	$where = preg_replace(
		'/WHERE\s+\(?\s*p\.post_date\s*>\s*\'[^\']+\'(?:\s+OR\s+\(p\.post_date\s*=\s*\'[^\']+\'\s+AND\s+p\.ID\s*>\s*\d+\)\s*)?\)?/',
		$wpdb->prepare( 'WHERE p.menu_order > %d', (int) $post->menu_order ),
		$where
	);
	return $where;
}

/**
 * Astro's article-nav (~/boswell-poc/src/pages/press/[subhub]/[slug].astro)
 * emits a prev/all/next row where each side is:
 *   <a class="article-nav__link article-nav__link--prev">
 *     <span class="article-nav__label">Previous</span>
 *     <span class="article-nav__title">Article title</span>
 *   </a>
 * WP's core/post-navigation-link block emits its own class and shape. This
 * filter rewrites every post-navigation-link render inside a single post
 * (adjacent found OR wraparound needed) into Astro's exact DOM so the ported
 * article.css applies without a mapping layer.
 */
add_filter( 'render_block_core/post-navigation-link', 'bozzies_wrap_post_navigation', 10, 2 );
function bozzies_wrap_post_navigation( $block_content, $block ) {
	$type = ( isset( $block['attrs']['type'] ) && 'next' === $block['attrs']['type'] ) ? 'next' : 'previous';
	$label_text = 'next' === $type ? 'Next' : 'Previous';
	$class_side = 'next' === $type ? 'article-nav__link--next' : 'article-nav__link--prev';
	$rel        = 'next' === $type ? 'next' : 'prev';

	// If WP found an adjacent post, its output already includes an <a>. Rewrite
	// the shape to Astro's without hitting the DB again — extract href + title.
	if ( strpos( $block_content, '<a ' ) !== false && preg_match( '#<a[^>]*href="([^"]+)"[^>]*>([^<]+)</a>#', $block_content, $m ) ) {
		return sprintf(
			'<a class="article-nav__link %s" href="%s" rel="%s"><span class="article-nav__label">%s</span><span class="article-nav__title">%s</span></a>',
			esc_attr( $class_side ),
			esc_url( html_entity_decode( $m[1], ENT_QUOTES ) ),
			esc_attr( $rel ),
			esc_html( $label_text ),
			esc_html( html_entity_decode( $m[2], ENT_QUOTES ) )
		);
	}

	// Otherwise Astro wraps around: at the last article, "Next" links to the
	// first; at the first, "Previous" links to the last.
	$post = get_post();
	if ( ! $post ) {
		return $block_content;
	}
	$terms = get_the_terms( $post, 'category' );
	if ( empty( $terms ) || is_wp_error( $terms ) ) {
		return $block_content;
	}
	$term_ids = wp_list_pluck( $terms, 'term_id' );
	$args = array(
		'post_type'      => 'post',
		'posts_per_page' => 1,
		'category__in'   => $term_ids,
		'post__not_in'   => array( $post->ID ),
		'orderby'        => 'menu_order',
		'order'          => 'next' === $type ? 'ASC' : 'DESC',
		'no_found_rows'  => true,
	);
	$wrap = get_posts( $args );
	if ( empty( $wrap ) ) {
		return $block_content;
	}
	$target = $wrap[0];
	return sprintf(
		'<a class="article-nav__link %s" href="%s" rel="%s"><span class="article-nav__label">%s</span><span class="article-nav__title">%s</span></a>',
		esc_attr( $class_side ),
		esc_url( get_permalink( $target ) ),
		esc_attr( $rel ),
		esc_html( $label_text ),
		esc_html( get_the_title( $target ) )
	);
}

add_action( 'pre_get_posts', 'bozzies_press_category_order' );
function bozzies_press_category_order( $query ) {
	if ( is_admin() || ! $query->is_main_query() ) {
		return;
	}
	if ( ! $query->is_category() ) {
		return;
	}
	$query->set( 'orderby',         'menu_order' );
	$query->set( 'order',           'ASC' );
	$query->set( 'posts_per_page',  -1 ); // Show every article — no pagination.
}

/**
 * Register the article-meta post meta fields — author, publication, and the
 * raw publication-date string. The date string is stored verbatim so the
 * front matches the Astro source ("1932" stays "1932" instead of becoming
 * "January 1, 1932"); post_date is set separately for sortability.
 *
 * `show_in_rest` is on so the fields appear in the block editor sidebar
 * (Custom Fields panel + REST API), which lets the owner edit them without
 * leaving Gutenberg. Sanitized as plain text — no HTML.
 */
add_action( 'init', 'bozzies_register_article_meta' );
function bozzies_register_article_meta() {
	$args = array(
		'type'              => 'string',
		'single'            => true,
		'show_in_rest'      => true,
		'default'           => '',
		'sanitize_callback' => 'sanitize_text_field',
		'auth_callback'     => function () { return current_user_can( 'edit_posts' ); },
	);
	register_post_meta( 'post', '_bozzies_author',           $args );
	register_post_meta( 'post', '_bozzies_publication',      $args );
	register_post_meta( 'post', '_bozzies_publication_date', $args );
	register_term_meta( 'category', '_bozzies_kicker', array(
		'type'              => 'string',
		'single'            => true,
		'show_in_rest'      => true,
		'default'           => '',
		'sanitize_callback' => 'sanitize_text_field',
		'auth_callback'     => function () { return current_user_can( 'manage_categories' ); },
	) );
}
