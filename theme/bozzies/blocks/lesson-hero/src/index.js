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
			eyebrow,
			title,
			summary,
			backHref,
			backLabel,
		} = attributes;

		// Match Astro's outer <section class="lesson-hero ground-purple"> so
		// the editor preview uses the same ported CSS as the front.
		const blockProps = useBlockProps( { className: 'lesson-hero ground-purple' } );

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
							help={ __( 'Relative URL, e.g. /media/', 'bozzies' ) }
							__nextHasNoMarginBottom
						/>
					</PanelBody>
				</InspectorControls>

				<section { ...blockProps }>
					<div className="container-narrow lesson-hero__inner">
						<span className="lesson-hero__back" aria-hidden="true">
							{ '← ' + ( backLabel || 'Media' ) }
						</span>
						<RichText
							tagName="span"
							className="eyebrow lesson-hero__eyebrow"
							value={ eyebrow || '' }
							onChange={ ( v ) => setAttributes( { eyebrow: v } ) }
							allowedFormats={ [] }
							placeholder={ __( 'Eyebrow (e.g. Lesson 01)', 'bozzies' ) }
						/>
						<RichText
							tagName="h1"
							className="lesson-hero__title"
							value={ title || '' }
							onChange={ ( v ) => setAttributes( { title: v } ) }
							allowedFormats={ [] }
							placeholder={ __( 'Lesson title', 'bozzies' ) }
						/>
						<RichText
							tagName="p"
							className="lesson-hero__summary"
							value={ summary || '' }
							onChange={ ( v ) => setAttributes( { summary: v } ) }
							allowedFormats={ [ 'core/italic', 'core/bold' ] }
							placeholder={ __( 'Lesson summary (optional)', 'bozzies' ) }
						/>
					</div>
				</section>
			</>
		);
	},
	// Server-rendered — attributes-only, no inner blocks.
	save: () => null,
} );
