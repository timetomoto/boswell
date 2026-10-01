import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps, RichText, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import metadata from '../block.json';

// Staves music-backdrop pattern, verbatim from
// ~/boswell-poc/src/components/MusicBackdrop.astro lines 250-277. Rendered
// in the editor + PHP so the preview matches the front.
function StavesBackdrop() {
	return (
		<div
			className="music-backdrop"
			style={ {
				'--mb-opacity': 0.06,
				'--mb-color': 'var(--purple)',
				'--mb-top': '0px',
			} }
			aria-hidden="true"
		>
			<svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
				<defs>
					<pattern id="staves-sample-editor" width="400" height="120" patternUnits="userSpaceOnUse">
						<g fill="none" stroke="var(--mb-color)" strokeWidth="0.5">
							<line x1="0" y1="10" x2="400" y2="10" />
							<line x1="0" y1="24" x2="400" y2="24" />
							<line x1="0" y1="38" x2="400" y2="38" />
							<line x1="0" y1="52" x2="400" y2="52" />
							<line x1="0" y1="66" x2="400" y2="66" />
						</g>
						<g fill="var(--mb-color)" stroke="var(--mb-color)" strokeWidth="0.4">
							<ellipse cx="60" cy="45" rx="5" ry="3.6" transform="rotate(-18 60 45)" />
							<line x1="64" y1="43" x2="64" y2="10" fill="none" />
							<ellipse cx="140" cy="31" rx="5" ry="3.6" transform="rotate(-18 140 31)" />
							<line x1="144" y1="29" x2="144" y2="0" fill="none" />
							<ellipse cx="220" cy="52" rx="5" ry="3.6" transform="rotate(-18 220 52)" />
							<line x1="224" y1="50" x2="224" y2="18" fill="none" />
							<ellipse cx="290" cy="38" rx="5" ry="3.6" transform="rotate(-18 290 38)" />
							<line x1="294" y1="36" x2="294" y2="4" fill="none" />
							<ellipse cx="350" cy="59" rx="5" ry="3.6" transform="rotate(-18 350 59)" />
							<line x1="354" y1="57" x2="354" y2="24" fill="none" />
						</g>
					</pattern>
				</defs>
				<rect width="100%" height="100%" fill="url(#staves-sample-editor)" />
			</svg>
		</div>
	);
}

// Play-circle SVG, verbatim from index.astro L89-92. Editor preview only.
function PlayCircle() {
	return (
		<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
			<circle cx="12" cy="12" r="11" fill="none" stroke="currentColor" strokeWidth="1.4" />
			<path d="M9 7 L17 12 L9 17 Z" fill="currentColor" />
		</svg>
	);
}

registerBlockType( metadata.name, {
	edit: ( { attributes, setAttributes } ) => {
		const { eyebrow, title, body, href, ctaLabel } = attributes;
		const blockProps = useBlockProps( { className: 'section ground-paper sample-section' } );

		return (
			<>
				<InspectorControls>
					<PanelBody title={ __( 'Lesson link', 'bozzies' ) } initialOpen>
						<TextControl
							label={ __( 'Lesson URL', 'bozzies' ) }
							value={ href || '' }
							onChange={ ( v ) => setAttributes( { href: v } ) }
							help={ __( 'Where the CTA button links to (usually /media/lessons/1/).', 'bozzies' ) }
							__nextHasNoMarginBottom
						/>
					</PanelBody>
				</InspectorControls>

				<section { ...blockProps }>
					<StavesBackdrop />
					<div className="container-narrow sample__inner">
						<RichText
							tagName="span"
							className="eyebrow eyebrow--purple"
							value={ eyebrow || '' }
							onChange={ ( v ) => setAttributes( { eyebrow: v } ) }
							allowedFormats={ [] }
							placeholder={ __( 'Eyebrow (optional)', 'bozzies' ) }
						/>
						<RichText
							tagName="h2"
							className="sample__title"
							value={ title || '' }
							onChange={ ( v ) => setAttributes( { title: v } ) }
							allowedFormats={ [] }
							placeholder={ __( 'Sample the Sound title', 'bozzies' ) }
						/>
						<RichText
							tagName="p"
							className="sample__body"
							value={ body || '' }
							onChange={ ( v ) => setAttributes( { body: v } ) }
							allowedFormats={ [] }
							placeholder={ __( 'Sample section body copy', 'bozzies' ) }
						/>
						<span className="sample__cta">
							<PlayCircle />
							<RichText
								tagName="span"
								value={ ctaLabel || '' }
								onChange={ ( v ) => setAttributes( { ctaLabel: v } ) }
								allowedFormats={ [] }
								placeholder={ __( 'Play Lesson 1', 'bozzies' ) }
							/>
						</span>
					</div>
				</section>
			</>
		);
	},
	// Server-rendered — attributes-only, no inner blocks.
	save: () => null,
} );
