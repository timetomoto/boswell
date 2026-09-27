/**
 * Article details panel — sidebar plugin for the post editor.
 *
 * Exposes the three underscore-prefixed post-meta keys used by article
 * category/hub lists and the article template:
 *   _bozzies_author            "Article author" (person credited on the piece)
 *   _bozzies_publication       "Publication"    (source outlet)
 *   _bozzies_publication_date  "Publication date" (verbatim string,
 *                                                  e.g. "1932" or "March 1935")
 *
 * These keys are `_`-prefixed so Custom Fields hides them; this panel
 * gives the owner a normal Gutenberg control. Meta is already registered
 * with show_in_rest, so useEntityProp writes through to REST directly.
 */
( function ( wp ) {
	if ( ! wp || ! wp.plugins || ! wp.editPost ) return;

	var el = wp.element.createElement;
	var Fragment = wp.element.Fragment;
	var registerPlugin = wp.plugins.registerPlugin;
	var PluginDocumentSettingPanel = wp.editPost.PluginDocumentSettingPanel;
	var TextControl = wp.components.TextControl;
	var useSelect = wp.data.useSelect;
	var useEntityProp = wp.coreData.useEntityProp;
	var __ = wp.i18n.__;

	function ArticleDetailsPanel() {
		var postType = useSelect( function ( select ) {
			return select( 'core/editor' ).getCurrentPostType();
		}, [] );
		if ( postType !== 'post' ) return null;

		var metaState = useEntityProp( 'postType', postType, 'meta' );
		var meta = metaState[ 0 ] || {};
		var setMeta = metaState[ 1 ];

		function setField( key ) {
			return function ( value ) {
				var next = {};
				next[ key ] = value;
				setMeta( Object.assign( {}, meta, next ) );
			};
		}

		return el(
			PluginDocumentSettingPanel,
			{
				name: 'bozzies-article-details',
				title: __( 'Article details', 'bozzies' ),
				className: 'bozzies-article-details',
			},
			el( TextControl, {
				label: __( 'Author', 'bozzies' ),
				help: __( 'Person credited on the piece.', 'bozzies' ),
				value: meta._bozzies_author || '',
				onChange: setField( '_bozzies_author' ),
				__nextHasNoMarginBottom: true,
			} ),
			el( TextControl, {
				label: __( 'Publication', 'bozzies' ),
				help: __( 'Source outlet (e.g. Melody Maker).', 'bozzies' ),
				value: meta._bozzies_publication || '',
				onChange: setField( '_bozzies_publication' ),
				__nextHasNoMarginBottom: true,
			} ),
			el( TextControl, {
				label: __( 'Publication date', 'bozzies' ),
				help: __( 'Verbatim string as shown on the page (e.g. "1932" or "March 1935").', 'bozzies' ),
				value: meta._bozzies_publication_date || '',
				onChange: setField( '_bozzies_publication_date' ),
				__nextHasNoMarginBottom: true,
			} )
		);
	}

	registerPlugin( 'bozzies-article-details', {
		render: ArticleDetailsPanel,
		icon: null,
	} );
} )( window.wp );
