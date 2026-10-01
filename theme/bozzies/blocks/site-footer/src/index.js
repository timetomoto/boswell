import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps, InspectorControls, RichText } from '@wordpress/block-editor';
import { PanelBody, TextControl, TextareaControl, ToggleControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import metadata from '../block.json';

// Verbatim editor preview of Astro's Footer.astro DOM. The nav items themselves
// come from the WP navigation menu (post navRef) at render time on the front;
// in the editor we show a static preview of the primary items so the owner
// sees the shape without a live parse of the nav menu.
const PREVIEW_ITEMS = [
	{ label: 'The Sisters', href: '/sisters/' },
	{ label: 'Press', href: '/press/' },
	{ label: 'Media', href: '/media/' },
	{ label: 'About', href: '/about/' },
];

registerBlockType( metadata.name, {
	edit: ( { attributes, setAttributes } ) => {
		const {
			siteName,
			tagline,
			footerCredits,
			showCookieButton,
			navRef,
		} = attributes;

		const year = new Date().getFullYear();
		const blockProps = useBlockProps( { className: 'site-footer ground-purple' } );

		return (
			<>
				<InspectorControls>
					<PanelBody title={ __( 'Wordmark', 'bozzies' ) } initialOpen={ true }>
						<TextControl
							label={ __( 'Site name', 'bozzies' ) }
							value={ siteName || '' }
							onChange={ ( v ) => setAttributes( { siteName: v } ) }
							__nextHasNoMarginBottom
						/>
						<TextareaControl
							label={ __( 'Tagline', 'bozzies' ) }
							value={ tagline || '' }
							onChange={ ( v ) => setAttributes( { tagline: v } ) }
							__nextHasNoMarginBottom
						/>
					</PanelBody>
					<PanelBody title={ __( 'Meta / credits', 'bozzies' ) } initialOpen={ false }>
						<TextareaControl
							label={ __( 'Credits paragraph', 'bozzies' ) }
							value={ footerCredits || '' }
							onChange={ ( v ) => setAttributes( { footerCredits: v } ) }
							help={ __( 'Appears above the © line.', 'bozzies' ) }
							__nextHasNoMarginBottom
						/>
						<ToggleControl
							label={ __( 'Show cookie-settings button', 'bozzies' ) }
							checked={ !! showCookieButton }
							onChange={ ( v ) => setAttributes( { showCookieButton: !! v } ) }
							help={ __( 'Reveals a hidden button that the cookie-consent script un-hides after the banner is dismissed.', 'bozzies' ) }
							__nextHasNoMarginBottom
						/>
					</PanelBody>
					<PanelBody title={ __( 'Footer nav menu', 'bozzies' ) } initialOpen={ false }>
						<TextControl
							label={ __( 'Navigation menu post ID', 'bozzies' ) }
							type="number"
							value={ String( navRef || '' ) }
							onChange={ ( v ) => setAttributes( { navRef: v ? parseInt( v, 10 ) : 0 } ) }
							help={ __( 'The wp:navigation post whose links appear here. Defaults to the primary menu so header + footer share one menu.', 'bozzies' ) }
							__nextHasNoMarginBottom
						/>
					</PanelBody>
				</InspectorControls>

				<footer { ...blockProps }>
					<div className="container site-footer__inner">
						<div className="site-footer__mark">
							<RichText
								tagName="p"
								className="site-footer__wordmark"
								value={ siteName }
								onChange={ ( v ) => setAttributes( { siteName: v } ) }
								placeholder={ __( 'Site name…', 'bozzies' ) }
								allowedFormats={ [] }
							/>
							<RichText
								tagName="p"
								className="site-footer__tagline"
								value={ tagline }
								onChange={ ( v ) => setAttributes( { tagline: v } ) }
								placeholder={ __( 'Tagline…', 'bozzies' ) }
								allowedFormats={ [] }
							/>
						</div>
						<nav aria-label={ __( 'Footer', 'bozzies' ) } className="site-footer__nav">
							<ul role="list">
								{ PREVIEW_ITEMS.map( ( item ) => (
									<li key={ item.href }>
										<a href={ item.href }>{ item.label }</a>
									</li>
								) ) }
							</ul>
						</nav>
						<div className="site-footer__meta">
							<RichText
								tagName="p"
								value={ footerCredits }
								onChange={ ( v ) => setAttributes( { footerCredits: v } ) }
								placeholder={ __( 'Footer credits…', 'bozzies' ) }
								allowedFormats={ [] }
							/>
							<p>&copy; { year }</p>
						</div>
					</div>
				</footer>
			</>
		);
	},
	// Server-rendered — attributes-only, no inner blocks.
	save: () => null,
} );
