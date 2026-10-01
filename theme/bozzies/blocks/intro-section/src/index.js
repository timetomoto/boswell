import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps, RichText } from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';
import metadata from '../block.json';

registerBlockType( metadata.name, {
	edit: ( { attributes, setAttributes } ) => {
		const { eyebrow, lede, bodyLead, body } = attributes;
		const blockProps = useBlockProps( { className: 'section ground-paper intro-section' } );

		return (
			<section { ...blockProps }>
				<div className="container-narrow intro">
					<RichText
						tagName="span"
						className="eyebrow eyebrow--purple"
						value={ eyebrow || '' }
						onChange={ ( v ) => setAttributes( { eyebrow: v } ) }
						allowedFormats={ [] }
						placeholder={ __( 'Eyebrow (optional)', 'bozzies' ) }
					/>
					<RichText
						tagName="p"
						className="intro__lede"
						value={ lede || '' }
						onChange={ ( v ) => setAttributes( { lede: v } ) }
						allowedFormats={ [] }
						placeholder={ __( 'Lede — a single serif sentence.', 'bozzies' ) }
					/>
					<RichText
						tagName="p"
						className="intro__body intro__body--lead"
						value={ bodyLead || '' }
						onChange={ ( v ) => setAttributes( { bodyLead: v } ) }
						allowedFormats={ [] }
						placeholder={ __( 'First body paragraph (bold).', 'bozzies' ) }
					/>
					<RichText
						tagName="p"
						className="intro__body"
						value={ body || '' }
						onChange={ ( v ) => setAttributes( { body: v } ) }
						allowedFormats={ [] }
						placeholder={ __( 'Second body paragraph.', 'bozzies' ) }
					/>
				</div>
			</section>
		);
	},
	save: () => null,
} );
