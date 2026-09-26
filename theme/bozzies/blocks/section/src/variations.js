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
		name: 'hero-split',
		title: __( 'Hero split', 'bozzies' ),
		description: __( 'Image left, purple text panel right. Edge to edge. Includes decorative glyph, subtitle and tagline slots.', 'bozzies' ),
		icon: 'columns',
		attributes: {
			backgroundStyle: 'ink',
			width: 'edge',
			headingWidth: 'container',
			spacing: 'none',
			heroFrame: true,
			imageGrayscale: true,
			imageZoom: true,
		},
		innerBlocks: [
			[
				'core/columns',
				{ verticalAlignment: 'stretch', className: 'bozzies-hero-split' },
				[
					[
						'core/column',
						{ verticalAlignment: 'stretch', className: 'bozzies-hero-split__image', width: '50%' },
						[ img() ],
					],
					[
						'core/column',
						{ verticalAlignment: 'center', className: 'bozzies-hero-split__text', width: '50%' },
						[
							[ 'core/heading', { level: 1, content: __( 'Section heading', 'bozzies' ) } ],
							// Decorative glyph, aria-hidden. Matches Astro's hero__glyph.
							[
								'core/html',
								{ content: '<div class="bozzies-hero-split__glyph" aria-hidden="true"><svg viewBox="0 0 80 20"><g fill="none" stroke="currentColor" stroke-width="0.7"><path d="M0 10 L28 10"/><path d="M52 10 L80 10"/><g transform="translate(40 10)"><path d="M-6 0 L-2 -4 L2 0 L-2 4 Z"/><path d="M-10 0 L-6 -4 M6 4 L10 0" opacity="0.7"/><circle cx="0" cy="0" r="1.4" fill="currentColor" stroke="none"/></g></g></svg></div>' },
							],
							[ 'core/paragraph', { content: __( 'Add a short subtitle here.', 'bozzies' ), className: 'bozzies-hero-split__subtitle' } ],
							[ 'core/paragraph', { content: __( 'Add a supporting tagline here.', 'bozzies' ), className: 'bozzies-hero-split__tagline', style: { color: { text: 'var:custom|color|yellow-soft' } } } ],
						],
					],
				],
			],
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
