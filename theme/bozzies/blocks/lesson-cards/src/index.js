import { registerBlockType } from '@wordpress/blocks';
import { InnerBlocks, useBlockProps, useInnerBlocksProps, RichText, InspectorControls } from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import metadata from '../block.json';

// Astro-source defaults for the 5 audio lessons on /media/. Copy pasted
// from ~/boswell-poc/src/content/lessons/lesson-*.md summaries.
const TEMPLATE = [
	[ 'bozzies/lesson-card', {
		order:    1,
		title:    'The Blend',
		summary:  'Cynthia Lucas walks through the first, and most immediately recognizable, element of the Boswell Sound: three sisters singing so closely blended that they sometimes read as one voice.',
		ctaLabel: 'Listen',
		href:     '/media/lessons/lesson-1/',
	} ],
	[ 'bozzies/lesson-card', {
		order:    2,
		title:    'The Tempo',
		summary:  "The Boswells' signature four-to-five tempo shifts within a single arrangement, executed with the kind of precision that most trios would never even attempt.",
		ctaLabel: 'Listen',
		href:     '/media/lessons/lesson-2/',
	} ],
	[ 'bozzies/lesson-card', {
		order:    3,
		title:    'The Riffs',
		summary:  'The instrumental-style rhythmic figures the Boswells pulled off with their voices — riffs that would sound at home coming out of a horn section.',
		ctaLabel: 'Listen',
		href:     '/media/lessons/lesson-3/',
	} ],
	[ 'bozzies/lesson-card', {
		order:    4,
		title:    'Melody? Words? Who Needs ’Em!',
		summary:  'What happens when the Boswells decide the melody as written is only a starting point — reharmonizations, unexpected returns to the verse, lyrics rendered in something resembling pig Latin.',
		ctaLabel: 'Listen',
		href:     '/media/lessons/lesson-4/',
	} ],
	[ 'bozzies/lesson-card', {
		order:    5,
		title:    'Scatting, Hand Trumpets, Gibberish and Gulling',
		summary:  'The Boswell bag of tricks — scat lines, hand trumpets, blues refrains, gulling, and whatever else they felt like throwing into an arrangement.',
		ctaLabel: 'Listen',
		href:     '/media/lessons/lesson-5/',
	} ],
];

const ALLOWED = [ 'bozzies/lesson-card' ];

registerBlockType( metadata.name, {
	edit: ( { attributes, setAttributes } ) => {
		const { eyebrow, title, lede } = attributes;
		// Outer section carries Astro classes so ported cards.css styles the
		// editor exactly like the front.
		const outerProps = useBlockProps( { className: 'section ground-paper lessons-grid' } );
		const innerBlocksProps = useInnerBlocksProps(
			{ className: 'lessons-cards', role: 'list' },
			{
				allowedBlocks: ALLOWED,
				template: TEMPLATE,
				templateLock: false,
				orientation: 'vertical',
				renderAppender: InnerBlocks.ButtonBlockAppender,
			}
		);
		return (
			<>
				<InspectorControls>
					<PanelBody title={ __( 'Section header', 'bozzies' ) } initialOpen>
						{ /* Header eyebrow/title/lede live as inline RichText below, plus this panel exists for future controls. */ }
					</PanelBody>
				</InspectorControls>
				<section { ...outerProps }>
					<div className="container">
						<header className="lessons-grid__head">
							<RichText
								tagName="span"
								className="eyebrow eyebrow--purple"
								value={ eyebrow || '' }
								onChange={ ( v ) => setAttributes( { eyebrow: v } ) }
								allowedFormats={ [] }
								placeholder={ __( 'Eyebrow', 'bozzies' ) }
							/>
							<RichText
								tagName="h2"
								className="lessons-grid__title"
								value={ title || '' }
								onChange={ ( v ) => setAttributes( { title: v } ) }
								allowedFormats={ [] }
								placeholder={ __( 'Section title', 'bozzies' ) }
							/>
							<RichText
								tagName="p"
								className="lessons-grid__lede"
								value={ lede || '' }
								onChange={ ( v ) => setAttributes( { lede: v } ) }
								allowedFormats={ [] }
								placeholder={ __( 'Section lede', 'bozzies' ) }
							/>
						</header>
						{ /* Use <ol> tag on the inner-blocks wrapper via useInnerBlocksProps below. */ }
						<ol { ...innerBlocksProps } />
					</div>
				</section>
			</>
		);
	},
	// Server-rendered wrapper. Save must emit <InnerBlocks.Content /> so each
	// child lesson-card serializes into post_content.
	save: () => <InnerBlocks.Content />,
} );
