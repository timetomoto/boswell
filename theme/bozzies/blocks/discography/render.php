<?php
/**
 * Server-side render for bozzies/discography.
 *
 * Emits Astro's exact DOM verbatim from
 * ~/boswell-poc/src/pages/media/discography.astro lines 34-83:
 *
 *   <section class="section ground-paper discography-tools">
 *     <div class="container"><div class="disc-search">…</div></div>
 *   </section>
 *   <section class="section ground-paper">
 *     <div class="container">
 *       <article class="disc-scope">…</article> * N
 *     </div>
 *   </section>
 *
 * Scopes are stored on the block attribute as an array of
 *   { id, title, subtitle, attribution, sessions: [ { header, tracks: [ { matrix, title, notes, refs } ] } ] }.
 *
 * The client-side filter (assets/js/discography-search.js — verbatim port
 * of discography.astro L101-147) reads the data-search / data-track-search
 * attributes we emit inline for each session and track.
 *
 * @package bozzies
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// render.php is included once per block render; a page with two disc blocks
// (or the editor's ServerSideRender preview + front-end render in the same
// request) would fatal on redeclare without these guards.
if ( ! function_exists( 'bozzies_disc_year_from_header' ) ) {
	/**
	 * Extract a year from a session header for filtering. Verbatim port of
	 * discography.astro L13-22 (`yearFromHeader`).
	 */
	function bozzies_disc_year_from_header( $h ) {
		if ( preg_match( '/\b(19\d{2}|20\d{2})\b/', (string) $h, $m ) ) {
			return $m[1];
		}
		if ( preg_match( '#\b\d{1,2}/\d{1,2}/(\d{2})\b#', (string) $h, $m2 ) ) {
			return '19' . str_pad( $m2[1], 2, '0', STR_PAD_LEFT );
		}
		return '';
	}
}

if ( ! function_exists( 'bozzies_disc_decode' ) ) {
	/**
	 * Decode HTML entities like Astro's raw markdown output. Curly quotes and
	 * em-dashes in the source markdown must survive round-trips.
	 */
	function bozzies_disc_decode( $s ) {
		return html_entity_decode( (string) $s, ENT_QUOTES | ENT_HTML5, 'UTF-8' );
	}
}

$attrs = wp_parse_args(
	isset( $attributes ) && is_array( $attributes ) ? $attributes : array(),
	array(
		'scopes'            => array(),
		'searchLabel'       => 'Search titles, matrix numbers, personnel…',
		'searchPlaceholder' => 'e.g. Heebie Jeebies, Brunswick, Dorsey',
	)
);

$scopes            = is_array( $attrs['scopes'] ) ? $attrs['scopes'] : array();
$search_label      = bozzies_disc_decode( $attrs['searchLabel'] );
$search_placeholder = bozzies_disc_decode( $attrs['searchPlaceholder'] );
?>
<section class="section ground-paper discography-tools">
	<div class="container">
		<div class="disc-search">
			<label class="disc-search__label" for="disc-search-input"><?php echo esc_html( $search_label ); ?></label>
			<input id="disc-search-input" type="search" class="disc-search__input" placeholder="<?php echo esc_attr( $search_placeholder ); ?>" data-disc-search>
			<p class="disc-search__count" data-disc-count aria-live="polite"></p>
		</div>
	</div>
</section>

<section class="section ground-paper">
	<div class="container">
<?php foreach ( $scopes as $scope ) :
	$scope_id          = isset( $scope['id'] ) ? (string) $scope['id'] : '';
	$scope_title       = bozzies_disc_decode( $scope['title'] ?? '' );
	$scope_subtitle    = bozzies_disc_decode( $scope['subtitle'] ?? '' );
	$scope_attribution = bozzies_disc_decode( $scope['attribution'] ?? '' );
	$sessions          = isset( $scope['sessions'] ) && is_array( $scope['sessions'] ) ? $scope['sessions'] : array();
?>
		<article class="disc-scope" data-scope-id="<?php echo esc_attr( $scope_id ); ?>">
			<header class="disc-scope__head">
				<h2 class="disc-scope__title"><?php echo esc_html( $scope_title ); ?></h2>
<?php if ( '' !== $scope_subtitle ) : ?>
				<p class="disc-scope__subtitle"><?php echo esc_html( $scope_subtitle ); ?></p>
<?php endif; ?>
			</header>
			<ol class="disc-sessions" role="list">
<?php foreach ( $sessions as $session ) :
	$session_header_raw = (string) ( $session['header'] ?? '' );
	$session_header     = bozzies_disc_decode( $session_header_raw );
	$year               = bozzies_disc_year_from_header( $session_header_raw );
	$tracks             = isset( $session['tracks'] ) && is_array( $session['tracks'] ) ? $session['tracks'] : array();

	// Assemble the session-level searchable string exactly like Astro L55-58:
	// header + every track's title/matrix/notes/refs, joined with a space,
	// lowercased. Decoded so accented characters and curly-quote glyphs match
	// what the user types in the search box.
	$searchable_parts = array( $session_header );
	foreach ( $tracks as $t ) {
		foreach ( array( 'title', 'matrix', 'notes', 'refs' ) as $k ) {
			$v = bozzies_disc_decode( $t[ $k ] ?? '' );
			if ( '' !== $v ) {
				$searchable_parts[] = $v;
			}
		}
	}
	$searchable = mb_strtolower( implode( ' ', $searchable_parts ), 'UTF-8' );
?>
				<li class="disc-session" data-year="<?php echo esc_attr( $year ); ?>" data-search="<?php echo esc_attr( $searchable ); ?>">
					<h3 class="disc-session__header"><?php echo esc_html( $session_header ); ?></h3>
<?php if ( ! empty( $tracks ) ) : ?>
					<ol class="disc-tracks" role="list">
<?php foreach ( $tracks as $t ) :
	$t_matrix = bozzies_disc_decode( $t['matrix'] ?? '' );
	$t_title  = bozzies_disc_decode( $t['title']  ?? '' );
	$t_notes  = bozzies_disc_decode( $t['notes']  ?? '' );
	$t_refs   = bozzies_disc_decode( $t['refs']   ?? '' );

	$track_search_parts = array();
	foreach ( array( $t_title, $t_matrix, $t_notes, $t_refs ) as $v ) {
		if ( '' !== $v ) {
			$track_search_parts[] = $v;
		}
	}
	$track_search = mb_strtolower( implode( ' ', $track_search_parts ), 'UTF-8' );
?>
						<li class="disc-track" data-track-search="<?php echo esc_attr( $track_search ); ?>">
<?php if ( '' !== $t_matrix ) : ?>
							<span class="disc-track__matrix"><?php echo esc_html( $t_matrix ); ?></span>
<?php endif; ?>
							<span class="disc-track__title"><?php echo esc_html( $t_title ); ?></span>
<?php if ( '' !== $t_notes ) : ?>
							<span class="disc-track__notes"><?php echo esc_html( $t_notes ); ?></span>
<?php endif; ?>
<?php if ( '' !== $t_refs ) : ?>
							<span class="disc-track__refs"><?php echo esc_html( $t_refs ); ?></span>
<?php endif; ?>
						</li>
<?php endforeach; ?>
					</ol>
<?php endif; ?>
				</li>
<?php endforeach; ?>
			</ol>
<?php if ( '' !== $scope_attribution ) : ?>
			<p class="disc-scope__attribution"><?php echo esc_html( $scope_attribution ); ?></p>
<?php endif; ?>
		</article>
<?php endforeach; ?>
	</div>
</section>
