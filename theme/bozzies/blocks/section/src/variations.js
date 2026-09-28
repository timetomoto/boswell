import { __ } from '@wordpress/i18n';

const p = ( text, extra = {} ) => [ 'core/paragraph', { content: text, ...extra } ];
const h = ( level, content ) => [ 'core/heading', { level, content } ];
const img = () => [ 'core/image', {} ];
const eyebrow = ( text ) => [
	'core/paragraph',
	{ content: text, className: 'is-style-eyebrow' },
];
const button = ( text ) => [
	'core/buttons',
	{},
	[ [ 'core/button', { text } ] ],
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
	{
		name: 'card-grid-2',
		title: __( 'Card grid (2)', 'bozzies' ),
		description: __( 'Two cards side by side.', 'bozzies' ),
		icon: 'grid-view',
		attributes: {
			backgroundStyle: 'gold',
			width: 'container',
			headingWidth: 'reading',
			spacing: 'standard',
		},
		innerBlocks: [
			eyebrow( __( 'Eyebrow', 'bozzies' ) ),
			h( 2, __( 'Section heading', 'bozzies' ) ),
			[
				'core/columns',
				{},
				[
					[ 'core/column', { className: 'is-style-card' }, [ h( 3, __( 'Card one', 'bozzies' ) ), p( __( 'Card copy.', 'bozzies' ) ) ] ],
					[ 'core/column', { className: 'is-style-card' }, [ h( 3, __( 'Card two', 'bozzies' ) ), p( __( 'Card copy.', 'bozzies' ) ) ] ],
				],
			],
		],
		scope: [ 'inserter' ],
	},
	{
		name: 'card-grid-3',
		title: __( 'Card grid (3)', 'bozzies' ),
		description: __( 'Three cards in a row.', 'bozzies' ),
		icon: 'grid-view',
		attributes: {
			backgroundStyle: 'gold',
			width: 'container',
			headingWidth: 'reading',
			spacing: 'standard',
		},
		innerBlocks: [
			eyebrow( __( 'Eyebrow', 'bozzies' ) ),
			h( 2, __( 'Section heading', 'bozzies' ) ),
			[
				'core/columns',
				{},
				[
					[ 'core/column', { className: 'is-style-card' }, [ h( 3, __( 'Card one', 'bozzies' ) ), p( __( 'Card copy.', 'bozzies' ) ) ] ],
					[ 'core/column', { className: 'is-style-card' }, [ h( 3, __( 'Card two', 'bozzies' ) ), p( __( 'Card copy.', 'bozzies' ) ) ] ],
					[ 'core/column', { className: 'is-style-card' }, [ h( 3, __( 'Card three', 'bozzies' ) ), p( __( 'Card copy.', 'bozzies' ) ) ] ],
				],
			],
		],
		scope: [ 'inserter' ],
	},
	{
		name: 'cta',
		title: __( 'Call to action', 'bozzies' ),
		description: __( 'Centred pitch with a button.', 'bozzies' ),
		icon: 'megaphone',
		attributes: {
			backgroundStyle: 'gold',
			backdrop: 'diamond-grid',
			width: 'container',
			headingWidth: 'reading',
			spacing: 'standard',
		},
		innerBlocks: [
			eyebrow( __( 'Support the archive', 'bozzies' ) ),
			[ 'core/heading', { level: 2, content: __( 'Keep the sound alive', 'bozzies' ), textAlign: 'center' } ],
			[ 'core/paragraph', { content: __( 'A short pitch that fits inside 34 characters wide.', 'bozzies' ), align: 'center' } ],
			button( __( 'Donate', 'bozzies' ) ),
		],
		scope: [ 'inserter' ],
	},
	{
		name: 'hero-full',
		title: __( 'Hero full-bleed', 'bozzies' ),
		description: __( 'Full-bleed image behind centred text.', 'bozzies' ),
		icon: 'cover-image',
		attributes: {
			backgroundStyle: 'ink',
			width: 'edge',
			headingWidth: 'reading',
			spacing: 'spacious',
			heroFrame: true,
			imageGrayscale: true,
			imageZoom: true,
		},
		innerBlocks: [
			eyebrow( __( 'Eyebrow', 'bozzies' ) ),
			[ 'core/heading', { level: 1, content: __( 'Hero title', 'bozzies' ), textAlign: 'center' } ],
			[ 'core/paragraph', { content: __( 'Supporting subtitle.', 'bozzies' ), align: 'center' } ],
		],
		scope: [ 'inserter' ],
	},
	{
		name: 'quote',
		title: __( 'Pull quote', 'bozzies' ),
		description: __( 'Editorial pull-quote section.', 'bozzies' ),
		icon: 'format-quote',
		attributes: {
			backgroundStyle: 'purple',
			backdrop: 'notes',
			width: 'container',
			headingWidth: 'reading',
			spacing: 'standard',
		},
		innerBlocks: [
			eyebrow( __( 'Voices', 'bozzies' ) ),
			[ 'core/heading', { level: 2, content: __( 'What their peers said', 'bozzies' ), textAlign: 'center' } ],
			[
				'core/quote',
				{ className: 'is-style-pull-quote' },
				[
					[ 'core/paragraph', { content: __( 'The girls were doing what nobody else was doing.', 'bozzies' ) } ],
				],
			],
		],
		scope: [ 'inserter' ],
	},
];

export default variations;
