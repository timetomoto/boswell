import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps, InspectorControls, RichText } from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import metadata from '../block.json';

// Verbatim editor preview of Astro's Nav.astro DOM. The nav items themselves
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
			markLine1,
			markLine2,
			markHref,
			markAriaLabel,
			donateLabel,
			donateHref,
			navRef,
		} = attributes;

		const blockProps = useBlockProps( { className: 'site-nav' } );

		return (
			<>
				<InspectorControls>
					<PanelBody title={ __( 'Wordmark link', 'bozzies' ) } initialOpen={ true }>
						<TextControl
							label={ __( 'Wordmark href', 'bozzies' ) }
							value={ markHref || '/' }
							onChange={ ( v ) => setAttributes( { markHref: v } ) }
							__nextHasNoMarginBottom
						/>
						<TextControl
							label={ __( 'Wordmark aria-label', 'bozzies' ) }
							value={ markAriaLabel || '' }
							onChange={ ( v ) => setAttributes( { markAriaLabel: v } ) }
							help={ __( 'Announced to screen readers.', 'bozzies' ) }
							__nextHasNoMarginBottom
						/>
					</PanelBody>
					<PanelBody title={ __( 'Donate button', 'bozzies' ) } initialOpen={ false }>
						<p style={ { margin: '0 0 8px' } }>
							{ __( 'The header donate URL comes from the site-wide setting so it can be changed by the Editor role.', 'bozzies' ) }
						</p>
						<p style={ { margin: '0 0 12px' } }>
							<a href="/wp-admin/admin.php?page=bozzies-settings" target="_blank" rel="noopener">
								{ __( 'Open Bozzies → Donate URL', 'bozzies' ) }
							</a>
						</p>
						<TextControl
							label={ __( 'Donate label', 'bozzies' ) }
							value={ donateLabel || '' }
							onChange={ ( v ) => setAttributes( { donateLabel: v } ) }
							help={ __( 'The button text — e.g. "Donate", "Give", "Support the archive".', 'bozzies' ) }
							__nextHasNoMarginBottom
						/>
					</PanelBody>
					<PanelBody title={ __( 'Primary nav menu', 'bozzies' ) } initialOpen={ false }>
						<TextControl
							label={ __( 'Navigation menu post ID', 'bozzies' ) }
							type="number"
							value={ String( navRef || '' ) }
							onChange={ ( v ) => setAttributes( { navRef: v ? parseInt( v, 10 ) : 0 } ) }
							help={ __( 'The wp:navigation post whose links appear here. Edit menu items in the WordPress Navigation editor.', 'bozzies' ) }
							__nextHasNoMarginBottom
						/>
					</PanelBody>
				</InspectorControls>

				<header { ...blockProps }>
					<div className="site-nav__inner container">
						<a className="site-nav__mark" href={ markHref || '/' } aria-label={ markAriaLabel }>
							<RichText
								tagName="span"
								className="site-nav__mark-line-1"
								value={ markLine1 }
								onChange={ ( v ) => setAttributes( { markLine1: v } ) }
								placeholder={ __( 'Site title…', 'bozzies' ) }
								allowedFormats={ [] }
							/>
							<RichText
								tagName="span"
								className="site-nav__mark-line-2"
								value={ markLine2 }
								onChange={ ( v ) => setAttributes( { markLine2: v } ) }
								placeholder={ __( 'Sub-line…', 'bozzies' ) }
								allowedFormats={ [] }
							/>
						</a>
						<nav aria-label={ __( 'Primary', 'bozzies' ) }>
							<ul className="site-nav__list" role="list">
								{ PREVIEW_ITEMS.map( ( item ) => (
									<li key={ item.href }>
										<a href={ item.href } className="site-nav__link">{ item.label }</a>
									</li>
								) ) }
								<li>
									<RichText
										tagName="a"
										href={ donateHref || '#' }
										className="site-nav__donate"
										value={ donateLabel }
										onChange={ ( v ) => setAttributes( { donateLabel: v } ) }
										placeholder={ __( 'Donate', 'bozzies' ) }
										allowedFormats={ [] }
									/>
								</li>
							</ul>
						</nav>
					</div>
				</header>
			</>
		);
	},
	// Server-rendered — attributes-only, no inner blocks.
	save: () => null,
} );
