import { registerBlockType } from '@wordpress/blocks';
import {
	InnerBlocks,
	useBlockProps,
	InspectorControls,
	MediaUpload,
	MediaUploadCheck,
} from '@wordpress/block-editor';
import {
	PanelBody,
	TextControl,
	__experimentalNumberControl as NumberControl,
	Button,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import metadata from '../block.json';

// Default template — one <em>Narrated by Cynthia Lucas.</em> paragraph,
// matching every lesson body in ~/boswell-poc/src/content/lessons/*.md.
const TEMPLATE = [
	[ 'core/paragraph', { content: '<em>Narrated by Cynthia Lucas.</em>' } ],
];

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
							src={ base + 'lesson-player.png' }
							alt=""
							style={ { display: 'block', width: '100%', height: 'auto', borderRadius: 4 } }
						/>
					</div>
				);
			}

		const { order, title, audioUrl, audioId } = attributes;

		const blockProps = useBlockProps( { className: 'section ground-paper lesson-player-section' } );

		return (
			<>
				<InspectorControls>
					<PanelBody title={ __( 'Lesson', 'bozzies' ) } initialOpen>
						<NumberControl
							label={ __( 'Order', 'bozzies' ) }
							value={ order || 0 }
							min={ 0 }
							onChange={ ( v ) => setAttributes( { order: parseInt( v, 10 ) || 0 } ) }
							__nextHasNoMarginBottom
						/>
						<TextControl
							label={ __( 'Title', 'bozzies' ) }
							value={ title || '' }
							onChange={ ( v ) => setAttributes( { title: v } ) }
							__nextHasNoMarginBottom
						/>
					</PanelBody>
					<PanelBody title={ __( 'Audio file', 'bozzies' ) } initialOpen>
						<MediaUploadCheck>
							<MediaUpload
								onSelect={ ( media ) => setAttributes( { audioUrl: media.url, audioId: media.id } ) }
								allowedTypes={ [ 'audio' ] }
								value={ audioId }
								render={ ( { open } ) => (
									<>
										<Button variant="secondary" onClick={ open }>
											{ audioId
												? __( 'Replace audio file', 'bozzies' )
												: __( 'Choose audio file', 'bozzies' ) }
										</Button>
										{ audioUrl && (
											<p style={ { marginTop: '0.75rem', wordBreak: 'break-all', fontSize: '0.85rem' } }>
												{ audioUrl }
											</p>
										) }
									</>
								) }
							/>
						</MediaUploadCheck>
					</PanelBody>
				</InspectorControls>

				<section { ...blockProps }>
					<div className="container-narrow">
						<div className="lesson-player">
							<div className="lesson-player__label">
								<svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
									<circle cx="20" cy="20" r="19" fill="none" stroke="currentColor" strokeWidth="1"/>
									<path d="M15 12 L28 20 L15 28 Z" fill="currentColor"/>
								</svg>
								<div>
									<span className="lesson-player__label-kicker">Lesson { order || 0 }</span>
									<span className="lesson-player__label-title">{ title || __( '(Untitled lesson)', 'bozzies' ) }</span>
								</div>
							</div>
							{ audioUrl ? (
								<audio className="lesson-player__audio" controls preload="metadata" src={ audioUrl } />
							) : (
								<p style={ { fontStyle: 'italic', opacity: 0.7 } }>
									{ __( 'Choose an audio file from the sidebar.', 'bozzies' ) }
								</p>
							) }
							<span className="lesson-player__download">
								{ __( 'Download MP3', 'bozzies' ) }
							</span>
						</div>

						<div className="prose lesson-notes">
							<InnerBlocks
								template={ TEMPLATE }
								templateLock={ false }
								renderAppender={ InnerBlocks.ButtonBlockAppender }
							/>
						</div>
					</div>
				</section>
			</>
		);
	},
	// Server-rendered wrapper. Save must emit <InnerBlocks.Content /> so
	// each child block in the .prose.lesson-notes region serializes into
	// post_content.
	save: () => <InnerBlocks.Content />,
} );
