import { registerBlockType } from '@wordpress/blocks';
import {
	useBlockProps,
	RichText,
	InspectorControls,
	MediaUpload,
	MediaUploadCheck,
} from '@wordpress/block-editor';
import { PanelBody, Button } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import metadata from '../block.json';

// Guess a document type label from the picked file's URL. Astro's press
// hub uppercases the type on render (`.toUpperCase() ?? 'DOC'`), so this
// only needs to produce the raw extension.
const extFromUrl = ( url ) => {
	if ( ! url ) return '';
	const m = String( url ).match( /\.([a-z0-9]+)(?:\?|#|$)/i );
	return m ? m[ 1 ].toLowerCase() : '';
};

registerBlockType( metadata.name, {
	edit: ( { attributes, setAttributes } ) => {
		const { documentType, title, releaseDate, href, hrefId } = attributes;
		// Apply Astro's .release-card class (on <li> in the front, on a div
		// here so RichText remains clickable in the editor).
		const blockProps = useBlockProps( { className: 'release-card' } );

		const pickDocument = ( media ) => {
			if ( ! media ) return;
			const nextType = extFromUrl( media.url ) || 'PDF';
			setAttributes( {
				href: media.url,
				hrefId: media.id,
				// Only overwrite documentType if the owner hasn't customized it
				// past the default 'PDF'. Preserves any hand-typed type.
				documentType: documentType && documentType !== 'PDF' ? documentType : nextType,
			} );
		};

		const clearDocument = () => setAttributes( { href: '', hrefId: undefined } );

		return (
			<>
				<InspectorControls>
					<PanelBody title={ __( 'Card link', 'bozzies' ) } initialOpen>
						<MediaUploadCheck>
							<MediaUpload
								onSelect={ pickDocument }
								allowedTypes={ [ 'application', 'application/pdf' ] }
								value={ hrefId }
								render={ ( { open } ) => (
									<>
										<Button variant="secondary" onClick={ open }>
											{ href
												? __( 'Replace PDF', 'bozzies' )
												: __( 'Choose PDF from media library', 'bozzies' ) }
										</Button>
										{ href && (
											<>
												<p style={ { marginTop: '0.75rem', wordBreak: 'break-all', fontSize: '0.85rem' } }>
													{ href }
												</p>
												<Button variant="link" isDestructive onClick={ clearDocument }>
													{ __( 'Remove PDF', 'bozzies' ) }
												</Button>
											</>
										) }
									</>
								) }
							/>
						</MediaUploadCheck>
					</PanelBody>
				</InspectorControls>

				<div { ...blockProps }>
					<div className="release-card__link">
						<RichText
							tagName="span"
							className="release-card__type"
							value={ documentType || '' }
							onChange={ ( v ) => setAttributes( { documentType: v } ) }
							allowedFormats={ [] }
							placeholder={ __( 'DOC', 'bozzies' ) }
						/>
						<RichText
							tagName="h3"
							className="release-card__title"
							value={ title || '' }
							onChange={ ( v ) => setAttributes( { title: v } ) }
							allowedFormats={ [] }
							placeholder={ __( 'Release title', 'bozzies' ) }
						/>
						<RichText
							tagName="p"
							className="release-card__date"
							value={ releaseDate || '' }
							onChange={ ( v ) => setAttributes( { releaseDate: v } ) }
							allowedFormats={ [] }
							placeholder={ __( 'Release date (optional)', 'bozzies' ) }
						/>
					</div>
				</div>
			</>
		);
	},
	// Server-rendered — attributes-only, no inner blocks.
	save: () => null,
} );
