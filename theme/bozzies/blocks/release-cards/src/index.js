import { registerBlockType } from '@wordpress/blocks';
import { InnerBlocks, useBlockProps, useInnerBlocksProps, RichText, InspectorControls } from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';
import metadata from '../block.json';

const TEMPLATE = [
	[ 'bozzies/release-card', {
		documentType: 'PDF',
		title:        'Second Line press release',
		releaseDate:  '',
		href:         '',
	} ],
	[ 'bozzies/release-card', {
		documentType: 'PDF',
		title:        'Steamboat Natchez centennial launch',
		releaseDate:  '',
		href:         '',
	} ],
];

const ALLOWED = [ 'bozzies/release-card' ];

registerBlockType( metadata.name, {
	edit: ( { attributes, setAttributes } ) => {
		const { eyebrow, title, blurb } = attributes;
		// In the editor, render the outer <section> so the ported cards CSS
		// styles the preview like the front. useInnerBlocksProps applies the
		// block props to the inner <ul.releases-grid>. Decorative staves
		// music-backdrop omitted from the editor preview.
		const outerProps = useBlockProps( { className: 'section ground-gold press-releases' } );
		const innerBlocksProps = useInnerBlocksProps(
			{ className: 'releases-grid', tagName: 'ul', role: 'list' },
			{
				allowedBlocks: ALLOWED,
				template: TEMPLATE,
				templateLock: false,
				orientation: 'horizontal',
				renderAppender: InnerBlocks.ButtonBlockAppender,
			}
		);
		return (
			<>
				<section { ...outerProps }>
					<div className="container">
						<header className="releases-head">
							<RichText
								tagName="span"
								className="eyebrow releases-head__eyebrow"
								value={ eyebrow || '' }
								onChange={ ( v ) => setAttributes( { eyebrow: v } ) }
								allowedFormats={ [] }
								placeholder={ __( 'Eyebrow', 'bozzies' ) }
							/>
							<RichText
								tagName="h2"
								className="releases-head__title"
								value={ title || '' }
								onChange={ ( v ) => setAttributes( { title: v } ) }
								allowedFormats={ [] }
								placeholder={ __( 'Section title', 'bozzies' ) }
							/>
							<RichText
								tagName="p"
								className="releases-head__blurb"
								value={ blurb || '' }
								onChange={ ( v ) => setAttributes( { blurb: v } ) }
								allowedFormats={ [] }
								placeholder={ __( 'Section blurb', 'bozzies' ) }
							/>
						</header>
						<ul { ...innerBlocksProps } />
					</div>
				</section>
			</>
		);
	},
	// Server-rendered wrapper. Save must emit <InnerBlocks.Content /> so each
	// child release-card serializes into post_content.
	save: () => <InnerBlocks.Content />,
} );
