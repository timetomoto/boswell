import { registerBlockType } from '@wordpress/blocks';
import { InnerBlocks, useBlockProps, useInnerBlocksProps } from '@wordpress/block-editor';
import metadata from '../block.json';

const TEMPLATE = [
	[ 'bozzies/subpage-card', {
		eyebrow:  'Further Reading',
		title:    'Boz Biography',
		body:     'The definitive family biography of the Boswell Sisters.',
		ctaLabel: 'Explore the Boz Biography',
		href:     '/sisters/bio-resources/',
	} ],
	[ 'bozzies/subpage-card', {
		eyebrow:  'Career Timeline',
		title:    'Their story, year by year',
		body:     'From Martha’s 1905 birth through the trio’s final broadcast in 1936 — every recording, tour, and turning point in one scrollable timeline.',
		ctaLabel: 'Open the timeline',
		href:     '/sisters/career-timeline/',
	} ],
];

const ALLOWED = [ 'bozzies/subpage-card' ];

registerBlockType( metadata.name, {
	edit: () => {
		// In the editor, render the outer <section> + <div.container> wrapper so
		// what the owner sees matches the front. useInnerBlocksProps applies the
		// block props to the inner grid div.
		const outerProps = useBlockProps( { className: 'section ground-gold sisters-subpages' } );
		const innerBlocksProps = useInnerBlocksProps(
			{ className: 'container sisters-subpages__grid' },
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
	// child subpage-card serializes into post_content.
	save: () => <InnerBlocks.Content />,
} );
