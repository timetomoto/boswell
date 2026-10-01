import { registerBlockType } from '@wordpress/blocks';
import { InnerBlocks } from '@wordpress/block-editor';
import Edit from './edit';
import metadata from '../block.json';
import variations from './variations';
import './style.scss';

// Server-rendered wrapper. `save` must emit InnerBlocks.Content so that
// when the block is serialized to `post_content` the block-comment markers
// surround the inner blocks and PHP receives them as `$content` in
// render.php. Returning `null` here would self-close the block and drop
// every child.
registerBlockType( metadata.name, {
	edit: Edit,
	save: () => <InnerBlocks.Content />,
	variations,
} );
