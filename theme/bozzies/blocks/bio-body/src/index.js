import { registerBlockType } from '@wordpress/blocks';
import {
	InnerBlocks,
	useBlockProps,
	useInnerBlocksProps,
	RichText,
	MediaUpload,
	MediaUploadCheck,
	MediaPlaceholder,
	InspectorControls,
} from '@wordpress/block-editor';
import { Button, PanelBody, TextareaControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import metadata from '../block.json';

const TEMPLATE = [
	[ 'core/heading', { level: 2, placeholder: 'Section heading' } ],
	[ 'core/paragraph', { placeholder: 'Bio prose starts here…' } ],
];

registerBlockType( metadata.name, {
	edit: ( { attributes, setAttributes } ) => {
		const { portraitId, portraitUrl, portraitAlt, portraitCaption } = attributes;

		// The parent gets `.bio-body`. Inline styles come from cards.css so the
		// editor preview matches the front — the `.container.bio-body__layout`
		// grid puts figure left, prose right.
		const blockProps = useBlockProps( { className: 'section ground-paper bio-body' } );

		const innerBlocksProps = useInnerBlocksProps(
			{ className: 'prose' },
			{
				template: TEMPLATE,
				templateLock: false,
				renderAppender: InnerBlocks.ButtonBlockAppender,
			}
		);

		const onSelectMedia = ( media ) => {
			if ( ! media ) return;
			setAttributes( {
				portraitId: media.id,
				portraitUrl: media.url,
				portraitAlt: media.alt || '',
			} );
		};

		const removePortrait = () => setAttributes( {
			portraitId: 0,
			portraitUrl: '',
			portraitAlt: '',
			portraitCaption: '',
		} );

		return (
			<>
				<InspectorControls>
					<PanelBody title={ __( 'Portrait', 'bozzies' ) } initialOpen>
						<TextareaControl
							label={ __( 'Alt text', 'bozzies' ) }
							value={ portraitAlt || '' }
							onChange={ ( v ) => setAttributes( { portraitAlt: v } ) }
							help={ __( 'Describe the image for screen readers.', 'bozzies' ) }
							__nextHasNoMarginBottom
						/>
						<MediaUploadCheck>
							<MediaUpload
								onSelect={ onSelectMedia }
								allowedTypes={ [ 'image' ] }
								value={ portraitId }
								render={ ( { open } ) => (
									<Button variant="secondary" onClick={ open }>
										{ portraitUrl
											? __( 'Replace portrait', 'bozzies' )
											: __( 'Select portrait', 'bozzies' ) }
									</Button>
								) }
							/>
						</MediaUploadCheck>
						{ portraitUrl && (
							<Button variant="link" isDestructive onClick={ removePortrait }>
								{ __( 'Remove portrait', 'bozzies' ) }
							</Button>
						) }
					</PanelBody>
				</InspectorControls>

				<section { ...blockProps }>
					<div className="container bio-body__layout">
						{ portraitUrl ? (
							<figure className="bio-portrait">
								<img src={ portraitUrl } alt={ portraitAlt || '' } />
								<RichText
									tagName="figcaption"
									className="bio-portrait__caption"
									value={ portraitCaption || '' }
									onChange={ ( v ) => setAttributes( { portraitCaption: v } ) }
									allowedFormats={ [] }
									placeholder={ __( 'Caption (e.g. Martha Boswell)', 'bozzies' ) }
								/>
							</figure>
						) : (
							<MediaPlaceholder
								onSelect={ onSelectMedia }
								allowedTypes={ [ 'image' ] }
								labels={ { title: __( 'Portrait', 'bozzies' ) } }
							/>
						) }
						<div { ...innerBlocksProps } />
					</div>
				</section>
			</>
		);
	},
	save: () => <InnerBlocks.Content />,
} );
