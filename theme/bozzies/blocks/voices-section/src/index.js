import { registerBlockType } from '@wordpress/blocks';
import { InnerBlocks, useBlockProps, RichText } from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';
import metadata from '../block.json';

// Notes music-backdrop pattern, verbatim from
// ~/boswell-poc/src/components/MusicBackdrop.astro lines 279-313. Rendered
// in the editor + PHP so the preview matches the front.
function NotesBackdrop() {
	return (
		<div
			className="music-backdrop"
			style={ {
				'--mb-opacity': 0.09,
				'--mb-color': 'var(--yellow-soft)',
				'--mb-top': '0px',
			} }
			aria-hidden="true"
		>
			<svg viewBox="0 0 240 240" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
				<defs>
					<pattern id="notes-voices-editor" width="240" height="240" patternUnits="userSpaceOnUse">
						<g fill="var(--mb-color)" stroke="var(--mb-color)" strokeWidth="0.5">
							<g transform="translate(40 60)">
								<ellipse cx="0" cy="26" rx="6" ry="4.4" transform="rotate(-20 0 26)" />
								<line x1="5" y1="24" x2="5" y2="-8" strokeWidth="1" fill="none" />
								<path d="M5 -8 C 14 -4, 16 2, 13 12" strokeWidth="1" fill="none" />
							</g>
							<g transform="translate(140 40)">
								<ellipse cx="0" cy="30" rx="6" ry="4.4" transform="rotate(-20 0 30)" />
								<ellipse cx="26" cy="26" rx="6" ry="4.4" transform="rotate(-20 26 26)" />
								<line x1="5" y1="28" x2="5" y2="-4" strokeWidth="1" />
								<line x1="31" y1="24" x2="31" y2="-8" strokeWidth="1" />
								<line x1="4" y1="-4" x2="32" y2="-8" strokeWidth="2.2" />
							</g>
							<g transform="translate(60 150)">
								<ellipse cx="0" cy="24" rx="6" ry="4.4" transform="rotate(-20 0 24)" />
								<line x1="5" y1="22" x2="5" y2="-10" strokeWidth="1.2" />
							</g>
							<g transform="translate(180 130)" opacity="0.9">
								<path d="M0 40 C -8 30, -8 18, 0 12 C 8 6, 14 14, 10 22 C 6 30, -4 30, -4 22 C -4 12, 6 -6, 6 -14 C 6 -20, -2 -22, -6 -18"
									fill="none" stroke="var(--mb-color)" strokeWidth="1.2" />
							</g>
						</g>
					</pattern>
				</defs>
				<rect width="100%" height="100%" fill="url(#notes-voices-editor)" />
			</svg>
		</div>
	);
}

// Body placeholder — one core/paragraph reading `[Quotes carousel:
// interactive block pending]` until the interactive block ships (Step 14
// in the astro-rebuild build order).
const TEMPLATE = [
	[ 'core/paragraph', {
		align: 'center',
		content: '[Quotes carousel: interactive block pending]',
	} ],
];

registerBlockType( metadata.name, {
	edit: ( { attributes, setAttributes } ) => {
		const { eyebrow, title } = attributes;
		const blockProps = useBlockProps( { className: 'section ground-purple voices-section' } );
		return (
			<section { ...blockProps }>
				<NotesBackdrop />
				<div className="container">
					<header className="voices-section__head">
						<RichText
							tagName="span"
							className="eyebrow voices-section__eyebrow"
							value={ eyebrow || '' }
							onChange={ ( v ) => setAttributes( { eyebrow: v } ) }
							allowedFormats={ [] }
							placeholder={ __( 'Eyebrow (optional)', 'bozzies' ) }
						/>
						<RichText
							tagName="h2"
							className="voices-section__title"
							value={ title || '' }
							onChange={ ( v ) => setAttributes( { title: v } ) }
							allowedFormats={ [] }
							placeholder={ __( 'Voices section title', 'bozzies' ) }
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
	save: () => <InnerBlocks.Content />,
} );
