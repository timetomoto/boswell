import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps, RichText, InspectorControls, PlainText } from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import metadata from '../block.json';

// Static Astro-source arrow SVG. Rendered in the editor + PHP so both look
// identical. Verbatim from ~/boswell-poc/src/pages/sisters/index.astro L64-66.
function ArrowGlyph() {
	return (
		<svg width="20" height="10" viewBox="0 0 20 10" aria-hidden="true">
			<path d="M0 5 H17 M13 1 L17 5 L13 9" stroke="currentColor" strokeWidth="1" fill="none" />
		</svg>
	);
}

registerBlockType( metadata.name, {
	edit: ( { attributes, setAttributes } ) => {
		const { order, nickname, name, quote, href, ctaLabel } = attributes;
		// Apply Astro's .sister-card class on the <li> so ported cards.css
		// styles the editor preview exactly like the front.
		const blockProps = useBlockProps( { className: 'sister-card' } );

		return (
			<>
				<InspectorControls>
					<PanelBody title={ __( 'Card link', 'bozzies' ) } initialOpen>
						<TextControl
							label={ __( 'Link URL', 'bozzies' ) }
							value={ href || '' }
							onChange={ ( v ) => setAttributes( { href: v } ) }
							help={ __( 'Where the card links to, e.g. /sisters/martha/', 'bozzies' ) }
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

				<li { ...blockProps }>
					{ /* Non-anchor in the editor so RichText remains clickable. Front renders as <a>. */ }
					<div className="sister-card__link">
						<div className="sister-card__meta">
							<PlainText
								tagName="span"
								className="sister-card__order"
								value={ order || '' }
								onChange={ ( v ) => setAttributes( { order: v } ) }
								placeholder={ __( '01', 'bozzies' ) }
							/>
							<RichText
								tagName="span"
								className="sister-card__nickname"
								value={ nickname || '' }
								onChange={ ( v ) => setAttributes( { nickname: v } ) }
								allowedFormats={ [] }
								placeholder={ __( 'Nickname', 'bozzies' ) }
							/>
						</div>
						<RichText
							tagName="h3"
							className="sister-card__name"
							value={ name || '' }
							onChange={ ( v ) => setAttributes( { name: v } ) }
							allowedFormats={ [] }
							placeholder={ __( 'Sister name', 'bozzies' ) }
						/>
						<RichText
							tagName="blockquote"
							className="sister-card__quote"
							value={ quote || '' }
							onChange={ ( v ) => setAttributes( { quote: v } ) }
							allowedFormats={ [] }
							placeholder={ __( 'Pull quote (optional)', 'bozzies' ) }
						/>
						<span className="sister-card__cta">
							{ ctaLabel || __( 'Read the bio', 'bozzies' ) }
							<ArrowGlyph />
						</span>
					</div>
				</li>
			</>
		);
	},
	// Server-rendered — attributes-only, no inner blocks.
	save: () => null,
} );
