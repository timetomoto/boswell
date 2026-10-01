/*
 * Quotes carousel — front-end interaction wiring.
 *
 * Based on QuotesCarousel.astro L44-91 but rewritten on the a11y
 * remediation branch (Wave 2) to:
 *   - Toggle a visible Pause / Play button (WCAG 2.2.2).
 *   - Mark the active dot with aria-current="true" instead of role=tab
 *     + aria-selected.
 *   - Keep the viewport silent to screen readers during auto-rotation.
 *     Only user-initiated moves (prev / next / dot / arrow key) and
 *     Pause/Play toggles write to the hidden .qc__status live region.
 *   - Respect prefers-reduced-motion: do not auto-rotate at all when
 *     the user's OS requests reduced motion. The pause button reflects
 *     the paused state in that case.
 */

( function () {
	function initAll() {
		var carousels = document.querySelectorAll( '[data-carousel]' );
		var reduceMotion = window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;

		carousels.forEach( function ( root ) {
			var slides   = Array.prototype.slice.call( root.querySelectorAll( '[data-slide]' ) );
			var dots     = Array.prototype.slice.call( root.querySelectorAll( '[data-dot]' ) );
			var prev     = root.querySelector( '[data-prev]' );
			var next     = root.querySelector( '[data-next]' );
			var toggle   = root.querySelector( '[data-playtoggle]' );
			var status   = root.querySelector( '[data-status]' );
			var iconPause = toggle ? toggle.querySelector( '.qc__icon--pause' ) : null;
			var iconPlay  = toggle ? toggle.querySelector( '.qc__icon--play' ) : null;
			var interval = Number( root.getAttribute( 'data-interval' ) ) || 7000;
			var index  = 0;
			var timer;
			var hoverPaused = false;
			var focusPaused = false;
			var userPaused  = reduceMotion;

			function slideText( i ) {
				var fig = slides[ i ];
				if ( ! fig ) return '';
				var q = fig.querySelector( '.qc__quote' );
				var a = fig.querySelector( '.qc__attr' );
				var qt = q ? q.textContent.trim() : '';
				var at = a ? a.textContent.trim() : '';
				return qt + ( at ? ' ' + at : '' );
			}
			function announce( text ) {
				if ( status ) status.textContent = text;
			}

			function go( to, opts ) {
				var fromUser = !! ( opts && opts.user );
				index = ( ( to % slides.length ) + slides.length ) % slides.length;
				slides.forEach( function ( s, i ) {
					var active = i === index;
					s.setAttribute( 'data-active', String( active ) );
					s.setAttribute( 'aria-hidden', String( ! active ) );
				} );
				dots.forEach( function ( d, i ) {
					if ( i === index ) d.setAttribute( 'aria-current', 'true' );
					else d.removeAttribute( 'aria-current' );
				} );
				if ( fromUser ) {
					announce( 'Quote ' + ( index + 1 ) + ' of ' + slides.length + '. ' + slideText( index ) );
				}
			}
			function start() {
				if ( userPaused || hoverPaused || focusPaused || timer ) return;
				timer = window.setInterval( function () { go( index + 1 ); }, interval );
			}
			function stop() {
				if ( timer ) { clearInterval( timer ); timer = undefined; }
			}

			function setToggleState( paused ) {
				if ( ! toggle ) return;
				toggle.setAttribute( 'aria-pressed', String( paused ) );
				toggle.setAttribute( 'aria-label', paused ? 'Play quotes' : 'Pause quotes' );
				if ( iconPause ) iconPause.hidden = paused;
				if ( iconPlay )  iconPlay.hidden  = ! paused;
			}

			if ( prev ) prev.addEventListener( 'click', function () {
				userPaused = true; setToggleState( true ); stop(); go( index - 1, { user: true } );
			} );
			if ( next ) next.addEventListener( 'click', function () {
				userPaused = true; setToggleState( true ); stop(); go( index + 1, { user: true } );
			} );
			dots.forEach( function ( d, i ) { d.addEventListener( 'click', function () {
				userPaused = true; setToggleState( true ); stop(); go( i, { user: true } );
			} ); } );

			if ( toggle ) toggle.addEventListener( 'click', function () {
				userPaused = ! userPaused;
				setToggleState( userPaused );
				if ( userPaused ) {
					stop();
					announce( 'Quotes paused on quote ' + ( index + 1 ) + ' of ' + slides.length + '. ' + slideText( index ) );
				} else {
					announce( 'Quotes resumed.' );
					start();
				}
			} );

			root.addEventListener( 'keydown', function ( e ) {
				var key = e.key;
				if ( key === 'ArrowLeft' )  { userPaused = true; setToggleState( true ); stop(); go( index - 1, { user: true } ); }
				if ( key === 'ArrowRight' ) { userPaused = true; setToggleState( true ); stop(); go( index + 1, { user: true } ); }
			} );
			root.addEventListener( 'mouseenter', function () { hoverPaused = true; stop(); } );
			root.addEventListener( 'mouseleave', function () { hoverPaused = false; start(); } );
			root.addEventListener( 'focusin',    function () { focusPaused = true; stop(); } );
			root.addEventListener( 'focusout',   function () { focusPaused = false; start(); } );

			setToggleState( userPaused );
			start();
		} );
	}

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', initAll );
	} else {
		initAll();
	}
} )();
