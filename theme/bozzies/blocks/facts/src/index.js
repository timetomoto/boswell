import { registerBlockType } from '@wordpress/blocks';
import { InnerBlocks, useBlockProps, useInnerBlocksProps } from '@wordpress/block-editor';
import metadata from '../block.json';

const TEMPLATE = [
	[ 'bozzies/fact', { label: 'Born', value: '' } ],
	[ 'bozzies/fact', { label: 'Died', value: '' } ],
	[ 'bozzies/fact', { label: 'Hair', value: '' } ],
	[ 'bozzies/fact', { label: 'Eyes', value: '' } ],
];
const ALLOWED = [ 'bozzies/fact' ];

registerBlockType( metadata.name, {
	edit: () => {
		// Editor DOM mirrors the ported cards.css facts grid exactly so the
		// owner sees the same layout inline as on the front. useInnerBlocksProps
		// applies the block props (className "facts") to the <dl>.
		const blockProps = useBlockProps( { className: 'facts' } );
		const innerBlocksProps = useInnerBlocksProps( blockProps, {
			allowedBlocks: ALLOWED,
			template: TEMPLATE,
			templateLock: false,
			renderAppender: InnerBlocks.ButtonBlockAppender,
		} );
		return <dl { ...innerBlocksProps } />;
	},
	// Server-rendered wrapper. Must save <InnerBlocks.Content /> so children
	// serialize into post_content and PHP receives them as $content.
	save: () => <InnerBlocks.Content />,
} );
