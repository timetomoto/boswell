import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps, RichText, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import metadata from '../block.json';

// Static Astro-source arrow SVG. Rendered in the editor + PHP so both look
// identical. Verbatim from ~/boswell-poc/src/pages/sisters/index.astro L96 + L106.
function ArrowGlyph() {
	return (
		<svg width="20" height="10" viewBox="0 0 20 10" aria-hidden="true">
			<path d="M0 5 H17 M13 1 L17 5 L13 9" stroke="currentColor" strokeWidth="1" fill="none" />
		</svg>
	);
}

registerBlockType( metadata.name, {
	edit: ( { attributes, setAttributes } ) => {
		const { eyebrow, title, body, href, ctaLabel } = attributes;
		// Apply Astro's .subpage-card class on the wrapper so ported
		// cards.css styles the editor preview exactly like the front.
		const blockProps = useBlockProps( { className: 'subpage-card' } );

		return (
			<>
				<InspectorControls>
					<PanelBody title={ __( 'Card link', 'bozzies' ) } initialOpen>
						<TextControl
							label={ __( 'Link URL', 'bozzies' ) }
							value={ href || '' }
							onChange={ ( v ) => setAttributes( { href: v } ) }
							help={ __( 'Where the card links to, e.g. /sisters/bio-resources/', 'bozzies' ) }
							__nextHasNoMarginBottom
						/>
						<TextControl
							label={ __( 'Call-to-action label', 'bozzies' ) }
							value={ ctaLabel || '' }
							onChange={ ( v ) => setAttributes( { ctaLabel: v } ) }
							__nextHasNoMarginBottom
						/>
					</PanelBody>
				</InspectorControls>

				{ /* Non-anchor in the editor so RichText remains clickable. Front renders as <a>. */ }
				<div { ...blockProps }>
					<RichText
						tagName="span"
						className="eyebrow subpage-card__eyebrow"
						value={ eyebrow || '' }
						onChange={ ( v ) => setAttributes( { eyebrow: v } ) }
						allowedFormats={ [] }
						placeholder={ __( 'Eyebrow', 'bozzies' ) }
					/>
					<RichText
						tagName="h3"
						className="subpage-card__title"
						value={ title || '' }
						onChange={ ( v ) => setAttributes( { title: v } ) }
						allowedFormats={ [] }
						placeholder={ __( 'Card title', 'bozzies' ) }
					/>
					<RichText
						tagName="p"
						className="subpage-card__body"
						value={ body || '' }
						onChange={ ( v ) => setAttributes( { body: v } ) }
						allowedFormats={ [] }
						placeholder={ __( 'Card body copy', 'bozzies' ) }
					/>
					<span className="subpage-card__cta">
						{ ctaLabel || __( 'Explore', 'bozzies' ) }
						<ArrowGlyph />
					</span>
				</div>
			</>
		);
	},
	// Server-rendered — attributes-only, no inner blocks.
	save: () => null,
} );
