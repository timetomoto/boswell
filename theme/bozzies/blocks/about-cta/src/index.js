import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps, RichText, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import metadata from '../block.json';

// Notes backdrop pattern, verbatim from
// ~/boswell-poc/src/components/MusicBackdrop.astro lines 279-313. Rendered
// in the editor + PHP so the preview matches the front.
function NotesBackdrop() {
	return (
		<div
			className="music-backdrop"
			style={ {
				'--mb-opacity': 0.1,
				'--mb-color': 'var(--purple)',
				'--mb-top': '0px',
			} }
			aria-hidden="true"
		>
			<svg viewBox="0 0 240 240" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
				<defs>
					<pattern id="notes-about" width="240" height="240" patternUnits="userSpaceOnUse">
						<g fill="var(--mb-color)" stroke="var(--mb-color)" strokeWidth="0.5">
							<g transform="translate(40 60)">
								<ellipse cx="0" cy="26" rx="6" ry="4.4" transform="rotate(-20 0 26)" />
								<line x1="5" y1="24" x2="5" y2="-8" strokeWidth="1" fill="none" />
								<path d="M5 -8 C 14 -4, 16 2, 13 12" strokeWidth="1" fill="none" />
							</g>
							<g transform="translate(140 40)">
								<ellipse cx="0" cy="30" rx="6" ry="4.4" transform="rotate(-20 0 30)" />
								<ellipse cx="26" cy="26" rx="6" ry="4.4" transform="rotate(-20 26 26)" />
								<line x1="5" y1="28" x2="5" y2="-4" strokeWidth="1" />
								<line x1="31" y1="24" x2="31" y2="-8" strokeWidth="1" />
								<line x1="4" y1="-4" x2="32" y2="-8" strokeWidth="2.2" />
							</g>
							<g transform="translate(60 150)">
								<ellipse cx="0" cy="24" rx="6" ry="4.4" transform="rotate(-20 0 24)" />
								<line x1="5" y1="22" x2="5" y2="-10" strokeWidth="1.2" />
							</g>
							<g transform="translate(180 130)" opacity="0.9">
								<path d="M0 40 C -8 30, -8 18, 0 12 C 8 6, 14 14, 10 22 C 6 30, -4 30, -4 22 C -4 12, 6 -6, 6 -14 C 6 -20, -2 -22, -6 -18"
									  fill="none" stroke="var(--mb-color)" strokeWidth="1.2" />
							</g>
						</g>
					</pattern>
				</defs>
				<rect width="100%" height="100%" fill="url(#notes-about)" />
			</svg>
		</div>
	);
}

registerBlockType( metadata.name, {
	edit: ( { attributes, setAttributes } ) => {
		const {
			eyebrow,
			title,
			body,
			contactHref,
			contactLabel,
			donateHref,
			donateLabel,
		} = attributes;
		const blockProps = useBlockProps( { className: 'section ground-gold about-cta' } );

		return (
			<>
				<InspectorControls>
					<PanelBody title={ __( 'Links', 'bozzies' ) } initialOpen>
						<TextControl
							label={ __( 'Contact URL', 'bozzies' ) }
							value={ contactHref || '' }
							onChange={ ( v ) => setAttributes( { contactHref: v } ) }
							help={ __( 'Where the outline Contact button links to. For a mailto address, prefix with `mailto:`.', 'bozzies' ) }
							__nextHasNoMarginBottom
						/>
						<TextControl
							label={ __( 'Donate URL', 'bozzies' ) }
							value={ donateHref || '' }
							onChange={ ( v ) => setAttributes( { donateHref: v } ) }
							help={ __( 'Where the filled Donate button links to. Opens in a new tab.', 'bozzies' ) }
							__nextHasNoMarginBottom
						/>
					</PanelBody>
				</InspectorControls>

				<section { ...blockProps }>
					<NotesBackdrop />
					<div className="container about-cta__inner">
						<header className="about-cta__head">
							<RichText
								tagName="span"
								className="eyebrow about-cta__eyebrow"
								value={ eyebrow || '' }
								onChange={ ( v ) => setAttributes( { eyebrow: v } ) }
								allowedFormats={ [] }
								placeholder={ __( 'Eyebrow', 'bozzies' ) }
							/>
							<RichText
								tagName="h2"
								className="about-cta__title"
								value={ title || '' }
								onChange={ ( v ) => setAttributes( { title: v } ) }
								allowedFormats={ [] }
								placeholder={ __( 'About CTA title', 'bozzies' ) }
							/>
							<RichText
								tagName="p"
								className="about-cta__body"
								value={ body || '' }
								onChange={ ( v ) => setAttributes( { body: v } ) }
								allowedFormats={ [] }
								placeholder={ __( 'About CTA body copy', 'bozzies' ) }
							/>
						</header>
						<div className="about-cta__actions">
							<RichText
								tagName="span"
								className="btn btn--outline"
								value={ contactLabel || '' }
								onChange={ ( v ) => setAttributes( { contactLabel: v } ) }
								allowedFormats={ [] }
								placeholder={ __( 'Contact', 'bozzies' ) }
							/>
							<RichText
								tagName="span"
								className="btn btn--gold"
								value={ donateLabel || '' }
								onChange={ ( v ) => setAttributes( { donateLabel: v } ) }
								allowedFormats={ [] }
								placeholder={ __( 'Donate', 'bozzies' ) }
							/>
						</div>
					</div>
				</section>
			</>
		);
	},
	// Server-rendered — attributes-only, no inner blocks.
	save: () => null,
} );
