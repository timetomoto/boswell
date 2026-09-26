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
import { useSelect } from '@wordpress/data';

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
	} = attributes;

	const hasImage = !! ( backgroundImage && backgroundImage.url );
	const hasBackdrop = backdrop !== 'none';
	const isCustomBg = backgroundStyle === 'custom';

	const groundClass = isCustomBg ? 'ground-custom' : `ground-${ backgroundStyle }`;
	const backdropClass = hasBackdrop ? `has-backdrop-${ backdrop }` : '';
	const widthClass = `has-width-${ width }`;
	const headingWidthClass = `has-heading-width-${ headingWidth }`;
	const spacingClass = `has-spacing-${ spacing }`;
	const heroClass = heroFrame ? 'has-hero-frame' : '';
	const imageClass = hasImage ? 'has-bg-image' : '';
	const grayscaleClass = hasImage && imageGrayscale ? 'has-image-grayscale' : '';
	const zoomClass = hasImage && imageZoom ? 'has-image-zoom' : '';

	// CSS custom properties passed as inline style so front + editor share source of truth.
	const inlineStyle = {};
	if ( isCustomBg && customBackground ) {
		inlineStyle[ '--bozzies-section-bg' ] = customBackground;
	}
	if ( hasBackdrop ) {
		const bd = backdropColor || BACKDROP_DEFAULT_COLOR[ backdrop ];
		inlineStyle[ '--backdrop-color' ] = bd;
	}
	if ( hasImage ) {
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
	]
		.filter( Boolean )
		.join( ' ' );

	const blockProps = useBlockProps( {
		className: wrapperClasses,
		style: inlineStyle,
	} );

	// Contrast + AA warning.
	const bg = resolvedGroundBg( attributes );
	const text = resolvedTextColor( attributes );
	const groundContrast = contrastRatio( bg, text );
	const overlayEffectiveBg = hasImage
		? mixOverAlpha( overlayColor, '#808080', overlayStrength / 100 )
		: null;
	const overlayContrast = overlayEffectiveBg ? contrastRatio( overlayEffectiveBg, text ) : null;
	const overlayBelowAA = hasImage && overlayContrast !== null && overlayContrast < 4.5;

	// InnerBlocks setup — no fixed template, let variations supply it.
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
										'Overlay is too light for AA text contrast on the darkest images. Raise the strength or pick a darker overlay.',
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

				<PanelBody title={ __( 'Hero options', 'bozzies' ) } initialOpen={ false }>
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
		</>
	);
}
