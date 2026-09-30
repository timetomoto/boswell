/*
 * Playlist player — front-end playback wiring.
 *
 * Verbatim port of the client-side <script> block from
 * ~/boswell-poc/src/components/PlaylistPlayer.astro (L80-158), rewritten
 * from TypeScript to plain JS. Behavior identical: reads the tracks array
 * from a <script type="application/json" data-tracks> tag, wires up
 * play/pause/prev/next, click-to-seek, keyboard seek (WCAG 2.1.1),
 * timeupdate progress + duration display, aria-current on the active
 * track, autoplay-next on ended.
 *
 * Runs after DOMContentLoaded and on every element with [data-playlist].
 */

( function () {
	function fmt( s ) {
		if ( ! Number.isFinite( s ) ) return '--:--';
		var m = Math.floor( s / 60 );
		var sec = Math.floor( s % 60 ).toString().padStart( 2, '0' );
		return m + ':' + sec;
	}

	function initAll() {
		document.querySelectorAll( '[data-playlist]' ).forEach( function ( root ) {
			var tracksNode = root.querySelector( '[data-tracks]' );
			var tracks = [];
			try { tracks = JSON.parse( ( tracksNode && tracksNode.textContent ) || '[]' ); } catch ( e ) { tracks = []; }
			if ( ! tracks.length ) return;

			var audio    = root.querySelector( '[data-audio]' );
			var titleEl  = root.querySelector( '[data-title]' );
			var metaEl   = root.querySelector( '[data-meta]' );
			var playBtn  = root.querySelector( '[data-play]' );
			var prevBtn  = root.querySelector( '[data-prev]' );
			var nextBtn  = root.querySelector( '[data-next]' );
			var iconPlay  = root.querySelector( '.pp__icon-play' );
			var iconPause = root.querySelector( '.pp__icon-pause' );
			var progContainer = root.querySelector( '[data-progress-container]' );
			var progBar = root.querySelector( '[data-progress]' );
			var curEl   = root.querySelector( '[data-current]' );
			var durEl   = root.querySelector( '[data-duration]' );
			var trackBtns = Array.prototype.slice.call( root.querySelectorAll( '[data-track]' ) );

			var idx = 0;

			function load( i, play ) {
				idx = ( ( i % tracks.length ) + tracks.length ) % tracks.length;
				var t = tracks[ idx ];
				audio.src = t.audio;
				if ( titleEl ) titleEl.textContent = t.title;
				if ( metaEl )  metaEl.textContent  = [ t.artist, t.year ].filter( Boolean ).join( ' · ' );
				trackBtns.forEach( function ( b, i2 ) { b.setAttribute( 'aria-current', String( i2 === idx ) ); } );
				if ( play ) audio.play().catch( function () {} );
			}

			if ( playBtn ) playBtn.addEventListener( 'click', function () {
				if ( audio.paused ) audio.play().catch( function () {} );
				else audio.pause();
			} );
			if ( prevBtn ) prevBtn.addEventListener( 'click', function () { load( idx - 1, ! audio.paused ); } );
			if ( nextBtn ) nextBtn.addEventListener( 'click', function () { load( idx + 1, ! audio.paused ); } );
			trackBtns.forEach( function ( b, i ) { b.addEventListener( 'click', function () { load( i, true ); } ); } );

			audio.addEventListener( 'play',  function () { if ( iconPlay ) iconPlay.style.display = 'none'; if ( iconPause ) iconPause.style.display = ''; } );
			audio.addEventListener( 'pause', function () { if ( iconPlay ) iconPlay.style.display = '';     if ( iconPause ) iconPause.style.display = 'none'; } );
			audio.addEventListener( 'ended', function () { load( idx + 1, true ); } );
			audio.addEventListener( 'loadedmetadata', function () { if ( durEl ) durEl.textContent = fmt( audio.duration ); } );
			audio.addEventListener( 'timeupdate', function () {
				if ( curEl ) curEl.textContent = fmt( audio.currentTime );
				if ( audio.duration ) {
					var pct = ( audio.currentTime / audio.duration ) * 100;
					if ( progBar ) progBar.style.width = pct + '%';
					if ( progContainer ) progContainer.setAttribute( 'aria-valuenow', String( Math.round( pct ) ) );
				}
			} );

			if ( progContainer ) progContainer.addEventListener( 'click', function ( e ) {
				var rect = progContainer.getBoundingClientRect();
				var pct = ( e.clientX - rect.left ) / rect.width;
				if ( audio.duration ) audio.currentTime = pct * audio.duration;
			} );

			/* Keyboard seeking on the progress bar — WCAG 2.1.1 */
			if ( progContainer ) progContainer.addEventListener( 'keydown', function ( e ) {
				var key = e.key;
				if ( ! audio.duration ) return;
				var step = 5;
				if ( key === 'ArrowRight' || key === 'ArrowUp' )   { audio.currentTime = Math.min( audio.duration, audio.currentTime + step ); e.preventDefault(); }
				if ( key === 'ArrowLeft'  || key === 'ArrowDown' ) { audio.currentTime = Math.max( 0,               audio.currentTime - step ); e.preventDefault(); }
				if ( key === 'Home' )                              { audio.currentTime = 0;                                                     e.preventDefault(); }
				if ( key === 'End' )                               { audio.currentTime = audio.duration;                                        e.preventDefault(); }
				if ( key === ' ' || key === 'Enter' )              { if ( audio.paused ) audio.play().catch( function () {} ); else audio.pause(); e.preventDefault(); }
			} );

			load( 0, false );
		} );
	}

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', initAll );
	} else {
		initAll();
	}
} )();
