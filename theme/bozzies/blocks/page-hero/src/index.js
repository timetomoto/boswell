import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps, RichText, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import metadata from '../block.json';

registerBlockType( metadata.name, {
	edit: ( { attributes, setAttributes } ) => {
		const { backHref, backLabel, eyebrow, title, subtitle } = attributes;
		const blockProps = useBlockProps( { className: 'page-hero ground-purple' } );

		return (
			<>
				<InspectorControls>
					<PanelBody title={ __( 'Back link', 'bozzies' ) } initialOpen>
						<TextControl
							label={ __( 'Back link URL', 'bozzies' ) }
							value={ backHref || '' }
							onChange={ ( v ) => setAttributes( { backHref: v } ) }
							__nextHasNoMarginBottom
						/>
						<TextControl
							label={ __( 'Back link label', 'bozzies' ) }
							value={ backLabel || '' }
							onChange={ ( v ) => setAttributes( { backLabel: v } ) }
							help={ __( 'Rendered as “← <label>”.', 'bozzies' ) }
							__nextHasNoMarginBottom
						/>
					</PanelBody>
				</InspectorControls>

				<section { ...blockProps }>
					<div className="container-narrow page-hero__inner">
						<a href={ backHref || '#' } className="page-hero__back">
							← { backLabel || __( 'Back', 'bozzies' ) }
						</a>
						<RichText
							tagName="span"
							className="eyebrow page-hero__eyebrow"
							value={ eyebrow || '' }
							onChange={ ( v ) => setAttributes( { eyebrow: v } ) }
							allowedFormats={ [] }
							placeholder={ __( 'Eyebrow', 'bozzies' ) }
						/>
						<RichText
							tagName="h1"
							className="page-hero__title"
							value={ title || '' }
							onChange={ ( v ) => setAttributes( { title: v } ) }
							allowedFormats={ [] }
							placeholder={ __( 'Page title', 'bozzies' ) }
						/>
						<RichText
							tagName="p"
							className="page-hero__subtitle"
							value={ subtitle || '' }
							onChange={ ( v ) => setAttributes( { subtitle: v } ) }
							allowedFormats={ [] }
							placeholder={ __( 'Subtitle', 'bozzies' ) }
						/>
					</div>
				</section>
			</>
		);
	},
	// Server-rendered — attributes-only, no inner blocks.
	save: () => null,
} );
