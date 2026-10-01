import { registerBlockType } from '@wordpress/blocks';
import { InnerBlocks, useBlockProps, RichText } from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';
import metadata from '../block.json';

// Vinyl music-backdrop pattern, verbatim from
// ~/boswell-poc/src/components/MusicBackdrop.astro lines 137-164. Rendered
// in the editor + PHP so the preview matches the front.
function VinylBackdrop() {
	return (
		<div
			className="music-backdrop"
			style={ {
				'--mb-opacity': 0.05,
				'--mb-color': 'var(--purple)',
				'--mb-top': '0px',
			} }
			aria-hidden="true"
		>
			<svg viewBox="0 0 640 400" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
				<defs>
					<pattern id="vinyl-playlist-editor" width="440" height="440" patternUnits="userSpaceOnUse">
						<g fill="none" stroke="var(--mb-color)" strokeWidth="0.9" transform="translate(220 220)">
							<circle r="210" />
							<circle r="196" strokeWidth="0.6" />
							<circle r="182" strokeWidth="0.6" />
							<circle r="168" strokeWidth="0.6" />
							<circle r="154" strokeWidth="0.6" />
							<circle r="140" strokeWidth="0.6" />
							<circle r="126" strokeWidth="0.6" />
							<circle r="112" strokeWidth="0.6" />
							<circle r="98" strokeWidth="0.6" />
							<circle r="84" strokeWidth="0.6" />
							<circle r="70" strokeWidth="0.7" />
							<circle r="56" strokeWidth="1.4" />
							<circle r="40" strokeWidth="0.7" />
							<circle r="4" fill="var(--mb-color)" stroke="none" />
						</g>
					</pattern>
				</defs>
				<rect width="100%" height="100%" fill="url(#vinyl-playlist-editor)" />
			</svg>
		</div>
	);
}

// Body placeholder — one core/paragraph reading `[Playlist player:
// interactive block pending]` until the interactive block ships (Step 13
// in the astro-rebuild build order).
const TEMPLATE = [
	[ 'core/paragraph', {
		align: 'center',
		content: '[Playlist player: interactive block pending]',
	} ],
];

registerBlockType( metadata.name, {
	edit: ( { attributes, setAttributes } ) => {
		const { eyebrow, title, blurb } = attributes;
		const blockProps = useBlockProps( { className: 'section ground-paper playlist-section' } );
		return (
			<section { ...blockProps }>
				<VinylBackdrop />
				<div className="container">
					<header className="playlist-section__head">
						<RichText
							tagName="span"
							className="eyebrow eyebrow--purple"
							value={ eyebrow || '' }
							onChange={ ( v ) => setAttributes( { eyebrow: v } ) }
							allowedFormats={ [] }
							placeholder={ __( 'Eyebrow (optional)', 'bozzies' ) }
						/>
						<RichText
							tagName="h2"
							className="playlist-section__title"
							value={ title || '' }
							onChange={ ( v ) => setAttributes( { title: v } ) }
							allowedFormats={ [] }
							placeholder={ __( 'Playlist section title', 'bozzies' ) }
						/>
						<RichText
							tagName="p"
							className="playlist-section__blurb"
							value={ blurb || '' }
							onChange={ ( v ) => setAttributes( { blurb: v } ) }
							allowedFormats={ [] }
							placeholder={ __( 'Blurb — usually the playlist collection title.', 'bozzies' ) }
						/>
					</header>
					<InnerBlocks
						template={ TEMPLATE }
						templateLock={ false }
						renderAppender={ InnerBlocks.ButtonBlockAppender }
					/>
				</div>
			</section>
		);
	},
	// Server-rendered wrapper. Save must emit <InnerBlocks.Content /> so
	// each child block serializes into post_content.
	save: () => <InnerBlocks.Content />,
} );
