/*
 * Discography search — front-end filter wiring.
 *
 * Verbatim port of the client-side <script> block from
 * ~/boswell-poc/src/pages/media/discography.astro (L101-147), rewritten
 * from TypeScript to plain JS. Behavior identical: debounced input,
 * substring match against `data-search` on <li.disc-session> and
 * `data-track-search` on <li.disc-track>, and a live-region count
 * string reading "Showing X of Y sessions, A of B tracks." (or the
 * unfiltered totals when the query is empty).
 *
 * Runs after DOMContentLoaded on every page with a [data-disc-search]
 * input; a page without the discography block simply no-ops.
 */

( function () {
	function init() {
		var input = document.querySelector( '[data-disc-search]' );
		var countEl = document.querySelector( '[data-disc-count]' );
		if ( ! input ) return;

		var debounceTimer;
		var totalSessions = document.querySelectorAll( '.disc-session' ).length;
		var totalTracks = document.querySelectorAll( '.disc-track' ).length;

		function applyFilter( q ) {
			var query = ( q || '' ).trim().toLowerCase();
			var sessionsShown = 0;
			var tracksShown = 0;

			document.querySelectorAll( '.disc-session' ).forEach( function ( sessionEl ) {
				if ( ! query ) {
					sessionEl.style.display = '';
					sessionEl.querySelectorAll( '.disc-track' ).forEach( function ( t ) {
						t.style.display = '';
					} );
					sessionsShown++;
					return;
				}
				var sessionMatches =
					( sessionEl.getAttribute( 'data-search' ) || '' ).indexOf( query ) !== -1;
				var anyTrack = false;
				sessionEl.querySelectorAll( '.disc-track' ).forEach( function ( track ) {
					var trackMatches =
						sessionMatches ||
						( track.getAttribute( 'data-track-search' ) || '' ).indexOf( query ) !== -1;
					track.style.display = trackMatches ? '' : 'none';
					if ( trackMatches ) anyTrack = true;
				} );
				var show = sessionMatches || anyTrack;
				sessionEl.style.display = show ? '' : 'none';
				if ( show ) sessionsShown++;
			} );

			tracksShown = Array.prototype.slice
				.call( document.querySelectorAll( '.disc-track' ) )
				.filter( function ( t ) {
					return t.style.display !== 'none';
				} ).length;

			if ( countEl ) {
				countEl.textContent = query
					? 'Showing ' +
					  sessionsShown +
					  ' of ' +
					  totalSessions +
					  ' sessions, ' +
					  tracksShown +
					  ' of ' +
					  totalTracks +
					  ' tracks.'
					: totalSessions + ' sessions, ' + totalTracks + ' tracks.';
			}
		}

		input.addEventListener( 'input', function () {
			window.clearTimeout( debounceTimer );
			debounceTimer = window.setTimeout( function () {
				applyFilter( input.value );
			}, 120 );
		} );

		// Initial count
		applyFilter( '' );
	}

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', init );
	} else {
		init();
	}
} )();
