import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl, Notice } from '@wordpress/components';
import { __, sprintf } from '@wordpress/i18n';
import metadata from '../block.json';

registerBlockType( metadata.name, {
	edit: ( { attributes, setAttributes } ) => {
			// Inserter preview thumbnail — rendered when the block's example
			// in block.json sets isPreview:true. Avoids the JS/audio UI the
			// real edit view uses, which doesn't read well in the small preview.
			if ( attributes.isPreview ) {
				const base = ( typeof window !== 'undefined' && window.__BOZZIES_PREVIEW_BASE__ ) || '/wp-content/themes/bozzies/assets/img/block-previews/';
				return (
					<div { ...useBlockProps() }>
						<img
							src={ base + 'discography.png' }
							alt=""
							style={ { display: 'block', width: '100%', height: 'auto', borderRadius: 4 } }
						/>
					</div>
				);
			}

		const {
			scopes = [],
			searchLabel = '',
			searchPlaceholder = '',
		} = attributes;
		const blockProps = useBlockProps();

		const sessionCount = scopes.reduce(
			( n, s ) => n + ( Array.isArray( s.sessions ) ? s.sessions.length : 0 ),
			0
		);
		const trackCount = scopes.reduce(
			( n, s ) =>
				n +
				( Array.isArray( s.sessions )
					? s.sessions.reduce(
							( m, sess ) =>
								m + ( Array.isArray( sess.tracks ) ? sess.tracks.length : 0 ),
							0
					  )
					: 0 ),
			0
		);

		return (
			<>
				<InspectorControls>
					<PanelBody title={ __( 'Search bar copy', 'bozzies' ) } initialOpen>
						<TextControl
							label={ __( 'Label', 'bozzies' ) }
							value={ searchLabel }
							onChange={ ( v ) => setAttributes( { searchLabel: v } ) }
							__nextHasNoMarginBottom
						/>
						<TextControl
							label={ __( 'Placeholder', 'bozzies' ) }
							value={ searchPlaceholder }
							onChange={ ( v ) => setAttributes( { searchPlaceholder: v } ) }
							__nextHasNoMarginBottom
						/>
					</PanelBody>
					<PanelBody title={ __( 'Data', 'bozzies' ) } initialOpen>
						{ scopes.length === 0 ? (
							<Notice status="warning" isDismissible={ false }>
								{ __(
									'No discography data on this block. Run scripts/import/discography.mjs to fill it from ~/boswell-poc/src/content/discography/*.md.',
									'bozzies'
								) }
							</Notice>
						) : (
							<p style={ { marginTop: 0 } }>
								{ sprintf(
									__( '%1$d scopes · %2$d sessions · %3$d tracks.', 'bozzies' ),
									scopes.length,
									sessionCount,
									trackCount
								) }
							</p>
						) }
						<p style={ { color: '#666', fontSize: '12px', marginTop: '0.5rem' } }>
							{ __(
								'The scopes / sessions / tracks arrays live on the block attributes. To rebuild the list, run the import script and re-publish the page.',
								'bozzies'
							) }
						</p>
					</PanelBody>
				</InspectorControls>

				<div { ...blockProps }>
					<section className="section ground-paper discography-tools">
						<div className="container">
							<div className="disc-search">
								<label
									className="disc-search__label"
									htmlFor="disc-search-input-editor"
								>
									{ searchLabel || __( 'Search…', 'bozzies' ) }
								</label>
								<input
									id="disc-search-input-editor"
									type="search"
									className="disc-search__input"
									placeholder={ searchPlaceholder }
									disabled
								/>
								<p className="disc-search__count" aria-live="polite">
									{ sprintf(
										__( '%1$d sessions, %2$d tracks.', 'bozzies' ),
										sessionCount,
										trackCount
									) }
								</p>
							</div>
						</div>
					</section>

					<section className="section ground-paper">
						<div className="container">
							{ scopes.map( ( scope, i ) => {
								const sessions = Array.isArray( scope.sessions )
									? scope.sessions
									: [];
								return (
									<article
										key={ scope.id || i }
										className="disc-scope"
										data-scope-id={ scope.id || '' }
									>
										<header className="disc-scope__head">
											<h2 className="disc-scope__title">
												{ scope.title || __( '(untitled scope)', 'bozzies' ) }
											</h2>
											{ scope.subtitle && (
												<p className="disc-scope__subtitle">
													{ scope.subtitle }
												</p>
											) }
										</header>
										<p
											style={ {
												fontStyle: 'italic',
												color: '#666',
												fontSize: '12px',
											} }
										>
											{ sprintf(
												__(
													'%d sessions (front-end renders them all)',
													'bozzies'
												),
												sessions.length
											) }
										</p>
										{ scope.attribution && (
											<p className="disc-scope__attribution">
												{ scope.attribution }
											</p>
										) }
									</article>
								);
							} ) }
						</div>
					</section>
				</div>
			</>
		);
	},
	save: () => null,
} );
