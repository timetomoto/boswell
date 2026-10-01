<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

require_once __DIR__ . '/inc/analytics.php';
require_once __DIR__ . '/inc/bindings.php';
require_once __DIR__ . '/inc/music-backdrop.php';
require_once __DIR__ . '/inc/owner-caps.php';
require_once __DIR__ . '/inc/settings.php';

/**
 * Theme asset version — returns `filemtime()` of a theme-relative path as a
 * string, falling back to the theme's declared version if the file is missing.
 * Used in place of a fixed theme version on wp_enqueue_style/script so each
 * edit to a CSS or JS file cache-busts without a theme-wide bump.
 *
 * Front-end asset URLs come out like `/wp-content/themes/bozzies/assets/css/
 * astro/global.css?ver=1727733123`. Browsers see a new version each time the
 * file changes, so stale cached CSS can't survive a rebuild.
 *
 * Editor styles added via add_editor_style() are inlined into the editor's
 * initial payload by get_block_editor_theme_styles() (file_get_contents at
 * page-load time), so they're always fresh without a version arg.
 */
function bozzies_asset_ver( $rel_path ) {
	$abs = get_stylesheet_directory() . '/' . ltrim( $rel_path, '/' );
	if ( file_exists( $abs ) ) {
		$mtime = @filemtime( $abs );
		if ( $mtime ) {
			return (string) $mtime;
		}
	}
	return (string) wp_get_theme()->get( 'Version' );
}

/**
 * Head parity with Astro's Base.astro (~/boswell-poc/src/layouts/Base.astro
 * L14-23). Astro emits, in order:
 *   <meta charset="utf-8" />
 *   <meta name="viewport" content="width=device-width, initial-scale=1" />
 *   <title>{title} — The Boswell Sisters</title>
 *   {description && <meta name="description" content="…" />}
 *   <meta name="theme-color" content="#181615" />
 *   <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
 * — nothing else. No OG, no Twitter cards, no favicon, no RSS, no oEmbed,
 * no generator, no shortlink, no canonical, no robots, no emoji.
 */
add_action( 'after_setup_theme', 'bozzies_astro_head_supports' );
function bozzies_astro_head_supports() {
	add_theme_support( 'title-tag' );
	// Owner-editable page description — surfaces the "Excerpt" panel in the
	// editor. post_excerpt drives <meta name="description">. Populated from
	// Astro frontmatter by scripts/import/head-descriptions.mjs.
	add_post_type_support( 'page', 'excerpt' );
}

// Astro renders `${title} — The Boswell Sisters`, always. No tagline
// concatenation, no other title parts.
add_filter( 'document_title_separator', function () { return '—'; } );
add_filter( 'document_title_parts', 'bozzies_astro_title_parts' );
function bozzies_astro_title_parts( $parts ) {
	$parts['site'] = 'The Boswell Sisters';
	unset( $parts['tagline'] );
	// Home: Astro passes `data.title` from ~/boswell-poc/src/content/pages/home.md
	// L2 which is "Meet the Boswells". WP's post_title on the front page is
	// "Home".
	if ( is_front_page() ) {
		$parts['title'] = 'Meet the Boswells';
	}
	// Press subhubs: Astro's press/[subhub]/index.astro L16 renders
	// `${hub.data.label} — Press`.
	if ( is_category() ) {
		$parts['title'] = single_cat_title( '', false ) . ' — Press';
	}
	return $parts;
}

// Fixed head meta emitted early so it lands near <title>. Description reads
// post_excerpt on singulars and the term description on categories; empty
// values suppress the tag (matches Astro's `{description && <meta …/>}`).
add_action( 'wp_head', 'bozzies_astro_head_meta', 1 );
function bozzies_astro_head_meta() {
	$desc = '';
	if ( is_singular() ) {
		$obj = get_queried_object();
		if ( $obj && ! empty( $obj->post_excerpt ) ) {
			$desc = trim( wp_strip_all_tags( $obj->post_excerpt ) );
		}
	} elseif ( is_category() ) {
		$desc = trim( wp_strip_all_tags( term_description() ) );
	}
	if ( '' !== $desc ) {
		echo '<meta name="description" content="' . esc_attr( $desc ) . '" />' . "\n";
	}
	echo '<meta name="theme-color" content="#181615" />' . "\n";
	echo '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />' . "\n";
}

// Strip everything Astro doesn't emit.
add_action( 'init', 'bozzies_astro_head_strip' );
function bozzies_astro_head_strip() {
	remove_action( 'wp_head', 'wp_generator' );
	remove_action( 'wp_head', 'feed_links', 2 );
	remove_action( 'wp_head', 'feed_links_extra', 3 );
	remove_action( 'wp_head', 'rsd_link' );
	remove_action( 'wp_head', 'wlwmanifest_link' );
	remove_action( 'wp_head', 'wp_shortlink_wp_head', 10 );
	remove_action( 'wp_head', 'rest_output_link_wp_head', 10 );
	remove_action( 'wp_head', 'wp_oembed_add_discovery_links', 10 );
	remove_action( 'wp_head', 'wp_oembed_add_host_js' );
	remove_action( 'wp_head', 'rel_canonical' );
	remove_action( 'wp_head', 'wp_robots', 1 );
	// wp_site_icon stays: emits <link rel="icon"> + apple-touch-icon from the
	// Site Icon set at Settings → General (owner-changeable).
	remove_action( 'wp_head', 'print_emoji_detection_script', 7 );
	remove_action( 'wp_print_styles', 'print_emoji_styles' );
	remove_filter( 'the_content_feed', 'wp_staticize_emoji' );
	remove_filter( 'comment_text_rss', 'wp_staticize_emoji' );
	remove_filter( 'wp_mail', 'wp_staticize_emoji_for_email' );
}

// /favicon.ico → 302 redirect to the Site Icon URL set at
// Settings → General. WordPress core's do_favicon path only fires when the
// request parses as `is_favicon()`, which our custom /press/ rewrite rules
// interfere with — so we handle the direct file request ourselves at
// init (before rewrites can rewrite it into a page). The theme ships a
// default Bozzies monogram (theme/bozzies/assets/img/favicon.svg + PNG sizes
// rendered by scripts/dev/render-favicon.mjs) uploaded as attachment 873 and
// set as the site icon on first install. Owners can replace it any time at
// Settings → General → Site Icon.
add_action( 'init', function () {
	if ( ! isset( $_SERVER['REQUEST_URI'] ) ) {
		return;
	}
	$path = strtok( (string) $_SERVER['REQUEST_URI'], '?' );
	if ( '/favicon.ico' !== $path ) {
		return;
	}
	$icon = get_site_icon_url( 32 );
	if ( $icon ) {
		wp_redirect( $icon, 302, 'bozzies-favicon' );
		exit;
	}
	status_header( 404 );
	nocache_headers();
	exit;
}, 1 );

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

/**
 * Add a "Boz Custom Component" block category at the top of the inserter.
 * Every bozzies/* block's block.json sets category = "boz-custom-component"
 * so they all collect under this heading. Core blocks + patterns keep their
 * existing categories.
 */
add_filter( 'block_categories_all', 'bozzies_register_block_category' );
function bozzies_register_block_category( $categories ) {
	$slug = 'boz-custom-component';
	// Guard against double-register if WP ever starts calling this twice.
	foreach ( (array) $categories as $cat ) {
		if ( isset( $cat['slug'] ) && $slug === $cat['slug'] ) {
			return $categories;
		}
	}
	return array_merge(
		array(
			array(
				'slug'  => $slug,
				'title' => __( 'Boz Custom Component', 'bozzies' ),
				'icon'  => null,
			),
		),
		$categories
	);
}

add_action( 'init', 'bozzies_register_theme_blocks' );
function bozzies_register_theme_blocks() {
	foreach ( glob( __DIR__ . '/blocks/*/block.json' ) as $block_json ) {
		register_block_type( dirname( $block_json ) );
	}
}

add_action( 'wp_enqueue_scripts', 'bozzies_enqueue_chrome' );
function bozzies_enqueue_chrome() {
	$dir_uri = get_stylesheet_directory_uri();
	// Astro's global styles — the sitewide reset + typography + grounds
	// + layout helpers + eyebrow + hairline + skip-link + visually-hidden.
	// Verbatim port of ~/boswell-poc/src/styles/global.css.
	wp_enqueue_style(
		'bozzies-astro-global',
		$dir_uri . '/assets/css/astro/global.css',
		array(),
		bozzies_asset_ver( 'assets/css/astro/global.css' )
	);
	// Astro hero CSS — verbatim port of Hero.astro's <style>. Owned by
	// the section block's is-hero-photo variant.
	wp_enqueue_style(
		'bozzies-astro-hero',
		$dir_uri . '/assets/css/astro/hero.css',
		array( 'bozzies-astro-global' ),
		bozzies_asset_ver( 'assets/css/astro/hero.css' )
	);
	// Astro article CSS — verbatim port of the article-list, article-row,
	// article-hero, page-hero, article-nav, prose and video-embed rules
	// from Astro's press/**/*.astro pages.
	wp_enqueue_style(
		'bozzies-astro-article',
		$dir_uri . '/assets/css/astro/article.css',
		array( 'bozzies-astro-global' ),
		bozzies_asset_ver( 'assets/css/astro/article.css' )
	);
	// Astro cards CSS — sister-card, subpage-card, bio-body, bio-portrait,
	// facts, bio-timeline, bio-nav (from sisters/**), release-card (from
	// press/index.astro), music-teaser + lessons-grid + lesson-card (from
	// media/index.astro). Future card families (see-also) get appended.
	wp_enqueue_style(
		'bozzies-astro-cards',
		$dir_uri . '/assets/css/astro/cards.css',
		array( 'bozzies-astro-global' ),
		bozzies_asset_ver( 'assets/css/astro/cards.css' )
	);
	// Astro music-backdrop CSS — verbatim port of MusicBackdrop.astro's
	// <style>. Currently used by the bozzies/bio-hero block (staves variant);
	// step 12 extends the section block's backdrop enum to share it.
	wp_enqueue_style(
		'bozzies-astro-music-backdrop',
		$dir_uri . '/assets/css/astro/music-backdrop.css',
		array( 'bozzies-astro-global' ),
		bozzies_asset_ver( 'assets/css/astro/music-backdrop.css' )
	);
	// Astro bio-hero CSS — verbatim port of sisters/[slug].astro's .bio-hero*
	// rules. Owned by the bozzies/bio-hero block.
	wp_enqueue_style(
		'bozzies-astro-bio-hero',
		$dir_uri . '/assets/css/astro/bio-hero.css',
		array( 'bozzies-astro-global', 'bozzies-astro-music-backdrop' ),
		bozzies_asset_ver( 'assets/css/astro/bio-hero.css' )
	);
	// Astro lesson-hero CSS — verbatim port of media/lessons/[order].astro's
	// .lesson-hero* rules. Owned by the bozzies/lesson-hero block.
	wp_enqueue_style(
		'bozzies-astro-lesson-hero',
		$dir_uri . '/assets/css/astro/lesson-hero.css',
		array( 'bozzies-astro-global', 'bozzies-astro-music-backdrop' ),
		bozzies_asset_ver( 'assets/css/astro/lesson-hero.css' )
	);
	// Astro lesson-player CSS — verbatim port of media/lessons/[order].astro's
	// .lesson-player* + .lesson-notes rules. Owned by the bozzies/lesson-player
	// block; `.prose` rules the same Astro file also declares are already in
	// article.css.
	wp_enqueue_style(
		'bozzies-astro-lesson-player',
		$dir_uri . '/assets/css/astro/lesson-player.css',
		array( 'bozzies-astro-global', 'bozzies-astro-article' ),
		bozzies_asset_ver( 'assets/css/astro/lesson-player.css' )
	);
	// Astro lesson-nav CSS — verbatim port of media/lessons/[order].astro's
	// .lesson-nav* rules. Owned by the bozzies/lesson-nav block.
	wp_enqueue_style(
		'bozzies-astro-lesson-nav',
		$dir_uri . '/assets/css/astro/lesson-nav.css',
		array( 'bozzies-astro-global' ),
		bozzies_asset_ver( 'assets/css/astro/lesson-nav.css' )
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
		bozzies_asset_ver( 'assets/css/astro/pages.css' )
	);
	// Astro pull-quote CSS — verbatim port of PullQuote.astro's <style>.
	// Owned by the bozzies/pull-quote block.
	wp_enqueue_style(
		'bozzies-astro-pull-quote',
		$dir_uri . '/assets/css/astro/pull-quote.css',
		array( 'bozzies-astro-global' ),
		bozzies_asset_ver( 'assets/css/astro/pull-quote.css' )
	);
	// Astro section-divider CSS — verbatim port of SectionDivider.astro's
	// <style>. Owned by the bozzies/divider block.
	wp_enqueue_style(
		'bozzies-astro-section-divider',
		$dir_uri . '/assets/css/astro/section-divider.css',
		array( 'bozzies-astro-global' ),
		bozzies_asset_ver( 'assets/css/astro/section-divider.css' )
	);
	// Astro nav CSS — verbatim port of Nav.astro's <style>. Owned by the
	// bozzies/site-nav block; used by parts/header.html.
	wp_enqueue_style(
		'bozzies-astro-nav',
		$dir_uri . '/assets/css/astro/nav.css',
		array( 'bozzies-astro-global' ),
		bozzies_asset_ver( 'assets/css/astro/nav.css' )
	);
	// Astro footer CSS — verbatim port of Footer.astro's <style>. Owned by
	// the bozzies/site-footer block; used by parts/footer.html.
	wp_enqueue_style(
		'bozzies-astro-footer',
		$dir_uri . '/assets/css/astro/footer.css',
		array( 'bozzies-astro-global' ),
		bozzies_asset_ver( 'assets/css/astro/footer.css' )
	);
	// Astro prose-body CSS — verbatim port of the .charts-body and
	// .reviews-body page-scoped prose rules from charts.astro and
	// reviews.astro. Owned by the bozzies/prose-body block. Base .prose
	// rules already live in article.css.
	wp_enqueue_style(
		'bozzies-astro-prose-body',
		$dir_uri . '/assets/css/astro/prose-body.css',
		array( 'bozzies-astro-global', 'bozzies-astro-article' ),
		bozzies_asset_ver( 'assets/css/astro/prose-body.css' )
	);
	// Astro playlist-player CSS — verbatim port of PlaylistPlayer.astro's
	// <style>. Owned by the bozzies/playlist-player block.
	wp_enqueue_style(
		'bozzies-astro-playlist-player',
		$dir_uri . '/assets/css/astro/playlist-player.css',
		array( 'bozzies-astro-global' ),
		bozzies_asset_ver( 'assets/css/astro/playlist-player.css' )
	);
	// Astro quotes-carousel CSS — verbatim port of QuotesCarousel.astro's
	// <style>. Owned by the bozzies/quotes-carousel block.
	wp_enqueue_style(
		'bozzies-astro-quotes-carousel',
		$dir_uri . '/assets/css/astro/quotes-carousel.css',
		array( 'bozzies-astro-global' ),
		bozzies_asset_ver( 'assets/css/astro/quotes-carousel.css' )
	);
	// Astro timeline CSS — verbatim port of Timeline.astro's <style>
	// plus career-timeline.astro's `.timeline-section` wrapper rules.
	// Owned by the bozzies/timeline block.
	wp_enqueue_style(
		'bozzies-astro-timeline',
		$dir_uri . '/assets/css/astro/timeline.css',
		array( 'bozzies-astro-global' ),
		bozzies_asset_ver( 'assets/css/astro/timeline.css' )
	);
	// Astro discography CSS — verbatim port of the .disc-search / .disc-scope
	// / .disc-session / .disc-track rules from media/discography.astro L175-265.
	// Owned by the bozzies/discography block.
	wp_enqueue_style(
		'bozzies-astro-discography',
		$dir_uri . '/assets/css/astro/discography.css',
		array( 'bozzies-astro-global' ),
		bozzies_asset_ver( 'assets/css/astro/discography.css' )
	);
	// Contact page + Contact Form 7 styling — theme-owned (no Astro
	// equivalent). Enqueued globally so the shortcode can live on any page.
	wp_enqueue_style(
		'bozzies-astro-contact',
		$dir_uri . '/assets/css/astro/contact.css',
		array( 'bozzies-astro-global' ),
		bozzies_asset_ver( 'assets/css/astro/contact.css' )
	);
	// Shared list-width rule — caps vertical content lists (article lists,
	// release grid, lesson cards, music teasers grid, discography sessions,
	// owner-added core/list in main content) at the same measure the
	// timeline uses on /sisters/connee/. See file header for the number.
	wp_enqueue_style(
		'bozzies-astro-lists',
		$dir_uri . '/assets/css/astro/lists.css',
		array( 'bozzies-astro-global', 'bozzies-astro-cards', 'bozzies-astro-article', 'bozzies-astro-discography' ),
		bozzies_asset_ver( 'assets/css/astro/lists.css' )
	);
	// chrome.css is what remains of the pre-rebuild theme CSS. During the
	// rebuild it is being pared down commit-by-commit as ports land; it
	// will end up holding only WordPress-specific plumbing (or be deleted
	// entirely). Kept last so ported Astro CSS wins any tie.
	wp_enqueue_style(
		'bozzies-chrome',
		$dir_uri . '/assets/css/chrome.css',
		array( 'bozzies-astro-global', 'bozzies-astro-hero', 'bozzies-astro-article', 'bozzies-astro-cards', 'bozzies-astro-music-backdrop', 'bozzies-astro-bio-hero', 'bozzies-astro-lesson-hero', 'bozzies-astro-lesson-player', 'bozzies-astro-lesson-nav', 'bozzies-astro-pages', 'bozzies-astro-pull-quote', 'bozzies-astro-section-divider', 'bozzies-astro-nav', 'bozzies-astro-footer', 'bozzies-astro-prose-body', 'bozzies-astro-playlist-player', 'bozzies-astro-quotes-carousel', 'bozzies-astro-timeline', 'bozzies-astro-discography', 'bozzies-astro-contact', 'bozzies-astro-lists' ),
		bozzies_asset_ver( 'assets/css/chrome.css' )
	);

	// Playlist player front-end JS — verbatim port of PlaylistPlayer.astro's
	// <script>. Enqueued only when the current page contains the
	// bozzies/playlist-player block, so pages without a player pay nothing.
	if ( is_singular() && has_block( 'bozzies/playlist-player' ) ) {
		wp_enqueue_script(
			'bozzies-playlist-player',
			$dir_uri . '/assets/js/playlist-player.js',
			array(),
			bozzies_asset_ver( 'assets/js/playlist-player.js' ),
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
			bozzies_asset_ver( 'assets/js/quotes-carousel.js' ),
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
			bozzies_asset_ver( 'assets/js/discography-search.js' ),
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
	// Shared list + card-grid widths and the center-paragraph rule — needed
	// in the editor so inserter previews measure the same as the front end.
	add_editor_style( 'assets/css/astro/lists.css' );
	// Contact-form styling — editor-side so a /contact/ page preview looks
	// right too.
	add_editor_style( 'assets/css/astro/contact.css' );
	add_editor_style( 'assets/css/chrome.css' );
}

/**
 * Enqueue the "Article details" sidebar plugin on post-editor screens only.
 * The meta keys are underscore-prefixed so Custom Fields hides them; this
 * panel gives the owner a normal Gutenberg control that writes through REST.
 */
/**
 * Expose the block-previews image directory to the inserter preview. The
 * five JS/audio-dependent blocks (playlist-player, quotes-carousel,
 * discography, lesson-player, timeline) render a static <img> when their
 * example sets isPreview:true, pulling the file from here.
 */
add_action( 'enqueue_block_editor_assets', 'bozzies_block_preview_base' );
function bozzies_block_preview_base() {
	wp_register_script( 'bozzies-block-preview-base', '', array( 'wp-blocks' ), null, false );
	wp_enqueue_script( 'bozzies-block-preview-base' );
	wp_add_inline_script(
		'bozzies-block-preview-base',
		'window.__BOZZIES_PREVIEW_BASE__ = ' . wp_json_encode( get_stylesheet_directory_uri() . '/assets/img/block-previews/' ) . ';',
		'after'
	);
}

add_action( 'enqueue_block_editor_assets', 'bozzies_enqueue_article_meta_panel' );
function bozzies_enqueue_article_meta_panel() {
	$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
	if ( $screen && isset( $screen->post_type ) && 'post' !== $screen->post_type ) {
		return;
	}
	wp_enqueue_script(
		'bozzies-article-meta-panel',
		get_stylesheet_directory_uri() . '/assets/js/article-meta-panel.js',
		array( 'wp-plugins', 'wp-edit-post', 'wp-element', 'wp-components', 'wp-data', 'wp-core-data', 'wp-i18n' ),
		bozzies_asset_ver( 'assets/js/article-meta-panel.js' ),
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
 * Render core/embed YouTube blocks as Astro's .video-embed iframe so
 * article bodies match press/[subhub]/[slug].astro L61-67 verbatim.
 * The Astro markdown source stores videoEmbed as youtube.com/embed/{id}
 * URLs (not the /watch?v= form). WordPress oEmbed doesn't resolve those,
 * so out of the box the block renders the URL as plain text. This filter
 * detects any YouTube URL (embed, watch, youtu.be, or nocookie) on a
 * core/embed block and swaps the whole output for the iframe wrapper.
 */
add_filter( 'render_block_core/embed', function ( $block_content, $block ) {
	$url = isset( $block['attrs']['url'] ) ? (string) $block['attrs']['url'] : '';
	if ( '' === $url ) {
		return $block_content;
	}
	$video_id = '';
	if ( preg_match( '#youtube(?:-nocookie)?\.com/embed/([A-Za-z0-9_-]{6,})#i', $url, $m ) ) {
		$video_id = $m[1];
	} elseif ( preg_match( '#youtube\.com/watch\?(?:.*&)?v=([A-Za-z0-9_-]{6,})#i', $url, $m ) ) {
		$video_id = $m[1];
	} elseif ( preg_match( '#youtu\.be/([A-Za-z0-9_-]{6,})#i', $url, $m ) ) {
		$video_id = $m[1];
	}
	if ( '' === $video_id ) {
		return $block_content;
	}
	$src   = 'https://www.youtube-nocookie.com/embed/' . $video_id;
	$title = esc_attr( get_the_title() );
	return sprintf(
		'<div class="video-embed"><iframe src="%s" title="%s" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>',
		esc_url( $src ),
		$title
	);
}, 5, 2 );

/**
 * Contact Form 7 tweaks.
 *
 * Turn off CF7's autop pass. Our form template controls its own <p>/<label>
 * layout in the DB; wpautop was inserting stray <br /> after every <label>
 * which breaks the label→input pairing visually.
 *
 * Case-insensitive quiz: no filter needed. CF7's wpcf7_canonicalize() runs
 * strtolower() on the submitted answer BEFORE hashing it to compare against
 * the stored hash of "boswell" (see contact-form-7/modules/quiz.php L100-105
 * and includes/formatting.php L240-250). So the stored lowercase "boswell"
 * matches "Boswell", "BOSWELL", "bOsWeLL", etc. automatically.
 */
add_filter( 'wpcf7_autop_or_not', '__return_false' );

/**
 * Give /press/{category}/{postname}/ post URLs priority over WP's verbose
 * page-hierarchy resolution. Without this, WP treats /press/ as a page and
 * refuses to dispatch descendant URLs to posts (the "press" page hub blocks
 * all article URLs). See settled decisions: articles are posts, sub-hubs are
 * categories, article URLs are /press/{category}/{slug}/.
 *
 * Video is a sibling exception: the `video` category lives under /media/ in
 * the owner's content organization even though it uses the same `category`
 * taxonomy as the press subhubs. Articles keep /media/video/{slug}/ URLs,
 * but there is NO archive page at /media/video/ — all video articles are
 * listed in the "Video Features" section on /media/ itself, anchored at
 * #video. /media/video/ is 301-redirected to /media/#video.
 */
add_action( 'init', 'bozzies_press_rewrite_rule', 11 );
function bozzies_press_rewrite_rule() {
	add_rewrite_rule(
		'^press/([^/]+)/([^/]+)/?$',
		'index.php?category_name=$matches[1]&name=$matches[2]',
		'top'
	);
	// Only the per-article URL rewrite — no archive rule.
	add_rewrite_rule(
		'^media/video/([^/]+)/?$',
		'index.php?category_name=video&name=$matches[1]',
		'top'
	);
}

/**
 * 301 /media/video/ (and /media/video) to the #video section on /media/.
 * Runs at init priority 2 (ahead of WordPress's own rewrite dispatch so a
 * stale permalink doesn't hit the retired archive route).
 */
add_action( 'init', 'bozzies_media_video_archive_redirect', 2 );
function bozzies_media_video_archive_redirect() {
	if ( empty( $_SERVER['REQUEST_URI'] ) ) {
		return;
	}
	$path = strtok( (string) $_SERVER['REQUEST_URI'], '?' );
	if ( '/media/video/' === $path || '/media/video' === $path ) {
		wp_redirect( home_url( '/media/#video' ), 301, 'bozzies-media-video-anchor' );
		exit;
	}
}

/**
 * Make posts in the `video` category have canonical URL /media/video/{slug}/
 * instead of /press/video/{slug}/. Called by `get_permalink()`, so permalinks
 * emitted by every WP helper (post-title isLink, article nav, REST responses)
 * all go through this.
 */
// Rebuild every article permalink to /press/{category}/{slug}/ (or
// /media/video/{slug}/ for the video category — see the item-1 move).
// Without this filter WordPress returns the raw permalink_structure
// output — /%year%/%monthnum%/%day%/%postname%/ — because our custom
// /press/… URL isn't a stock permalink tag it can compose on its own.
// Called by get_permalink(), so every post-title isLink, article-nav
// anchor, REST response, and sitemap entry runs through this.
add_filter( 'post_link', 'bozzies_post_press_link', 10, 2 );
function bozzies_post_press_link( $url, $post ) {
	if ( ! $post instanceof WP_Post || 'post' !== $post->post_type ) {
		return $url;
	}
	$slugs = wp_get_post_categories( $post->ID, array( 'fields' => 'slugs' ) );
	if ( in_array( 'video', $slugs, true ) ) {
		return home_url( '/media/video/' . $post->post_name . '/' );
	}
	// Pick the first non-video category — "uncategorized" is the fallback
	// so a stray un-categorised draft still gets a usable URL instead of
	// a leading "//".
	$sub = 'uncategorized';
	foreach ( $slugs as $s ) {
		if ( 'uncategorized' === $s ) {
			continue;
		}
		$sub = $s;
		break;
	}
	return home_url( '/press/' . $sub . '/' . $post->post_name . '/' );
}

// 301-redirect the stale date-based URLs WordPress used to publish at
// (`/2026/09/27/02-cats-hepped/`) over to the new /press/{sub}/{slug}/
// (or /media/video/{slug}/) address so any owner-saved link or search
// hit lands on the right page instead of the stock date archive.
add_action( 'template_redirect', 'bozzies_redirect_date_post_urls', 1 );
function bozzies_redirect_date_post_urls() {
	if ( empty( $_SERVER['REQUEST_URI'] ) ) {
		return;
	}
	$path = strtok( (string) $_SERVER['REQUEST_URI'], '?' );
	// Match `/YYYY/MM/DD/slug/` with optional trailing slash. Captures the
	// slug only; the date components aren't needed because post_name is
	// unique across the site.
	if ( ! preg_match( '#^/\d{4}/\d{2}/\d{2}/([^/]+)/?$#', $path, $m ) ) {
		return;
	}
	$posts = get_posts( array(
		'name'           => $m[1],
		'post_type'      => 'post',
		'post_status'    => 'publish',
		'posts_per_page' => 1,
	) );
	if ( empty( $posts ) ) {
		return;
	}
	$target = get_permalink( $posts[0] );
	if ( ! $target ) {
		return;
	}
	wp_redirect( $target, 301, 'bozzies-date-url-redirect' );
	exit;
}

/**
 * The Video Features category "archive" lives inline on /media/ — the term
 * link points at the #video anchor on that page.
 */
add_filter( 'term_link', 'bozzies_video_term_link', 10, 3 );
function bozzies_video_term_link( $url, $term, $taxonomy ) {
	if ( 'category' === $taxonomy && isset( $term->slug ) && 'video' === $term->slug ) {
		return home_url( '/media/#video' );
	}
	return $url;
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

// Core `wp:table` renders `<figure class="wp-block-table"><table>…</table></figure>`.
// The figure is horizontally scrollable at narrow viewports (chart tables
// have five columns and overflow the 390 viewport reading column). Make
// each table figure a focusable region with an accessible name so
// keyboard-only users can arrow-scroll through it (WCAG 2.1.1 + axe
// `scrollable-region-focusable`). Caption, if present, becomes the
// aria-label; otherwise a generic "Table" label is used.
add_filter( 'render_block_core/table', function ( $html, $block ) {
	if ( false === stripos( $html, '<figure' ) ) {
		return $html;
	}
	if ( false !== stripos( $html, 'role="region"' ) ) {
		return $html;
	}
	// Prefer the figcaption, fall back to a per-request numbered label so
	// pages with multiple tables don't trip axe's `landmark-unique` rule.
	$label = '';
	if ( preg_match( '~<figcaption[^>]*>(.+?)</figcaption>~si', $html, $m ) ) {
		$label = trim( wp_strip_all_tags( $m[1] ) );
	}
	if ( '' === $label ) {
		static $counter = 0;
		$counter++;
		$label = 'Data table ' . $counter;
	}
	$attrs = sprintf( ' role="region" aria-label="%s" tabindex="0"', esc_attr( $label ) );
	$html  = preg_replace( '~<figure(\s[^>]*)?>~i', '<figure$1' . $attrs . '>', $html, 1 );
	return $html;
}, 10, 2 );

// The contact-form-7-honeypot add-on hard-codes tabindex="1000" on the
// decoy input. Positive tabindex values fail WCAG 2.4.3 (axe rule
// `tabindex`). The plugin exposes `wpcf7_honeypot_html_output` (confirmed
// at legacy-honeypot/includes/honeypot4cf7.php L443 + L539, plugin v3.8.0)
// so we rewrite both attributes to `-1` — the field stays focusable
// programmatically for the plugin's refill script but drops out of the
// keyboard tab order, which is what a hidden decoy input should do.
add_filter( 'wpcf7_honeypot_html_output', function ( $html ) {
	$html = str_replace( 'tabindex="1000"', 'tabindex="-1"', $html );
	$html = str_replace( 'data-cf7apps-tabindex="1000"', 'data-cf7apps-tabindex="-1"', $html );
	return $html;
} );
