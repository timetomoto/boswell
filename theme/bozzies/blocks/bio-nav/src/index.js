import { registerBlockType } from '@wordpress/blocks';
import {
	useBlockProps,
	RichText,
	InspectorControls,
} from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import metadata from '../block.json';

registerBlockType( metadata.name, {
	edit: ( { attributes, setAttributes } ) => {
		const {
			prevHref,
			prevLabel,
			prevName,
			allHref,
			allLabel,
			allName,
			nextHref,
			nextLabel,
			nextName,
			ariaLabel,
		} = attributes;

		const blockProps = useBlockProps( { className: 'section-tight ground-paper bio-nav' } );

		return (
			<>
				<InspectorControls>
					<PanelBody title={ __( 'Previous', 'bozzies' ) } initialOpen>
						<TextControl
							label={ __( 'Destination', 'bozzies' ) }
							value={ prevHref || '' }
							onChange={ ( v ) => setAttributes( { prevHref: v } ) }
							help={ __( 'Relative URL, e.g. /sisters/martha/', 'bozzies' ) }
							__nextHasNoMarginBottom
						/>
					</PanelBody>
					<PanelBody title={ __( 'All', 'bozzies' ) } initialOpen={ false }>
						<TextControl
							label={ __( 'Destination', 'bozzies' ) }
							value={ allHref || '' }
							onChange={ ( v ) => setAttributes( { allHref: v } ) }
							__nextHasNoMarginBottom
						/>
					</PanelBody>
					<PanelBody title={ __( 'Next', 'bozzies' ) } initialOpen={ false }>
						<TextControl
							label={ __( 'Destination', 'bozzies' ) }
							value={ nextHref || '' }
							onChange={ ( v ) => setAttributes( { nextHref: v } ) }
							help={ __( 'Relative URL, e.g. /sisters/connee/', 'bozzies' ) }
							__nextHasNoMarginBottom
						/>
					</PanelBody>
					<PanelBody title={ __( 'Accessibility', 'bozzies' ) } initialOpen={ false }>
						<TextControl
							label={ __( 'ARIA label', 'bozzies' ) }
							value={ ariaLabel || '' }
							onChange={ ( v ) => setAttributes( { ariaLabel: v } ) }
							__nextHasNoMarginBottom
						/>
					</PanelBody>
				</InspectorControls>

				<nav { ...blockProps } aria-label={ ariaLabel || 'Sisters navigation' }>
					<div className="container bio-nav__inner">
						<span className="bio-nav__link bio-nav__link--prev">
							<RichText
								tagName="span"
								className="bio-nav__label"
								value={ prevLabel || '' }
								onChange={ ( v ) => setAttributes( { prevLabel: v } ) }
								allowedFormats={ [] }
								placeholder={ __( 'Previous', 'bozzies' ) }
							/>
							<RichText
								tagName="span"
								className="bio-nav__name"
								value={ prevName || '' }
								onChange={ ( v ) => setAttributes( { prevName: v } ) }
								allowedFormats={ [] }
								placeholder={ __( 'Previous sister name', 'bozzies' ) }
							/>
						</span>
						<span className="bio-nav__link bio-nav__link--all">
							<RichText
								tagName="span"
								className="bio-nav__label"
								value={ allLabel || '' }
								onChange={ ( v ) => setAttributes( { allLabel: v } ) }
								allowedFormats={ [] }
								placeholder={ __( 'All', 'bozzies' ) }
							/>
							<RichText
								tagName="span"
								className="bio-nav__name"
								value={ allName || '' }
								onChange={ ( v ) => setAttributes( { allName: v } ) }
								allowedFormats={ [] }
								placeholder={ __( 'The Sisters', 'bozzies' ) }
							/>
						</span>
						<span className="bio-nav__link bio-nav__link--next">
							<RichText
								tagName="span"
								className="bio-nav__label"
								value={ nextLabel || '' }
								onChange={ ( v ) => setAttributes( { nextLabel: v } ) }
								allowedFormats={ [] }
								placeholder={ __( 'Next', 'bozzies' ) }
							/>
							<RichText
								tagName="span"
								className="bio-nav__name"
								value={ nextName || '' }
								onChange={ ( v ) => setAttributes( { nextName: v } ) }
								allowedFormats={ [] }
								placeholder={ __( 'Next sister name', 'bozzies' ) }
							/>
						</span>
					</div>
				</nav>
			</>
		);
	},
	// Server-rendered — attributes-only, no inner blocks.
	save: () => null,
} );
