import { registerBlockType } from '@wordpress/blocks';
import {
	useBlockProps,
	InspectorControls,
	MediaUpload,
	MediaUploadCheck,
} from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	TextControl,
	TextareaControl,
	Button,
	Notice,
} from '@wordpress/components';
import { __, sprintf } from '@wordpress/i18n';
import metadata from '../block.json';

function updateEntry( entries, i, patch ) {
	return entries.map( ( e, idx ) => ( idx === i ? { ...e, ...patch } : e ) );
}

const colorVar = ( c ) =>
	( { purple: 'var(--purple)', brass: 'var(--brass)', yellow: 'var(--yellow)', copper: 'var(--copper)' } )[ c ] || 'var(--purple)';

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
							src={ base + 'timeline.png' }
							alt=""
							style={ { display: 'block', width: '100%', height: 'auto', borderRadius: 4 } }
						/>
					</div>
				);
			}

		const { entries = [], color = 'purple' } = attributes;
		const blockProps = useBlockProps();

		const addEntry = () => {
			setAttributes( {
				entries: [
					...entries,
					{ year: '', event: '', image: '', imageAlt: '' },
				],
			} );
		};
		const removeEntry = ( i ) => {
			setAttributes( { entries: entries.filter( ( _, idx ) => idx !== i ) } );
		};
		const moveEntry = ( i, delta ) => {
			const j = i + delta;
			if ( j < 0 || j >= entries.length ) return;
			const next = entries.slice();
			[ next[ i ], next[ j ] ] = [ next[ j ], next[ i ] ];
			setAttributes( { entries: next } );
		};

		return (
			<>
				<InspectorControls>
					<PanelBody title={ __( 'Timeline', 'bozzies' ) } initialOpen>
						<SelectControl
							label={ __( 'Accent color', 'bozzies' ) }
							value={ color }
							options={ [
								{ label: __( 'Purple', 'bozzies' ), value: 'purple' },
								{ label: __( 'Brass', 'bozzies' ), value: 'brass' },
								{ label: __( 'Yellow', 'bozzies' ), value: 'yellow' },
								{ label: __( 'Copper', 'bozzies' ), value: 'copper' },
							] }
							onChange={ ( v ) => setAttributes( { color: v } ) }
							__nextHasNoMarginBottom
						/>
					</PanelBody>
					<PanelBody title={ __( 'Entries', 'bozzies' ) } initialOpen>
						<p style={ { marginTop: 0 } }>
							{ sprintf( __( '%d entries.', 'bozzies' ), entries.length ) }
						</p>
						{ entries.length === 0 && (
							<Notice status="warning" isDismissible={ false }>
								{ __( 'Add at least one entry for the timeline to appear on the front end.', 'bozzies' ) }
							</Notice>
						) }
						{ entries.map( ( e, i ) => (
							<div
								key={ i }
								style={ {
									padding: '0.75rem',
									marginBottom: '0.75rem',
									border: '1px solid #ddd',
									borderRadius: '2px',
								} }
							>
								<strong>
									{ String( i + 1 ).padStart( 2, '0' ) } — { e.year || __( '(no year)', 'bozzies' ) }
								</strong>
								<TextControl
									label={ __( 'Year (or date range)', 'bozzies' ) }
									value={ e.year || '' }
									onChange={ ( v ) => setAttributes( { entries: updateEntry( entries, i, { year: v } ) } ) }
									__nextHasNoMarginBottom
								/>
								<TextareaControl
									label={ __( 'Event', 'bozzies' ) }
									value={ e.event || '' }
									onChange={ ( v ) => setAttributes( { entries: updateEntry( entries, i, { event: v } ) } ) }
									rows={ 5 }
									__nextHasNoMarginBottom
								/>
								<MediaUploadCheck>
									<MediaUpload
										onSelect={ ( media ) =>
											setAttributes( {
												entries: updateEntry( entries, i, {
													image: media?.url || '',
													imageAlt: media?.alt || e.imageAlt || '',
												} ),
											} )
										}
										allowedTypes={ [ 'image' ] }
										value={ 0 }
										render={ ( { open } ) => (
											<div style={ { display: 'flex', gap: '0.5rem', marginTop: '0.5rem', marginBottom: '0.5rem' } }>
												<Button variant="secondary" onClick={ open }>
													{ e.image ? __( 'Replace image', 'bozzies' ) : __( 'Add image (optional)', 'bozzies' ) }
												</Button>
												{ e.image && (
													<Button
														variant="tertiary"
														isDestructive
														onClick={ () =>
															setAttributes( {
																entries: updateEntry( entries, i, { image: '', imageAlt: '' } ),
															} )
														}
													>
														{ __( 'Remove image', 'bozzies' ) }
													</Button>
												) }
											</div>
										) }
									/>
								</MediaUploadCheck>
								{ e.image && (
									<TextControl
										label={ __( 'Image alt text', 'bozzies' ) }
										value={ e.imageAlt || '' }
										onChange={ ( v ) => setAttributes( { entries: updateEntry( entries, i, { imageAlt: v } ) } ) }
										__nextHasNoMarginBottom
									/>
								) }
								<div style={ { display: 'flex', gap: '0.5rem', marginTop: '0.5rem' } }>
									<Button variant="tertiary" onClick={ () => moveEntry( i, -1 ) } disabled={ i === 0 }>
										{ __( '↑ Up', 'bozzies' ) }
									</Button>
									<Button variant="tertiary" onClick={ () => moveEntry( i, 1 ) } disabled={ i === entries.length - 1 }>
										{ __( '↓ Down', 'bozzies' ) }
									</Button>
									<Button variant="tertiary" isDestructive onClick={ () => removeEntry( i ) }>
										{ __( 'Remove', 'bozzies' ) }
									</Button>
								</div>
							</div>
						) ) }
						<Button variant="secondary" onClick={ addEntry }>
							{ __( 'Add entry', 'bozzies' ) }
						</Button>
					</PanelBody>
				</InspectorControls>

				{ entries.length === 0 ? (
					<div { ...blockProps }>
						<p style={ { fontStyle: 'italic', color: '#888', textAlign: 'center', padding: '2rem 0' } }>
							{ __( 'Sisters timeline — add entries in the sidebar.', 'bozzies' ) }
						</p>
					</div>
				) : (
					<ol
						{ ...blockProps }
						className={ ( blockProps.className || '' ) + ' timeline' }
						style={ { ...( blockProps.style || {} ), [ '--tl-accent' ]: colorVar( color ) } }
					>
						{ entries.map( ( e, i ) => (
							<li
								key={ i }
								className={
									'timeline__entry' +
									( i % 2 === 1 ? ' timeline__entry--alt' : '' )
								}
							>
								<div className="timeline__marker" aria-hidden="true">
									<span className="timeline__dot"></span>
								</div>
								<div className="timeline__year">{ e.year || '' }</div>
								<div className="timeline__event">
									<p className="timeline__event-text">{ e.event || '' }</p>
									{ e.image && (
										<img
											className="timeline__image"
											src={ e.image }
											alt={ e.imageAlt || '' }
											loading="lazy"
										/>
									) }
								</div>
							</li>
						) ) }
					</ol>
				) }
			</>
		);
	},
	save: () => null,
} );
