import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps, RichText, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import metadata from '../block.json';

// Static play-circle SVG. Rendered in the editor + PHP so both look
// identical. Verbatim from ~/boswell-poc/src/pages/media/index.astro L85-88.
function PlayGlyph() {
	return (
		<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
			<circle cx="12" cy="12" r="11" fill="none" stroke="currentColor" strokeWidth="1" />
			<path d="M9 7 L17 12 L9 17 Z" fill="currentColor" />
		</svg>
	);
}

registerBlockType( metadata.name, {
	edit: ( { attributes, setAttributes } ) => {
		const { order, title, summary, href, ctaLabel } = attributes;
		const order2d = String( order || 1 ).padStart( 2, '0' );
		// The wrapping <li> so Astro's cards.css applies in the editor exactly
		// like on the front.
		const blockProps = useBlockProps( { className: 'lesson-card' } );

		return (
			<>
				<InspectorControls>
					<PanelBody title={ __( 'Lesson', 'bozzies' ) } initialOpen>
						<TextControl
							label={ __( 'Lesson order', 'bozzies' ) }
							type="number"
							value={ order || 1 }
							onChange={ ( v ) => setAttributes( { order: parseInt( v, 10 ) || 1 } ) }
							__nextHasNoMarginBottom
						/>
						<TextControl
							label={ __( 'Link URL', 'bozzies' ) }
							value={ href || '' }
							onChange={ ( v ) => setAttributes( { href: v } ) }
							help={ __( 'Where the card links to, e.g. /media/lessons/lesson-1/', 'bozzies' ) }
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
				<li { ...blockProps }>
					<div className="lesson-card__link">
						<div className="lesson-card__num">
							<span className="lesson-card__num-label">Lesson</span>
							<span className="lesson-card__num-value">{ order2d }</span>
						</div>
						<div className="lesson-card__body">
							<RichText
								tagName="h3"
								className="lesson-card__title"
								value={ title || '' }
								onChange={ ( v ) => setAttributes( { title: v } ) }
								allowedFormats={ [] }
								placeholder={ __( 'Lesson title', 'bozzies' ) }
							/>
							<RichText
								tagName="p"
								className="lesson-card__summary"
								value={ summary || '' }
								onChange={ ( v ) => setAttributes( { summary: v } ) }
								allowedFormats={ [] }
								placeholder={ __( 'Lesson summary', 'bozzies' ) }
							/>
						</div>
						<div className="lesson-card__cta">
							<PlayGlyph />
							<span>{ ctaLabel || __( 'Listen', 'bozzies' ) }</span>
						</div>
					</div>
				</li>
			</>
		);
	},
	// Server-rendered — attributes-only, no inner blocks.
	save: () => null,
} );
