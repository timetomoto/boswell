import { registerBlockType } from '@wordpress/blocks';
import {
	useBlockProps,
	RichText,
	InspectorControls,
	MediaUpload,
	MediaUploadCheck,
} from '@wordpress/block-editor';
import {
	PanelBody,
	TextControl,
	TextareaControl,
	SelectControl,
	Button,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import metadata from '../block.json';

// Four corner brackets — verbatim from
// ~/boswell-poc/src/components/Hero.astro L36-39 (split branch).
function CornerBrackets() {
	return (
		<div className="hero__frame" aria-hidden="true">
			<svg className="hero__frame-corner hero__frame-corner--tl" viewBox="0 0 60 60">
				<g fill="none" stroke="currentColor" strokeWidth="1">
					<path d="M0 22 L0 0 L22 0" />
					<path d="M6 6 L6 16 M6 6 L16 6" opacity="0.55" />
				</g>
			</svg>
			<svg className="hero__frame-corner hero__frame-corner--tr" viewBox="0 0 60 60">
				<g fill="none" stroke="currentColor" strokeWidth="1">
					<path d="M38 0 L60 0 L60 22" />
					<path d="M54 6 L54 16 M54 6 L44 6" opacity="0.55" />
				</g>
			</svg>
			<svg className="hero__frame-corner hero__frame-corner--bl" viewBox="0 0 60 60">
				<g fill="none" stroke="currentColor" strokeWidth="1">
					<path d="M0 38 L0 60 L22 60" />
					<path d="M6 54 L6 44 M6 54 L16 54" opacity="0.55" />
				</g>
			</svg>
			<svg className="hero__frame-corner hero__frame-corner--br" viewBox="0 0 60 60">
				<g fill="none" stroke="currentColor" strokeWidth="1">
					<path d="M38 60 L60 60 L60 38" />
					<path d="M54 54 L54 44 M54 54 L44 54" opacity="0.55" />
				</g>
			</svg>
		</div>
	);
}

// Deco glyph under the title — verbatim from
// ~/boswell-poc/src/components/Hero.astro L48-58 (split branch).
function HeroGlyph() {
	return (
		<div className="hero__glyph" aria-hidden="true">
			<svg viewBox="0 0 80 20">
				<g fill="none" stroke="currentColor" strokeWidth="0.7">
					<path d="M0 10 L28 10" />
					<path d="M52 10 L80 10" />
					<g transform="translate(40 10)">
						<path d="M-6 0 L-2 -4 L2 0 L-2 4 Z" />
						<path d="M-10 0 L-6 -4 M6 4 L10 0" opacity="0.7" />
						<circle cx="0" cy="0" r="1.4" fill="currentColor" stroke="none" />
					</g>
				</g>
			</svg>
		</div>
	);
}

registerBlockType( metadata.name, {
	edit: ( { attributes, setAttributes } ) => {
		const {
			eyebrow,
			title,
			subtitle,
			tagline,
			image,
			imageAlt,
			imageCredit,
			height,
		} = attributes;

		const heightClass = [ 'tall', 'medium', 'short' ].includes( height )
			? height
			: 'tall';

		// The block editor wraps custom blocks in its own layout div; the
		// front render is a raw <section class="hero hero--split …">, so
		// mirror that here. `.hero--center` is Astro's default `align` prop.
		const blockProps = useBlockProps( {
			className: `hero hero--split hero--${ heightClass } hero--center`,
			'data-has-image': image && image.url ? 'true' : 'false',
		} );

		return (
			<>
				<InspectorControls>
					<PanelBody title={ __( 'Hero image', 'bozzies' ) } initialOpen>
						<MediaUploadCheck>
							<MediaUpload
								allowedTypes={ [ 'image' ] }
								value={ image ? image.id : 0 }
								onSelect={ ( media ) =>
									setAttributes( {
										image: {
											id: media.id,
											url: media.url,
											alt: media.alt || '',
										},
										imageAlt: media.alt || imageAlt || '',
									} )
								}
								render={ ( { open } ) => (
									<Button
										variant="secondary"
										onClick={ open }
										style={ { marginBottom: '8px' } }
									>
										{ image && image.url
											? __( 'Replace image', 'bozzies' )
											: __( 'Select image', 'bozzies' ) }
									</Button>
								) }
							/>
						</MediaUploadCheck>
						{ image && image.url && (
							<>
								<img
									src={ image.url }
									alt=""
									style={ { display: 'block', width: '100%', height: 'auto', marginBottom: '8px' } }
								/>
								<Button
									variant="link"
									isDestructive
									onClick={ () => setAttributes( { image: null } ) }
									style={ { marginBottom: '8px' } }
								>
									{ __( 'Remove image', 'bozzies' ) }
								</Button>
							</>
						) }
						<TextareaControl
							label={ __( 'Alt text', 'bozzies' ) }
							value={ imageAlt || '' }
							onChange={ ( v ) => setAttributes( { imageAlt: v } ) }
							help={ __( 'Describe the image for screen readers. Leave empty only for purely decorative images.', 'bozzies' ) }
							rows={ 2 }
							__nextHasNoMarginBottom
						/>
						<TextControl
							label={ __( 'Image credit', 'bozzies' ) }
							value={ imageCredit || '' }
							onChange={ ( v ) => setAttributes( { imageCredit: v } ) }
							help={ __( 'Small caption in the bottom-right corner of the image (e.g. "c. 1932"). Leave empty to hide.', 'bozzies' ) }
							__nextHasNoMarginBottom
						/>
					</PanelBody>
					<PanelBody title={ __( 'Height', 'bozzies' ) } initialOpen={ false }>
						<SelectControl
							label={ __( 'Hero height', 'bozzies' ) }
							value={ heightClass }
							options={ [
								{ label: __( 'Tall', 'bozzies' ), value: 'tall' },
								{ label: __( 'Medium', 'bozzies' ), value: 'medium' },
								{ label: __( 'Short', 'bozzies' ), value: 'short' },
							] }
							onChange={ ( v ) => setAttributes( { height: v } ) }
							__nextHasNoMarginBottom
						/>
					</PanelBody>
				</InspectorControls>

				<section { ...blockProps }>
					<div className="hero__split">
						<div className="hero__image-panel">
							{ image && image.url ? (
								<img
									className="hero__image hero__image--split"
									src={ image.url }
									alt={ imageAlt || '' }
									loading="eager"
								/>
							) : (
								<div
									style={ {
										width: '100%',
										height: '100%',
										minHeight: '360px',
										background: '#0f0d0c',
										color: '#a8a4a0',
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										fontFamily: 'sans-serif',
										fontSize: '0.875rem',
										textAlign: 'center',
										padding: '1rem',
									} }
								>
									{ __( 'Choose a hero image in the sidebar', 'bozzies' ) }
								</div>
							) }
							<div className="hero__tint hero__tint--gradient"></div>
							<CornerBrackets />
							{ imageCredit && (
								<p className="hero__credit hero__credit--split">
									<span>{ imageCredit }</span>
								</p>
							) }
						</div>
						<div className="hero__text-panel">
							<div className="hero__text-inner">
								<RichText
									tagName="span"
									className="eyebrow hero__eyebrow"
									value={ eyebrow || '' }
									onChange={ ( v ) => setAttributes( { eyebrow: v } ) }
									allowedFormats={ [] }
									placeholder={ __( 'Eyebrow (optional)', 'bozzies' ) }
								/>
								<RichText
									tagName="h1"
									className="hero__title hero__title--split"
									value={ title || '' }
									onChange={ ( v ) => setAttributes( { title: v } ) }
									allowedFormats={ [] }
									placeholder={ __( 'Hero title', 'bozzies' ) }
								/>
								<HeroGlyph />
								<RichText
									tagName="p"
									className="hero__subtitle hero__subtitle--split"
									value={ subtitle || '' }
									onChange={ ( v ) => setAttributes( { subtitle: v } ) }
									allowedFormats={ [] }
									placeholder={ __( 'Subtitle', 'bozzies' ) }
								/>
								<RichText
									tagName="p"
									className="hero__tagline"
									value={ tagline || '' }
									onChange={ ( v ) => setAttributes( { tagline: v } ) }
									allowedFormats={ [] }
									placeholder={ __( 'Tagline (optional)', 'bozzies' ) }
								/>
							</div>
						</div>
					</div>
				</section>
			</>
		);
	},
	// Server-rendered — attributes-only, no inner blocks.
	save: () => null,
} );
