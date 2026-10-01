#!/usr/bin/env node
// scripts/dev/add-block-examples.mjs
//
// Writes an `example` field into every bozzies/* block.json so the inserter
// shows a live preview on hover. Content comes from the site's real pages so
// previews look like what the owner actually publishes.
//
// For blocks that would preview poorly (JS/audio-dependent or massive data),
// adds an `isPreview` attribute and sets it in the example — those blocks'
// edit.js checks `attributes.isPreview === true` and renders a static
// thumbnail image from assets/img/block-previews/ instead of the live view.

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const BLOCKS = resolve('theme/bozzies/blocks');

// All examples live here, keyed by block short name. `example` is the
// example object; `isPreview` means the block should also add isPreview to
// its attribute schema and show a static thumbnail instead of a live edit.
const EXAMPLES = {
	// --- Static-text sections ------------------------------------------------
	'about-cta': {
		example: {
			attributes: {
				align: 'full',
				eyebrow: 'Get in touch',
				title: 'Have something to share, or want to help?',
				body: 'Reach out with material for the archive, corrections, or collaboration ideas — or make a donation to help keep the Boswells’ legacy alive.',
				contactHref: '/contact/',
				contactLabel: 'Contact us',
				donateHref: '',
				donateLabel: 'Donate',
			},
		},
	},
	'bio-hero': {
		example: {
			attributes: {
				nickname: 'MBoz',
				name: 'Martha Boswell',
				pullQuote: 'If we sang according to orthodox musical traditions, Vet would be the high voice or soprano, I would be the middle or alto, and Connie would be the low or contralto.',
				pullQuoteAttribution: 'Martha Boswell',
				backHref: '/sisters/',
				backLabel: 'The Sisters',
			},
		},
	},
	'bio-nav': {
		example: {
			attributes: {
				prevHref: '/sisters/martha/',
				prevLabel: 'Previous',
				prevName: 'Martha Boswell',
				allHref: '/sisters/',
				allLabel: 'All',
				allName: 'The Sisters',
				nextHref: '/sisters/vet/',
				nextLabel: 'Next',
				nextName: 'Vet Boswell',
				ariaLabel: 'Sisters navigation',
			},
		},
	},
	'bio-body': {
		example: {
			attributes: {
				portraitUrl: '',
				portraitAlt: 'Connee Boswell portrait',
				portraitCaption: 'Connee Boswell, 1935.',
			},
			innerBlocks: [
				{ name: 'core/paragraph', attributes: { content: 'The middle sister whose solo career outlasted the trio by three decades. Connee Boswell shaped American popular singing in ways we’re only now beginning to credit.' } },
				{ name: 'core/paragraph', attributes: { content: 'From the Boswell Sisters’ Victor sides in 1925 through her final Sy Oliver sessions in 1957, Connee kept finding new ways to swing.' } },
			],
		},
	},
	'divider': {
		example: {
			attributes: { align: 'wide', variant: 'jazz', color: 'purple' },
		},
	},
	'donate-teaser': {
		example: {
			attributes: {
				align: 'full',
				eyebrow: 'Support the Work',
				title: 'Keep the Boswell legacy alive',
				body: 'The archive runs on sweat and goodwill. If you can help with hosting, scanning, or research, we’re grateful.',
				href: '',
				ctaLabel: 'Donate',
			},
		},
	},
	'facts': {
		example: {
			attributes: {},
			innerBlocks: [
				{ name: 'bozzies/fact', attributes: { label: 'Born', value: 'Dec 3, 1907 — New Orleans' } },
				{ name: 'bozzies/fact', attributes: { label: 'Died', value: 'Oct 11, 1976 — New York City' } },
				{ name: 'bozzies/fact', attributes: { label: 'Instrument', value: 'Voice, cello' } },
				{ name: 'bozzies/fact', attributes: { label: 'Years active', value: '1925 — 1957' } },
			],
		},
	},
	'hero-split': {
		example: {
			attributes: {
				align: 'full',
				eyebrow: 'The Boswell Sisters',
				title: 'Meet the Boswells',
				subtitle: 'Three sisters from New Orleans who taught America to sing with each other.',
				tagline: '1925 to 1936',
				imageAlt: 'The Boswell Sisters, c. 1932.',
				imageCredit: 'c. 1932',
				height: 'tall',
			},
		},
	},
	'intro-section': {
		example: {
			attributes: {
				align: 'full',
				eyebrow: '',
				lede: 'Three sisters from New Orleans whose vocal arrangements changed what American popular music could sound like.',
				bodyLead: 'The Boswell Sisters recorded for Victor, Brunswick, and Decca between 1925 and 1936.',
				body: 'Their rhythmic feel, harmonic daring, and tempo-shifting arrangements influenced every vocal group that followed — the Andrews Sisters, the Pointer Sisters, Lambert, Hendricks & Ross, Manhattan Transfer.',
			},
		},
	},
	'lesson-cards': {
		example: {
			attributes: {
				align: 'full',
				eyebrow: 'Audio Lessons',
				title: 'Five keys to the Boswell sound',
				lede: 'Cynthia Lucas, one of the best-known Boz historians, narrates five audio lessons that unpack how the Sisters actually did what they did.',
			},
			innerBlocks: [
				{ name: 'bozzies/lesson-card', attributes: { order: 1, title: 'The Blend', summary: 'Three sisters singing so closely blended they sometimes read as one voice.', href: '/media/lessons/lesson-1/', ctaLabel: 'Listen' } },
				{ name: 'bozzies/lesson-card', attributes: { order: 2, title: 'The Tempo', summary: 'Signature four-to-five tempo shifts within a single arrangement.', href: '/media/lessons/lesson-2/', ctaLabel: 'Listen' } },
				{ name: 'bozzies/lesson-card', attributes: { order: 3, title: 'The Riffs', summary: 'Instrumental-style rhythmic figures the Boswells pulled off with their voices.', href: '/media/lessons/lesson-3/', ctaLabel: 'Listen' } },
			],
		},
	},
	'lesson-hero': {
		example: {
			attributes: {
				align: 'full',
				eyebrow: 'Lesson 01',
				title: 'The Blend',
				summary: 'Cynthia Lucas walks through the first, and most immediately recognizable, element of the Boswell Sound.',
				backHref: '/media/',
				backLabel: 'Media',
			},
		},
	},
	'lesson-nav': {
		example: {
			attributes: {
				prevHref: '/media/lessons/lesson-1/',
				prevLabel: 'Previous',
				prevName: 'Lesson 1 — The Blend',
				allHref: '/media/',
				allLabel: 'All lessons',
				allName: 'Media',
				nextHref: '/media/lessons/lesson-3/',
				nextLabel: 'Next',
				nextName: 'Lesson 3 — The Riffs',
				ariaLabel: 'Lesson navigation',
			},
		},
	},
	'music-teasers': {
		example: {
			attributes: { align: 'full' },
			innerBlocks: [
				{ name: 'bozzies/music-teaser', attributes: { eyebrow: 'Discography', title: 'Boz on the Charts', body: 'Chart positions from Brunswick 6083 in 1931 to Decca in the late 1930s.', href: '/media/charts/', ctaLabel: 'Explore the charts' } },
				{ name: 'bozzies/music-teaser', attributes: { eyebrow: 'Reviews', title: 'Album reviews from the experts', body: 'Hand-picked reviews for anyone starting a Boz collection.', href: '/media/reviews/', ctaLabel: 'Read the reviews' } },
				{ name: 'bozzies/music-teaser', attributes: { eyebrow: 'Discography', title: 'Every session, every track', body: '128 recording sessions spanning 1925 to 1957.', href: '/media/discography/', ctaLabel: 'Browse the sessions' } },
			],
		},
	},
	'page-hero': {
		example: {
			attributes: {
				align: 'full',
				backHref: '/media/',
				backLabel: 'Media',
				eyebrow: 'Discography',
				title: 'Every session, every track',
				subtitle: '128 sessions, 500+ tracks — searchable by title, matrix, or personnel.',
				ground: 'purple',
				backdrop: 'none',
			},
		},
	},
	'playlist-section': {
		example: {
			attributes: {
				align: 'full',
				eyebrow: 'Music Playlist',
				title: 'The Boswell Sisters Collection Volume One',
				blurb: 'Twenty-six sides from Brunswick and Decca, 1925–1935.',
			},
			innerBlocks: [
				{ name: 'core/paragraph', attributes: { content: '[Playlist player goes here]', align: 'center' } },
			],
		},
	},
	'prose-body': {
		example: {
			attributes: { align: 'full', variant: 'default' },
			innerBlocks: [
				{ name: 'core/heading', attributes: { level: 2, content: 'The Boswell Sisters on the Radio' } },
				{ name: 'core/paragraph', attributes: { content: 'From 1931 the Boswells were a prime draw on the Woodbury’s cosmetics variety show on CBS, where their rhythmic arrangements reached millions each week.' } },
				{ name: 'core/paragraph', attributes: { content: 'Many of the broadcast transcriptions survive. Together with their commercial Victor and Brunswick sides, they document a sound no vocal group had made before and few have attempted since.' } },
			],
		},
	},
	'pull-quote': {
		example: {
			attributes: {
				align: 'full',
				quote: 'They (the Boswell Sisters) changed popular music from the 1930s forward.',
				attribution: 'James Von Schilling',
				backdrop: 'notes',
			},
		},
	},
	'release-cards': {
		example: {
			attributes: {
				eyebrow: 'The Press Room',
				title: 'Press releases & media',
				blurb: 'Original press releases, event announcements, and archival documents. Each opens as a PDF.',
			},
			innerBlocks: [
				{ name: 'bozzies/release-card', attributes: { documentType: 'PDF', title: 'Boswell Sisters Centennial Program, 2025', releaseDate: '2025-03-01', href: '' } },
				{ name: 'bozzies/release-card', attributes: { documentType: 'PDF', title: 'Boswell Sisters Tribute Dinner', releaseDate: '2024-10-14', href: '' } },
				{ name: 'bozzies/release-card', attributes: { documentType: 'PDF', title: 'Centennial Press Release', releaseDate: '2024-06-03', href: '' } },
			],
		},
	},
	'sample-section': {
		example: {
			attributes: {
				align: 'full',
				eyebrow: 'Sample the Sound',
				title: 'A little lesson, to start',
				body: 'Hear what makes the Boswells, the Boswells. Lesson one is a four-minute primer on the famous Boswell blend.',
				href: '/media/lessons/lesson-1/',
				ctaLabel: 'Play Lesson 1',
			},
		},
	},
	'section': {
		example: {
			attributes: {
				align: 'full',
				backgroundStyle: 'paper',
				width: 'container',
				headingWidth: 'reading',
				spacing: 'default',
				backdrop: 'none',
			},
			innerBlocks: [
				{ name: 'core/heading', attributes: { level: 2, content: 'A reusable section wrapper' } },
				{ name: 'core/paragraph', attributes: { content: 'Pick a ground (paper, ink, purple, gold), a music backdrop, a width — then fill with any blocks.' } },
			],
		},
	},
	'see-also': {
		example: {
			attributes: {
				align: 'full',
				eyebrow: 'See also',
				title: 'Every session, every track',
				body: 'Explore the full discography of 128 recording sessions, searchable by title, matrix, or personnel.',
				href: '/media/discography/',
				ctaLabel: 'Explore',
			},
		},
	},
	'sister-cards': {
		example: {
			attributes: {},
			innerBlocks: [
				{ name: 'bozzies/sister-card', attributes: { order: '01', nickname: 'MBoz', name: 'Martha Boswell', quote: 'If we sang according to orthodox musical traditions, Vet would be the high voice or soprano, I would be the middle or alto, and Connie would be the low or contralto.', href: '/sisters/martha/', ctaLabel: 'Read the bio' } },
				{ name: 'bozzies/sister-card', attributes: { order: '02', nickname: 'CBoz', name: 'Connee Boswell', quote: 'We had loads of fun with our swinging trio. We were billed one time as musicians and in small print it said, "They also sing".', href: '/sisters/connee/', ctaLabel: 'Read the bio' } },
				{ name: 'bozzies/sister-card', attributes: { order: '03', nickname: 'VBoz', name: 'Vet Boswell', quote: 'A tribute to Charles M. Boswell, our father, who taught us three girls to love and respect music.', href: '/sisters/vet/', ctaLabel: 'Read the bio' } },
			],
		},
	},
	'subpage-cards': {
		example: {
			attributes: { align: 'full' },
			innerBlocks: [
				{ name: 'bozzies/subpage-card', attributes: { eyebrow: 'A Family Affair', title: 'Boz Biography', body: 'The definitive family biography of the Boswell Sisters.', href: '/sisters/bio-resources/', ctaLabel: 'Open the biography' } },
				{ name: 'bozzies/subpage-card', attributes: { eyebrow: 'Career Timeline', title: 'Sessions, broadcasts, films', body: 'The Boswells’ career on a single timeline, 1925 to 1976.', href: '/sisters/career-timeline/', ctaLabel: 'Open the timeline' } },
			],
		},
	},
	'voices-section': {
		example: {
			attributes: {
				align: 'full',
				eyebrow: 'In Their Words',
				title: 'What the world has said about the Boswells',
			},
			innerBlocks: [
				{ name: 'core/paragraph', attributes: { content: '[Quotes carousel goes here]', align: 'center' } },
			],
		},
	},

	// --- Thumbnail-only (JS/audio-dependent) --------------------------------
	'playlist-player': {
		isPreview: true,
		thumbnail: 'playlist-player.png',
		example: { attributes: { isPreview: true } },
	},
	'quotes-carousel': {
		isPreview: true,
		thumbnail: 'quotes-carousel.png',
		example: { attributes: { isPreview: true } },
	},
	'discography': {
		isPreview: true,
		thumbnail: 'discography.png',
		example: { attributes: { isPreview: true } },
	},
	'lesson-player': {
		isPreview: true,
		thumbnail: 'lesson-player.png',
		example: { attributes: { isPreview: true } },
	},
	'timeline': {
		isPreview: true,
		thumbnail: 'timeline.png',
		example: { attributes: { isPreview: true } },
	},
};

let touched = 0;
for (const [name, spec] of Object.entries(EXAMPLES)) {
	const path = resolve(BLOCKS, name, 'block.json');
	const raw = readFileSync(path, 'utf8');
	const json = JSON.parse(raw);

	// Add isPreview attribute to the block's schema if needed.
	if (spec.isPreview) {
		json.attributes = json.attributes || {};
		if (!json.attributes.isPreview) {
			json.attributes.isPreview = { type: 'boolean', default: false };
		}
	}

	// Set the example — overwrites any previous example.
	json.example = spec.example;

	const out = JSON.stringify(json, null, '\t') + '\n';
	writeFileSync(path, out);
	touched++;
	console.log(`  ${name}${spec.isPreview ? ' (thumbnail)' : ''}`);
}
console.log(`\n${touched} block.json files updated.`);
