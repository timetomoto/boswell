import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps, RichText, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import metadata from '../block.json';

// Diamond-grid backdrop pattern, verbatim from
// ~/boswell-poc/src/components/MusicBackdrop.astro lines 82-95. Rendered
// in the editor + PHP so the preview matches the front.
function DiamondGridBackdrop() {
	return (
		<div
			className="music-backdrop"
			style={ {
				'--mb-opacity': 0.08,
				'--mb-color': 'var(--purple)',
				'--mb-top': '0px',
			} }
			aria-hidden="true"
		>
			<svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
				<defs>
					<pattern id="dg-donate" width="60" height="60" patternUnits="userSpaceOnUse">
						<g fill="none" stroke="var(--mb-color)" strokeWidth="0.6">
							<path d="M30 0 L60 30 L30 60 L0 30 Z" />
							<path d="M30 20 L40 30 L30 40 L20 30 Z" opacity="0.55" />
							<circle cx="30" cy="30" r="1.4" fill="var(--mb-color)" stroke="none" />
						</g>
					</pattern>
				</defs>
				<rect width="100%" height="100%" fill="url(#dg-donate)" />
			</svg>
		</div>
	);
}

registerBlockType( metadata.name, {
	edit: ( { attributes, setAttributes } ) => {
		const { eyebrow, title, body, href, ctaLabel } = attributes;
		const blockProps = useBlockProps( { className: 'section ground-gold donate-teaser' } );

		return (
			<>
				<InspectorControls>
					<PanelBody title={ __( 'Donate link', 'bozzies' ) } initialOpen>
						<TextControl
							label={ __( 'Donate URL', 'bozzies' ) }
							value={ href || '' }
							onChange={ ( v ) => setAttributes( { href: v } ) }
							help={ __( 'Where the Donate button links to. Leave empty until the owner supplies a URL — the button still renders but the link is inert.', 'bozzies' ) }
							__nextHasNoMarginBottom
						/>
					</PanelBody>
				</InspectorControls>

				<section { ...blockProps }>
					<DiamondGridBackdrop />
					<div className="container-narrow donate-teaser__inner">
						<RichText
							tagName="span"
							className="eyebrow eyebrow--purple"
							value={ eyebrow || '' }
							onChange={ ( v ) => setAttributes( { eyebrow: v } ) }
							allowedFormats={ [] }
							placeholder={ __( 'Eyebrow', 'bozzies' ) }
						/>
						<RichText
							tagName="h2"
							className="donate-teaser__title"
							value={ title || '' }
							onChange={ ( v ) => setAttributes( { title: v } ) }
							allowedFormats={ [] }
							placeholder={ __( 'Donate teaser title', 'bozzies' ) }
						/>
						<RichText
							tagName="p"
							className="donate-teaser__body"
							value={ body || '' }
							onChange={ ( v ) => setAttributes( { body: v } ) }
							allowedFormats={ [] }
							placeholder={ __( 'Donate teaser body copy', 'bozzies' ) }
						/>
						<RichText
							tagName="span"
							className="btn btn--purple"
							value={ ctaLabel || '' }
							onChange={ ( v ) => setAttributes( { ctaLabel: v } ) }
							allowedFormats={ [] }
							placeholder={ __( 'Donate', 'bozzies' ) }
						/>
					</div>
				</section>
			</>
		);
	},
	// Server-rendered — attributes-only, no inner blocks.
	save: () => null,
} );
