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
			nickname,
			name,
			pullQuote,
			pullQuoteAttribution,
			backHref,
			backLabel,
		} = attributes;

		// Match Astro's outer <section class="bio-hero ground-purple"> so the
		// editor preview uses the same ported CSS as the front.
		const blockProps = useBlockProps( { className: 'bio-hero ground-purple' } );

		return (
			<>
				<InspectorControls>
					<PanelBody title={ __( 'Back link', 'bozzies' ) } initialOpen>
						<TextControl
							label={ __( 'Label', 'bozzies' ) }
							value={ backLabel || '' }
							onChange={ ( v ) => setAttributes( { backLabel: v } ) }
							__nextHasNoMarginBottom
						/>
						<TextControl
							label={ __( 'Destination', 'bozzies' ) }
							value={ backHref || '' }
							onChange={ ( v ) => setAttributes( { backHref: v } ) }
							help={ __( 'Relative URL, e.g. /sisters/', 'bozzies' ) }
							__nextHasNoMarginBottom
						/>
					</PanelBody>
				</InspectorControls>

				<section { ...blockProps }>
					<div className="container-narrow bio-hero__inner">
						<span className="bio-hero__back" aria-hidden="true">
							{ '← ' + ( backLabel || 'The Sisters' ) }
						</span>
						<RichText
							tagName="span"
							className="eyebrow bio-hero__eyebrow"
							value={ nickname || '' }
							onChange={ ( v ) => setAttributes( { nickname: v } ) }
							allowedFormats={ [] }
							placeholder={ __( 'Nickname (e.g. MBoz)', 'bozzies' ) }
						/>
						<RichText
							tagName="h1"
							className="bio-hero__name"
							value={ name || '' }
							onChange={ ( v ) => setAttributes( { name: v } ) }
							allowedFormats={ [] }
							placeholder={ __( 'Sister name', 'bozzies' ) }
						/>
						<blockquote className="bio-hero__quote">
							<span aria-hidden="true">&quot;</span>
							<RichText
								tagName="span"
								value={ pullQuote || '' }
								onChange={ ( v ) => setAttributes( { pullQuote: v } ) }
								allowedFormats={ [ 'core/italic', 'core/bold' ] }
								placeholder={ __( 'Pull-quote body', 'bozzies' ) }
							/>
							<span aria-hidden="true">&quot;</span>
							<RichText
								tagName="cite"
								value={ pullQuoteAttribution || '' }
								onChange={ ( v ) => setAttributes( { pullQuoteAttribution: v } ) }
								allowedFormats={ [] }
								placeholder={ __( '— Attribution', 'bozzies' ) }
							/>
						</blockquote>
					</div>
				</section>
			</>
		);
	},
	// Server-rendered — attributes-only, no inner blocks.
	save: () => null,
} );
