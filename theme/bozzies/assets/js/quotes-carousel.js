/*
 * Quotes carousel — front-end interaction wiring.
 *
 * Verbatim port of the client-side <script> block from
 * ~/boswell-poc/src/components/QuotesCarousel.astro (L44-91), rewritten
 * from TypeScript to plain JS. Behavior identical: auto-rotates every
 * `data-interval` ms (default 6000), pauses on hover/focus/reduced-motion,
 * prev/next buttons + dots, and left/right arrow keys navigate when the
 * carousel has focus.
 *
 * Runs after DOMContentLoaded and on every element with [data-carousel].
 */

( function () {
	function initAll() {
		var carousels = document.querySelectorAll( '[data-carousel]' );
		var reduceMotion = window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;

		carousels.forEach( function ( root ) {
			var slides = Array.prototype.slice.call( root.querySelectorAll( '[data-slide]' ) );
			var dots   = Array.prototype.slice.call( root.querySelectorAll( '[data-dot]' ) );
			var prev   = root.querySelector( '[data-prev]' );
			var next   = root.querySelector( '[data-next]' );
			var interval = Number( root.getAttribute( 'data-interval' ) ) || 6000;
			var index = 0;
			var timer;
			var paused = false;

			function go( to ) {
				index = ( ( to % slides.length ) + slides.length ) % slides.length;
				slides.forEach( function ( s, i ) {
					var active = i === index;
					s.setAttribute( 'data-active', String( active ) );
					s.setAttribute( 'aria-hidden', String( ! active ) );
				} );
				dots.forEach( function ( d, i ) { d.setAttribute( 'aria-selected', String( i === index ) ); } );
			}
			function start() {
				if ( reduceMotion || paused || timer ) return;
				timer = window.setInterval( function () { go( index + 1 ); }, interval );
			}
			function stop() {
				if ( timer ) { clearInterval( timer ); timer = undefined; }
			}

			if ( prev ) prev.addEventListener( 'click', function () { paused = true; stop(); go( index - 1 ); } );
			if ( next ) next.addEventListener( 'click', function () { paused = true; stop(); go( index + 1 ); } );
			dots.forEach( function ( d, i ) { d.addEventListener( 'click', function () { paused = true; stop(); go( i ); } ); } );

			root.addEventListener( 'keydown', function ( e ) {
				var key = e.key;
				if ( key === 'ArrowLeft' )  { paused = true; stop(); go( index - 1 ); }
				if ( key === 'ArrowRight' ) { paused = true; stop(); go( index + 1 ); }
			} );
			root.addEventListener( 'mouseenter', stop );
			root.addEventListener( 'mouseleave', function () { if ( ! paused ) start(); } );
			root.addEventListener( 'focusin',   stop );
			root.addEventListener( 'focusout',  function () { if ( ! paused ) start(); } );

			start();
		} );
	}

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', initAll );
	} else {
		initAll();
	}
} )();
