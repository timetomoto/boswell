import { registerBlockType } from '@wordpress/blocks';
import {
	InnerBlocks,
	useBlockProps,
	InspectorControls,
} from '@wordpress/block-editor';
import { PanelBody, SelectControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import metadata from '../block.json';

// Default template — one paragraph placeholder; owner replaces with real prose.
const TEMPLATE = [
	[ 'core/paragraph', { placeholder: 'Body prose…' } ],
];

registerBlockType( metadata.name, {
	edit: ( { attributes, setAttributes } ) => {
		const { variant } = attributes;
		const proseClass = 'container-narrow prose' + (
			variant === 'charts' || variant === 'reviews' ? ' ' + variant + '-body' : ''
		);
		const blockProps = useBlockProps( { className: 'section ground-paper' } );
		return (
			<>
				<InspectorControls>
					<PanelBody title={ __( 'Prose variant', 'bozzies' ) } initialOpen>
						<SelectControl
							label={ __( 'Variant', 'bozzies' ) }
							help={ __( 'Charts: bigger headings + editorial ledger tables. Reviews: hairline-separated H3s with italic paragraphs. Generic: base prose only.', 'bozzies' ) }
							value={ variant || 'generic' }
							options={ [
								{ label: __( 'Generic', 'bozzies' ), value: 'generic' },
								{ label: __( 'Charts', 'bozzies' ),  value: 'charts' },
								{ label: __( 'Reviews', 'bozzies' ), value: 'reviews' },
							] }
							onChange={ ( v ) => setAttributes( { variant: v } ) }
							__nextHasNoMarginBottom
						/>
					</PanelBody>
				</InspectorControls>
				<section { ...blockProps }>
					<div className={ proseClass }>
						<InnerBlocks
							template={ TEMPLATE }
							templateLock={ false }
							renderAppender={ InnerBlocks.ButtonBlockAppender }
						/>
					</div>
				</section>
			</>
		);
	},
	save: () => <InnerBlocks.Content />,
} );
