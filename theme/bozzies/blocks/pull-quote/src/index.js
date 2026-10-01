import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps, RichText, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, SelectControl, TextControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import metadata from '../block.json';

// Notes music-backdrop pattern, verbatim from
// ~/boswell-poc/src/components/MusicBackdrop.astro lines 279-313. Only
// rendered when the block's `backdrop` attr is `'notes'`.
function NotesBackdrop() {
	return (
		<div
			className="music-backdrop"
			style={ {
				'--mb-opacity': 0.1,
				'--mb-color': 'var(--yellow-soft)',
				'--mb-top': '0px',
			} }
			aria-hidden="true"
		>
			<svg viewBox="0 0 240 240" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
				<defs>
					<pattern id="notes-pq-editor" width="240" height="240" patternUnits="userSpaceOnUse">
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
				<rect width="100%" height="100%" fill="url(#notes-pq-editor)" />
			</svg>
		</div>
	);
}

registerBlockType( metadata.name, {
	edit: ( { attributes, setAttributes } ) => {
		const { quote, attribution, backdrop } = attributes;
		const blockProps = useBlockProps( { className: 'section ground-purple' } );
		return (
			<>
				<InspectorControls>
					<PanelBody title={ __( 'Pull quote', 'bozzies' ) } initialOpen>
						<SelectControl
							label={ __( 'Music backdrop', 'bozzies' ) }
							value={ backdrop || 'none' }
							options={ [
								{ label: __( 'None', 'bozzies' ), value: 'none' },
								{ label: __( 'Notes', 'bozzies' ), value: 'notes' },
							] }
							onChange={ ( v ) => setAttributes( { backdrop: v } ) }
							help={ __( 'The notes pattern is used on the sisters hub only; leave "None" elsewhere.', 'bozzies' ) }
							__nextHasNoMarginBottom
						/>
						<TextControl
							label={ __( 'Attribution', 'bozzies' ) }
							value={ attribution || '' }
							onChange={ ( v ) => setAttributes( { attribution: v } ) }
							help={ __( 'The name (and optional publication) after the em-dash. Leave empty to omit the caption.', 'bozzies' ) }
							__nextHasNoMarginBottom
						/>
					</PanelBody>
				</InspectorControls>

				<section { ...blockProps }>
					{ backdrop === 'notes' && <NotesBackdrop /> }
					<div className="container">
						<figure className="pull-quote">
							<RichText
								tagName="blockquote"
								className="pull-quote__quote"
								value={ quote || '' }
								onChange={ ( v ) => setAttributes( { quote: v } ) }
								allowedFormats={ [] }
								placeholder={ __( 'Pull quote text', 'bozzies' ) }
							/>
							{ attribution && (
								<figcaption className="pull-quote__attr">
									{ '— ' + attribution }
								</figcaption>
							) }
						</figure>
					</div>
				</section>
			</>
		);
	},
	// Server-rendered — attributes-only, no inner blocks.
	save: () => null,
} );
