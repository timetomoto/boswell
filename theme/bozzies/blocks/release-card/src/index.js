import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps, RichText, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import metadata from '../block.json';

registerBlockType( metadata.name, {
	edit: ( { attributes, setAttributes } ) => {
		const { documentType, title, releaseDate, href } = attributes;
		// Apply Astro's .release-card class (on <li> in the front, on a div
		// here so RichText remains clickable in the editor).
		const blockProps = useBlockProps( { className: 'release-card' } );

		return (
			<>
				<InspectorControls>
					<PanelBody title={ __( 'Card link', 'bozzies' ) } initialOpen>
						<TextControl
							label={ __( 'PDF or document URL', 'bozzies' ) }
							value={ href || '' }
							onChange={ ( v ) => setAttributes( { href: v } ) }
							help={ __( 'Where the card links to. Opens in a new tab.', 'bozzies' ) }
							__nextHasNoMarginBottom
						/>
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
