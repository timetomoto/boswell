import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	InspectorControls,
	InnerBlocks,
	MediaUpload,
	MediaUploadCheck,
	ColorPalette,
} from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	ToggleControl,
	RangeControl,
	FocalPointPicker,
	Button,
	Notice,
	BaseControl,
	__experimentalUnitControl as UnitControl, // eslint-disable-line
} from '@wordpress/components';
import { useSelect, useDispatch } from '@wordpress/data';
import { createBlock } from '@wordpress/blocks';

const GROUND_OPTIONS = [
	{ label: __( 'Paper', 'bozzies' ),        value: 'paper' },
	{ label: __( 'Ink', 'bozzies' ),          value: 'ink' },
	{ label: __( 'Purple', 'bozzies' ),       value: 'purple' },
	{ label: __( 'Gold', 'bozzies' ),         value: 'gold' },
	{ label: __( 'Custom colour', 'bozzies' ), value: 'custom' },
];

const BACKDROP_OPTIONS = [
	{ label: __( 'None', 'bozzies' ),         value: 'none' },
	{ label: __( 'Staves', 'bozzies' ),       value: 'staves' },
	{ label: __( 'Vinyl', 'bozzies' ),        value: 'vinyl' },
	{ label: __( 'Notes', 'bozzies' ),        value: 'notes' },
	{ label: __( 'Diamond grid', 'bozzies' ), value: 'diamond-grid' },
];

const WIDTH_OPTIONS = [
	{ label: __( 'Container (default)', 'bozzies' ), value: 'container' },
	{ label: __( 'Narrow', 'bozzies' ),              value: 'narrow' },
	{ label: __( 'Edge to edge', 'bozzies' ),        value: 'edge' },
];

const HEADING_WIDTH_OPTIONS = [
	{ label: __( 'Full container', 'bozzies' ), value: 'container' },
	{ label: __( 'Wide', 'bozzies' ),           value: 'wide' },
	{ label: __( 'Reading width (34ch)', 'bozzies' ), value: 'reading' },
];

const SPACING_OPTIONS = [
	{ label: __( 'Standard', 'bozzies' ), value: 'standard' },
	{ label: __( 'Compact', 'bozzies' ),  value: 'compact' },
	{ label: __( 'Spacious', 'bozzies' ), value: 'spacious' },
	{ label: __( 'None', 'bozzies' ),     value: 'none' },
];

const GROUND_TEXT = {
	paper: '#1E1B18',
	ink: '#EDE6D6',
	purple: '#F1E4C4',
	gold: '#181615',
};
const GROUND_BG = {
	paper: '#F4F0E8',
	ink: '#181615',
	purple: '#4A2E5A',
	gold: '#C99A2A',
};
const BACKDROP_DEFAULT_COLOR = {
	vinyl: '#4A2E5A',
	staves: '#4A2E5A',
	notes: '#E1C263',
	'diamond-grid': '#4A2E5A',
};

// Relative luminance per WCAG.
function relLum( hex ) {
	const h = hex.replace( '#', '' );
	if ( h.length !== 6 ) return 0.5;
	const [ r, g, b ] = [ 0, 2, 4 ].map( ( i ) => {
		const c = parseInt( h.slice( i, i + 2 ), 16 ) / 255;
		return c <= 0.03928 ? c / 12.92 : Math.pow( ( c + 0.055 ) / 1.055, 2.4 );
	} );
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrastRatio( a, b ) {
	const la = relLum( a );
	const lb = relLum( b );
	const [ hi, lo ] = la > lb ? [ la, lb ] : [ lb, la ];
	return ( hi + 0.05 ) / ( lo + 0.05 );
}
// Mix two hex colours by alpha (0-1) — a on top of b.
function mixOverAlpha( topHex, bottomHex, alpha ) {
	const parse = ( h ) => {
		const s = h.replace( '#', '' );
		return [ 0, 2, 4 ].map( ( i ) => parseInt( s.slice( i, i + 2 ), 16 ) );
	};
	const [ tr, tg, tb ] = parse( topHex );
	const [ br, bg, bb ] = parse( bottomHex );
	const mix = ( t, b ) => Math.round( t * alpha + b * ( 1 - alpha ) );
	const r = mix( tr, br );
	const g = mix( tg, bg );
	const b = mix( tb, bb );
	return `#${ [ r, g, b ].map( ( v ) => v.toString( 16 ).padStart( 2, '0' ) ).join( '' ) }`;
}

function resolvedGroundBg( attrs ) {
	if ( attrs.backgroundStyle === 'custom' && attrs.customBackground ) {
		return attrs.customBackground;
	}
	return GROUND_BG[ attrs.backgroundStyle ] || GROUND_BG.paper;
}
function resolvedTextColor( attrs ) {
	if ( attrs.backgroundStyle === 'custom' ) {
		const bg = attrs.customBackground || '#F4F0E8';
		return relLum( bg ) > 0.5 ? GROUND_TEXT.paper : GROUND_TEXT.ink;
	}
	return GROUND_TEXT[ attrs.backgroundStyle ] || GROUND_TEXT.paper;
}

// Astro's Hero.astro corner SVGs (unchanged).
const heroCornerPaths = {
	tl: [ 'M0 22 L0 0 L22 0', 'M6 6 L6 16 M6 6 L16 6' ],
	tr: [ 'M38 0 L60 0 L60 22', 'M54 6 L54 16 M54 6 L44 6' ],
	bl: [ 'M0 38 L0 60 L22 60', 'M6 54 L6 44 M6 54 L16 54' ],
	br: [ 'M38 60 L60 60 L60 38', 'M54 54 L54 44 M54 54 L44 54' ],
};
function HeroCorner( { variant } ) {
	const [ outline, inline ] = heroCornerPaths[ variant ];
	return (
		<svg
			className={ `hero__frame-corner hero__frame-corner--${ variant }` }
			viewBox="0 0 60 60"
		>
			<g fill="none" stroke="currentColor" strokeWidth="1">
				<path d={ outline } />
				<path d={ inline } opacity="0.55" />
			</g>
		</svg>
	);
}
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

// Attribute defaults set when the owner turns Photo hero on. Anything the
// owner already customised (e.g. a lighter overlay strength) is preserved —
// these only fire when a value hasn't been set to a non-default.
const HERO_PHOTO_ATTR_DEFAULTS = {
	backgroundStyle:  'ink',
	heroFrame:        true,
	imageGrayscale:   true,
	imageZoom:        true,
	spacing:          'spacious',
	width:            'container',
	headingWidth:     'container',
	overlayStrength:  55,
};

// Rewrite an existing paragraph/heading className to include the requested
// Astro hero class, preserving any classes the owner added (e.g. alignment).
function ensureClass( existing, needed ) {
	const have = ( existing || '' ).split( /\s+/ ).filter( Boolean );
	for ( const c of needed.split( /\s+/ ).filter( Boolean ) ) {
		if ( ! have.includes( c ) ) have.push( c );
	}
	return have.join( ' ' );
}

export default function Edit( { attributes, setAttributes, clientId } ) {
	const {
		backgroundStyle,
		customBackground,
		backgroundImage,
		backgroundFocalPoint,
		overlayColor,
		overlayStrength,
		backdrop,
		backdropColor,
		width,
		headingWidth,
		spacing,
		heroFrame,
		imageGrayscale,
		imageZoom,
		heroPhoto,
		className,
	} = attributes;

	const hasImage = !! ( backgroundImage && backgroundImage.url );
	const hasBackdrop = backdrop !== 'none';
	const isCustomBg = backgroundStyle === 'custom';

	// Photo hero is on when either the boolean attribute is true, or the
	// legacy `is-hero-photo` className is on the block (imported content).
	const isPhotoHero = !! heroPhoto || ( className || '' ).indexOf( 'is-hero-photo' ) !== -1;

	// Read innerBlocks + dispatchers for the pre-fill/annotate flow.
	const innerBlocks = useSelect(
		( select ) => select( 'core/block-editor' ).getBlocks( clientId ),
		[ clientId ]
	);
	const { replaceInnerBlocks, updateBlockAttributes } = useDispatch( 'core/block-editor' );

	const groundClass = isCustomBg ? 'ground-custom' : `ground-${ backgroundStyle }`;
	const backdropClass = hasBackdrop ? `has-backdrop-${ backdrop }` : '';
	const widthClass = `has-width-${ width }`;
	const headingWidthClass = `has-heading-width-${ headingWidth }`;
	const spacingClass = `has-spacing-${ spacing }`;
	const heroClass = heroFrame ? 'has-hero-frame' : '';
	const imageClass = hasImage ? 'has-bg-image' : '';
	const grayscaleClass = hasImage && imageGrayscale ? 'has-image-grayscale' : '';
	const zoomClass = hasImage && imageZoom ? 'has-image-zoom' : '';
	const heroPhotoOuter = isPhotoHero
		? 'is-hero-photo hero hero--full-bleed hero--medium hero--center'
		: '';

	// CSS custom properties passed as inline style so front + editor share source of truth.
	const inlineStyle = {};
	if ( isCustomBg && customBackground ) {
		inlineStyle[ '--bozzies-section-bg' ] = customBackground;
	}
	if ( hasBackdrop ) {
		const bd = backdropColor || BACKDROP_DEFAULT_COLOR[ backdrop ];
		inlineStyle[ '--backdrop-color' ] = bd;
	}
	if ( hasImage && ! isPhotoHero ) {
		inlineStyle[ '--bozzies-section-image' ] = `url("${ backgroundImage.url }")`;
		inlineStyle[ '--bozzies-section-focal' ] = `${ Math.round( ( backgroundFocalPoint.x ?? 0.5 ) * 100 ) }% ${ Math.round( ( backgroundFocalPoint.y ?? 0.5 ) * 100 ) }%`;
		inlineStyle[ '--bozzies-section-overlay' ] = overlayColor;
		inlineStyle[ '--bozzies-section-overlay-alpha' ] = String( overlayStrength / 100 );
	}

	const wrapperClasses = [
		'wp-block-bozzies-section',
		groundClass,
		backdropClass,
		widthClass,
		headingWidthClass,
		spacingClass,
		heroClass,
		imageClass,
		grayscaleClass,
		zoomClass,
		heroPhotoOuter,
	]
		.filter( Boolean )
		.join( ' ' );

	const blockProps = useBlockProps( {
		className: wrapperClasses,
		style: inlineStyle,
		'data-has-image': hasImage ? 'true' : 'false',
	} );

	// Contrast + AA warning.
	const bg = resolvedGroundBg( attributes );
	const text = resolvedTextColor( attributes );
	const groundContrast = contrastRatio( bg, text );
	const overlayEffectiveBg = hasImage
		? mixOverAlpha( overlayColor, '#FFFFFF', overlayStrength / 100 )
		: null;
	const overlayContrast = overlayEffectiveBg ? contrastRatio( overlayEffectiveBg, text ) : null;
	const overlayBelowAA = hasImage && overlayContrast !== null && overlayContrast < 4.5;

	const innerBlocksProps = {
		renderAppender: InnerBlocks.ButtonBlockAppender,
	};

	const onSelectImage = ( media ) => {
		setAttributes( {
			backgroundImage: media
				? { id: media.id, url: media.url, alt: media.alt || '' }
				: null,
		} );
	};

	// When the owner turns Photo hero ON:
	//   • Apply the sensible defaults (ink ground, corner brackets, grayscale,
	//     slow zoom, spacious spacing) — but only where the current value
	//     matches the block's own default, so custom values aren't clobbered.
	//   • If innerBlocks is empty, insert eyebrow/h1/subtitle placeholders
	//     already carrying Astro's class names.
	//   • If innerBlocks already contains typed content, re-class it in place:
	//     the first heading becomes an h1.hero__title (preserving text), the
	//     first paragraph after it becomes p.hero__subtitle. An existing
	//     is-style-eyebrow paragraph gets .eyebrow.hero__eyebrow.
	// Turning Photo hero OFF leaves inner blocks alone — classes are inert
	// without the outer .hero wrapper, and the owner can toggle back on
	// without losing anything.
	const onTogglePhotoHero = ( on ) => {
		if ( ! on ) {
			setAttributes( { heroPhoto: false } );
			return;
		}
		const patch = { heroPhoto: true };
		if ( backgroundStyle === 'paper' ) patch.backgroundStyle = HERO_PHOTO_ATTR_DEFAULTS.backgroundStyle;
		if ( heroFrame === false )         patch.heroFrame = true;
		if ( imageGrayscale === false )    patch.imageGrayscale = true;
		if ( imageZoom === false )         patch.imageZoom = true;
		if ( spacing === 'standard' )      patch.spacing = HERO_PHOTO_ATTR_DEFAULTS.spacing;
		if ( overlayStrength === 70 )      patch.overlayStrength = HERO_PHOTO_ATTR_DEFAULTS.overlayStrength;
		setAttributes( patch );

		if ( ! innerBlocks || innerBlocks.length === 0 ) {
			const eyebrow = createBlock( 'core/paragraph', {
				content:   __( 'Eyebrow', 'bozzies' ),
				className: 'eyebrow hero__eyebrow',
			} );
			const heading = createBlock( 'core/heading', {
				level:     1,
				content:   __( 'Page title', 'bozzies' ),
				className: 'hero__title',
			} );
			const subtitle = createBlock( 'core/paragraph', {
				content:   __( 'Subtitle', 'bozzies' ),
				className: 'hero__subtitle',
			} );
			replaceInnerBlocks( clientId, [ eyebrow, heading, subtitle ], false );
			return;
		}

		// Existing content — annotate in place.
		let heroTitleAssigned = false;
		let heroSubtitleAssigned = false;
		for ( const block of innerBlocks ) {
			if ( ! heroTitleAssigned && block.name === 'core/heading' ) {
				updateBlockAttributes( block.clientId, {
					level:     1,
					className: ensureClass( block.attributes.className, 'hero__title' ),
				} );
				heroTitleAssigned = true;
				continue;
			}
			if ( block.name === 'core/paragraph' ) {
				const hasEyebrowStyle = ( block.attributes.className || '' ).includes( 'is-style-eyebrow' );
				if ( hasEyebrowStyle ) {
					updateBlockAttributes( block.clientId, {
						className: ensureClass( block.attributes.className, 'eyebrow hero__eyebrow' ),
					} );
					continue;
				}
				if ( heroTitleAssigned && ! heroSubtitleAssigned ) {
					updateBlockAttributes( block.clientId, {
						className: ensureClass( block.attributes.className, 'hero__subtitle' ),
					} );
					heroSubtitleAssigned = true;
					continue;
				}
			}
		}
		// If the owner typed only paragraphs (no heading), promote the first
		// one to the title — Astro's hero always has an h1, and a paragraph-only
		// hero would render without a title.
		if ( ! heroTitleAssigned ) {
			const firstPara = innerBlocks.find( ( b ) => b.name === 'core/paragraph' );
			if ( firstPara ) {
				const replacementHeading = createBlock( 'core/heading', {
					level:     1,
					content:   firstPara.attributes.content || __( 'Page title', 'bozzies' ),
					className: ensureClass( firstPara.attributes.className, 'hero__title' ),
				} );
				const rest = innerBlocks.filter( ( b ) => b.clientId !== firstPara.clientId );
				replaceInnerBlocks( clientId, [ replacementHeading, ...rest ], false );
			}
		}
	};

	// --- Editor preview -------------------------------------------------
	// When Photo hero is ON, render Astro's exact DOM shape so the block
	// looks identical inside the editor iframe. When OFF, keep the original
	// __image / __overlay / __backdrop / __frame / __inner layers so
	// non-hero sections stay unchanged.
	const heroSection = (
		<section { ...blockProps }>
			{ hasImage && (
				<div className="hero__image-wrap" aria-hidden="true">
					<img
						className="hero__image"
						src={ backgroundImage.url }
						alt={ backgroundImage.alt || '' }
					/>
					<div className="hero__tint" />
					<div className="hero__scrim" />
				</div>
			) }
			<div className="hero__frame" aria-hidden="true">
				<HeroCorner variant="tl" />
				<HeroCorner variant="tr" />
				<HeroCorner variant="bl" />
				<HeroCorner variant="br" />
			</div>
			<div className="hero__content container">
				<InnerBlocks { ...innerBlocksProps } />
				<HeroGlyph />
			</div>
		</section>
	);

	const regularSection = (
		<section { ...blockProps }>
			{ hasImage && (
				<div className="wp-block-bozzies-section__image" aria-hidden="true" />
			) }
			{ hasImage && (
				<div className="wp-block-bozzies-section__overlay" aria-hidden="true" />
			) }
			{ hasBackdrop && (
				<div className="wp-block-bozzies-section__backdrop" aria-hidden="true" />
			) }
			{ heroFrame && (
				<div className="wp-block-bozzies-section__frame" aria-hidden="true" />
			) }
			<div className="wp-block-bozzies-section__inner">
				<InnerBlocks { ...innerBlocksProps } />
			</div>
		</section>
	);

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Background', 'bozzies' ) } initialOpen>
					<SelectControl
						label={ __( 'Ground', 'bozzies' ) }
						value={ backgroundStyle }
						options={ GROUND_OPTIONS }
						onChange={ ( value ) => setAttributes( { backgroundStyle: value } ) }
						__nextHasNoMarginBottom
					/>
					{ isCustomBg && (
						<BaseControl label={ __( 'Custom background colour', 'bozzies' ) } __nextHasNoMarginBottom>
							<ColorPalette
								value={ customBackground }
								onChange={ ( value ) => setAttributes( { customBackground: value || '' } ) }
								clearable
							/>
						</BaseControl>
					) }

					<hr />

					<BaseControl label={ __( 'Background image', 'bozzies' ) } __nextHasNoMarginBottom>
						<MediaUploadCheck>
							<MediaUpload
								onSelect={ onSelectImage }
								allowedTypes={ [ 'image' ] }
								value={ backgroundImage ? backgroundImage.id : 0 }
								render={ ( { open } ) => (
									<div style={ { display: 'flex', gap: '8px', alignItems: 'center' } }>
										<Button variant="secondary" onClick={ open }>
											{ hasImage ? __( 'Replace', 'bozzies' ) : __( 'Choose image', 'bozzies' ) }
										</Button>
										{ hasImage && (
											<Button variant="link" isDestructive onClick={ () => onSelectImage( null ) }>
												{ __( 'Remove', 'bozzies' ) }
											</Button>
										) }
									</div>
								) }
							/>
						</MediaUploadCheck>
					</BaseControl>

					{ hasImage && (
						<>
							<FocalPointPicker
								label={ __( 'Focal point', 'bozzies' ) }
								url={ backgroundImage.url }
								value={ backgroundFocalPoint }
								onChange={ ( value ) => setAttributes( { backgroundFocalPoint: value } ) }
								__nextHasNoMarginBottom
							/>
							<BaseControl label={ __( 'Overlay colour', 'bozzies' ) } __nextHasNoMarginBottom>
								<ColorPalette
									value={ overlayColor }
									onChange={ ( value ) => setAttributes( { overlayColor: value || '#181615' } ) }
									clearable={ false }
								/>
							</BaseControl>
							<RangeControl
								label={ __( 'Overlay strength', 'bozzies' ) }
								value={ overlayStrength }
								onChange={ ( value ) => setAttributes( { overlayStrength: value } ) }
								min={ 0 }
								max={ 100 }
								step={ 5 }
								__nextHasNoMarginBottom
							/>
							{ overlayBelowAA && (
								<Notice status="warning" isDismissible={ false }>
									{ __(
										'Overlay is too light for AA body-text contrast on a fully white photograph. Raise the strength or pick a darker overlay.',
										'bozzies'
									) }
								</Notice>
							) }
						</>
					) }
				</PanelBody>

				<PanelBody title={ __( 'Backdrop pattern', 'bozzies' ) } initialOpen={ false }>
					<SelectControl
						label={ __( 'Pattern', 'bozzies' ) }
						value={ backdrop }
						options={ BACKDROP_OPTIONS }
						onChange={ ( value ) => setAttributes( { backdrop: value } ) }
						__nextHasNoMarginBottom
					/>
					{ hasBackdrop && (
						<BaseControl label={ __( 'Backdrop colour', 'bozzies' ) } help={ __( 'Leave empty to use the Astro-matched default.', 'bozzies' ) } __nextHasNoMarginBottom>
							<ColorPalette
								value={ backdropColor }
								onChange={ ( value ) => setAttributes( { backdropColor: value || '' } ) }
								clearable
							/>
						</BaseControl>
					) }
				</PanelBody>

				<PanelBody title={ __( 'Width', 'bozzies' ) } initialOpen={ false }>
					<SelectControl
						label={ __( 'Content width', 'bozzies' ) }
						value={ width }
						options={ WIDTH_OPTIONS }
						onChange={ ( value ) => setAttributes( { width: value } ) }
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Heading width', 'bozzies' ) }
						value={ headingWidth }
						options={ HEADING_WIDTH_OPTIONS }
						onChange={ ( value ) => setAttributes( { headingWidth: value } ) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				<PanelBody title={ __( 'Spacing', 'bozzies' ) } initialOpen={ false }>
					<SelectControl
						label={ __( 'Vertical rhythm', 'bozzies' ) }
						value={ spacing }
						options={ SPACING_OPTIONS }
						onChange={ ( value ) => setAttributes( { spacing: value } ) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				<PanelBody title={ __( 'Hero options', 'bozzies' ) } initialOpen>
					<ToggleControl
						label={ __( 'Photo hero', 'bozzies' ) }
						help={ __(
							'Full-bleed hero with the picked image, purple wash, corner brackets and accent glyph. Adds an eyebrow, an h1 title, and a subtitle if the section is empty; adds hero classes to your existing heading and paragraph if it is not.',
							'bozzies'
						) }
						checked={ isPhotoHero }
						onChange={ onTogglePhotoHero }
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Corner brackets', 'bozzies' ) }
						checked={ heroFrame }
						onChange={ ( value ) => setAttributes( { heroFrame: value } ) }
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Image grayscale', 'bozzies' ) }
						checked={ imageGrayscale }
						onChange={ ( value ) => setAttributes( { imageGrayscale: value } ) }
						disabled={ ! hasImage }
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Slow zoom', 'bozzies' ) }
						help={ __( 'Suppressed under prefers-reduced-motion.', 'bozzies' ) }
						checked={ imageZoom }
						onChange={ ( value ) => setAttributes( { imageZoom: value } ) }
						disabled={ ! hasImage }
						__nextHasNoMarginBottom
					/>
				</PanelBody>
			</InspectorControls>

			{ isPhotoHero ? heroSection : regularSection }
		</>
	);
}
