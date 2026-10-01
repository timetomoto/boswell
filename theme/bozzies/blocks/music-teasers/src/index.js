import { registerBlockType } from '@wordpress/blocks';
import { InnerBlocks, useBlockProps, useInnerBlocksProps } from '@wordpress/block-editor';
import metadata from '../block.json';

const TEMPLATE = [
	[ 'bozzies/music-teaser', {
		eyebrow:  'Discography',
		title:    'Boz on the Charts',
		body:     'Chart positions from Brunswick 6083 in 1931 to Decca in the late 1930s and beyond — how the Boswell Sisters and Connee actually rated with the record-buying public.',
		ctaLabel: 'Explore the charts',
		href:     '/media/charts/',
	} ],
	[ 'bozzies/music-teaser', {
		eyebrow:  'Reviews',
		title:    'Album reviews from the experts',
		body:     'Storyville volumes, Singing the Blues, Shout Sisters Shout, and the lost 1957 RCA classic — hand-picked reviews for anyone starting a Boz collection.',
		ctaLabel: 'Read the reviews',
		href:     '/media/reviews/',
	} ],
	[ 'bozzies/music-teaser', {
		eyebrow:  'Discography',
		title:    'Every session, every track',
		body:     '128 recording sessions spanning 1925 to 1957, from the trio’s first Victor sides through Connee’s final solos with Sy Oliver. Searchable by title, matrix, or personnel.',
		ctaLabel: 'Browse the sessions',
		href:     '/media/discography/',
	} ],
];

const ALLOWED = [ 'bozzies/music-teaser' ];

registerBlockType( metadata.name, {
	edit: () => {
		// In the editor, render the outer <section> + <div.container> wrapper so
		// what the owner sees matches the front. useInnerBlocksProps applies the
		// block props to the inner grid div. The decorative music-backdrop is
		// omitted from the editor preview (it's purely visual).
		const outerProps = useBlockProps( { className: 'section ground-gold music-teasers' } );
		const innerBlocksProps = useInnerBlocksProps(
			{ className: 'container music-teasers__grid' },
			{
				allowedBlocks: ALLOWED,
				template: TEMPLATE,
				templateLock: false,
				orientation: 'horizontal',
				renderAppender: InnerBlocks.ButtonBlockAppender,
			}
		);
		return (
			<section { ...outerProps }>
				<div { ...innerBlocksProps } />
			</section>
		);
	},
	// Server-rendered wrapper. Save must emit <InnerBlocks.Content /> so each
	// child music-teaser serializes into post_content.
	save: () => <InnerBlocks.Content />,
} );
