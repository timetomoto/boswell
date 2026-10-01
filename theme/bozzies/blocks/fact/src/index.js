import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps, RichText } from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';
import metadata from '../block.json';

registerBlockType( metadata.name, {
	edit: ( { attributes, setAttributes } ) => {
		const { label, value } = attributes;
		// Apply Astro's .facts__pair class on the <div> so ported cards.css
		// styles the editor preview exactly like the front.
		const blockProps = useBlockProps( { className: 'facts__pair' } );

		return (
			<div { ...blockProps }>
				<RichText
					tagName="dt"
					className="facts__label"
					value={ label || '' }
					onChange={ ( v ) => setAttributes( { label: v } ) }
					allowedFormats={ [] }
					placeholder={ __( 'Label', 'bozzies' ) }
				/>
				<RichText
					tagName="dd"
					className="facts__value"
					value={ value || '' }
					onChange={ ( v ) => setAttributes( { value: v } ) }
					allowedFormats={ [] }
					placeholder={ __( 'Value', 'bozzies' ) }
				/>
			</div>
		);
	},
	// Server-rendered — attributes-only, no inner blocks.
	save: () => null,
} );
