import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps, RichText, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl, SelectControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import metadata from '../block.json';

const STAVES_SVG = (
	<svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
		<defs>
			<pattern id="staves" width="400" height="120" patternUnits="userSpaceOnUse">
				<g fill="none" stroke="var(--mb-color)" strokeWidth="0.5">
					<line x1="0" y1="10" x2="400" y2="10" />
					<line x1="0" y1="24" x2="400" y2="24" />
					<line x1="0" y1="38" x2="400" y2="38" />
					<line x1="0" y1="52" x2="400" y2="52" />
					<line x1="0" y1="66" x2="400" y2="66" />
				</g>
				<g fill="var(--mb-color)" stroke="var(--mb-color)" strokeWidth="0.4">
					<ellipse cx="60"  cy="45" rx="5" ry="3.6" transform="rotate(-18 60 45)" />
					<line x1="64"  y1="43" x2="64"  y2="10" fill="none" />
					<ellipse cx="140" cy="31" rx="5" ry="3.6" transform="rotate(-18 140 31)" />
					<line x1="144" y1="29" x2="144" y2="0"  fill="none" />
					<ellipse cx="220" cy="52" rx="5" ry="3.6" transform="rotate(-18 220 52)" />
					<line x1="224" y1="50" x2="224" y2="18" fill="none" />
					<ellipse cx="290" cy="38" rx="5" ry="3.6" transform="rotate(-18 290 38)" />
					<line x1="294" y1="36" x2="294" y2="4"  fill="none" />
					<ellipse cx="350" cy="59" rx="5" ry="3.6" transform="rotate(-18 350 59)" />
					<line x1="354" y1="57" x2="354" y2="24" fill="none" />
				</g>
			</pattern>
		</defs>
		<rect width="100%" height="100%" fill="url(#staves)" />
	</svg>
);

registerBlockType( metadata.name, {
	edit: ( { attributes, setAttributes } ) => {
		const { backHref, backLabel, eyebrow, title, subtitle, backdrop } = attributes;
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
					<PanelBody title={ __( 'Backdrop', 'bozzies' ) } initialOpen={ false }>
						<SelectControl
							label={ __( 'Music backdrop', 'bozzies' ) }
							value={ backdrop || 'none' }
							options={ [
								{ label: __( 'None', 'bozzies' ), value: 'none' },
								{ label: __( 'Staves', 'bozzies' ), value: 'staves' },
							] }
							onChange={ ( v ) => setAttributes( { backdrop: v } ) }
							__nextHasNoMarginBottom
						/>
					</PanelBody>
				</InspectorControls>

				<section { ...blockProps }>
					{ backdrop === 'staves' && (
						<div
							className="music-backdrop"
							style={ { '--mb-opacity': 0.07, '--mb-color': 'var(--yellow-soft)', '--mb-top': '0px' } }
							aria-hidden="true"
						>
							{ STAVES_SVG }
						</div>
					) }
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
