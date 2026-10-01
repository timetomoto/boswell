import { __ } from '@wordpress/i18n';

const p = ( text, extra = {} ) => [ 'core/paragraph', { content: text, ...extra } ];
const h = ( level, content ) => [ 'core/heading', { level, content } ];
const img = () => [ 'core/image', {} ];
const eyebrow = ( text ) => [
	'core/paragraph',
	{ content: text, className: 'is-style-eyebrow' },
];

const variations = [
	{
		name: 'text',
		title: __( 'Text', 'bozzies' ),
		description: __( 'A single-column text section on the paper ground.', 'bozzies' ),
		icon: 'editor-paragraph',
		isDefault: true,
		attributes: {
			backgroundStyle: 'paper',
			width: 'container',
			headingWidth: 'reading',
			spacing: 'standard',
		},
		innerBlocks: [
			eyebrow( __( 'Eyebrow', 'bozzies' ) ),
			h( 2, __( 'Section heading', 'bozzies' ) ),
			p( __( 'Introductory paragraph. Replace with real copy.', 'bozzies' ) ),
		],
		scope: [ 'inserter' ],
	},
	{
		name: 'text-image-left',
		title: __( 'Text + image left', 'bozzies' ),
		description: __( 'Image on the left, prose on the right.', 'bozzies' ),
		icon: 'align-pull-left',
		attributes: {
			backgroundStyle: 'paper',
			width: 'container',
			headingWidth: 'reading',
			spacing: 'standard',
		},
		innerBlocks: [
			[
				'core/columns',
				{ verticalAlignment: 'center' },
				[
					[ 'core/column', {}, [ img() ] ],
					[
						'core/column',
						{},
						[
							eyebrow( __( 'Eyebrow', 'bozzies' ) ),
							h( 2, __( 'Section heading', 'bozzies' ) ),
							p( __( 'Introductory paragraph.', 'bozzies' ) ),
						],
					],
				],
			],
		],
		scope: [ 'inserter' ],
	},
	{
		name: 'text-image-right',
		title: __( 'Text + image right', 'bozzies' ),
		description: __( 'Prose on the left, image on the right.', 'bozzies' ),
		icon: 'align-pull-right',
		attributes: {
			backgroundStyle: 'paper',
			width: 'container',
			headingWidth: 'reading',
			spacing: 'standard',
		},
		innerBlocks: [
			[
				'core/columns',
				{ verticalAlignment: 'center' },
				[
					[
						'core/column',
						{},
						[
							eyebrow( __( 'Eyebrow', 'bozzies' ) ),
							h( 2, __( 'Section heading', 'bozzies' ) ),
							p( __( 'Introductory paragraph.', 'bozzies' ) ),
						],
					],
					[ 'core/column', {}, [ img() ] ],
				],
			],
		],
		scope: [ 'inserter' ],
	},
];

export default variations;
