import { registerBlockType } from '@wordpress/blocks';
import { InnerBlocks, useBlockProps, useInnerBlocksProps } from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';
import metadata from '../block.json';

const TEMPLATE = [
	[ 'bozzies/sister-card', {
		order:    '01',
		nickname: 'MBoz',
		name:     'Martha Boswell',
		quote:    'If we sang according to orthodox musical traditions, Vet would be the high voice or soprano, I would be the middle or alto, and Connie would be the low or contralto.',
		href:     '/sisters/martha/',
		ctaLabel: 'Read the bio',
	} ],
	[ 'bozzies/sister-card', {
		order:    '02',
		nickname: 'CBoz',
		name:     'Connee Boswell',
		quote:    'We had loads of fun with our swinging trio. We were billed one time as musicians and in small print it said, "They also sing".',
		href:     '/sisters/connee/',
		ctaLabel: 'Read the bio',
	} ],
	[ 'bozzies/sister-card', {
		order:    '03',
		nickname: 'VBoz',
		name:     'Vet Boswell',
		quote:    'Vet apparently is the domesticated one. She packs the trunks with uncanny skill, arranges the flowers with unerring artistic rights and so on...',
		href:     '/sisters/vet/',
		ctaLabel: 'Read the bio',
	} ],
];

const ALLOWED = [ 'bozzies/sister-card' ];

registerBlockType( metadata.name, {
	edit: () => {
		// Render as the exact Astro DOM inside the editor so what the owner
		// sees matches the front. useInnerBlocksProps applies the block props
		// (with className "sisters-cards") to the underlying <ul>.
		const blockProps = useBlockProps( { className: 'sisters-cards', role: 'list' } );
		const innerBlocksProps = useInnerBlocksProps( blockProps, {
			allowedBlocks: ALLOWED,
			template: TEMPLATE,
			templateLock: false,
			orientation: 'horizontal',
			renderAppender: InnerBlocks.ButtonBlockAppender,
		} );
		return <ul { ...innerBlocksProps } />;
	},
	// Server-rendered wrapper. Save must emit <InnerBlocks.Content /> so
	// each child sister-card serializes into post_content and PHP receives
	// them as $content in render.php.
	save: () => <InnerBlocks.Content />,
} );
