import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	TextControl,
	Button,
	Notice,
} from '@wordpress/components';
import { __, sprintf } from '@wordpress/i18n';
import metadata from '../block.json';

// Update one field on the track at index `i` and return the new tracks array.
function updateTrack( tracks, i, patch ) {
	return tracks.map( ( t, idx ) => ( idx === i ? { ...t, ...patch } : t ) );
}

registerBlockType( metadata.name, {
	edit: ( { attributes, setAttributes } ) => {
		const { tracks = [] } = attributes;
		const blockProps = useBlockProps( { className: 'pp' } );

		const addTrack = () => {
			setAttributes( {
				tracks: [
					...tracks,
					{ title: '', artist: 'The Boswell Sisters', year: '', duration: '', audio: '' },
				],
			} );
		};
		const removeTrack = ( i ) => {
			setAttributes( { tracks: tracks.filter( ( _, idx ) => idx !== i ) } );
		};
		const moveTrack = ( i, delta ) => {
			const j = i + delta;
			if ( j < 0 || j >= tracks.length ) return;
			const next = tracks.slice();
			[ next[ i ], next[ j ] ] = [ next[ j ], next[ i ] ];
			setAttributes( { tracks: next } );
		};

		const first = tracks[ 0 ] || {};
		const firstMeta = [ first.artist, first.year ].filter( Boolean ).join( ' · ' );

		return (
			<>
				<InspectorControls>
					<PanelBody title={ __( 'Playlist tracks', 'bozzies' ) } initialOpen>
						<p style={ { marginTop: 0 } }>
							{ sprintf( __( '%d tracks in this playlist.', 'bozzies' ), tracks.length ) }
						</p>
						{ tracks.length === 0 && (
							<Notice status="warning" isDismissible={ false }>
								{ __( 'Add at least one track for the player to appear on the front end.', 'bozzies' ) }
							</Notice>
						) }
						{ tracks.map( ( t, i ) => (
							<div
								key={ i }
								style={ {
									padding: '0.75rem',
									marginBottom: '0.75rem',
									border: '1px solid #ddd',
									borderRadius: '2px',
								} }
							>
								<strong>
									{ String( i + 1 ).padStart( 2, '0' ) } — { t.title || __( '(untitled)', 'bozzies' ) }
								</strong>
								<TextControl
									label={ __( 'Title', 'bozzies' ) }
									value={ t.title || '' }
									onChange={ ( v ) => setAttributes( { tracks: updateTrack( tracks, i, { title: v } ) } ) }
									__nextHasNoMarginBottom
								/>
								<TextControl
									label={ __( 'Artist', 'bozzies' ) }
									value={ t.artist || '' }
									onChange={ ( v ) => setAttributes( { tracks: updateTrack( tracks, i, { artist: v } ) } ) }
									__nextHasNoMarginBottom
								/>
								<TextControl
									label={ __( 'Year', 'bozzies' ) }
									value={ t.year != null ? String( t.year ) : '' }
									onChange={ ( v ) => setAttributes( { tracks: updateTrack( tracks, i, { year: v } ) } ) }
									__nextHasNoMarginBottom
								/>
								<TextControl
									label={ __( 'Duration (e.g. 2:56)', 'bozzies' ) }
									value={ t.duration || '' }
									onChange={ ( v ) => setAttributes( { tracks: updateTrack( tracks, i, { duration: v } ) } ) }
									__nextHasNoMarginBottom
								/>
								<TextControl
									label={ __( 'Audio URL (MP3)', 'bozzies' ) }
									value={ t.audio || '' }
									onChange={ ( v ) => setAttributes( { tracks: updateTrack( tracks, i, { audio: v } ) } ) }
									__nextHasNoMarginBottom
								/>
								<div style={ { display: 'flex', gap: '0.5rem', marginTop: '0.5rem' } }>
									<Button variant="tertiary" onClick={ () => moveTrack( i, -1 ) } disabled={ i === 0 }>
										{ __( '↑ Up', 'bozzies' ) }
									</Button>
									<Button variant="tertiary" onClick={ () => moveTrack( i, 1 ) } disabled={ i === tracks.length - 1 }>
										{ __( '↓ Down', 'bozzies' ) }
									</Button>
									<Button variant="tertiary" isDestructive onClick={ () => removeTrack( i ) }>
										{ __( 'Remove', 'bozzies' ) }
									</Button>
								</div>
							</div>
						) ) }
						<Button variant="secondary" onClick={ addTrack }>
							{ __( 'Add track', 'bozzies' ) }
						</Button>
					</PanelBody>
				</InspectorControls>

				<div { ...blockProps }>
					<div className="pp__player">
						<div className="pp__now">
							<span className="pp__now-eyebrow">{ __( 'Now playing', 'bozzies' ) }</span>
							<span className="pp__now-title">{ first.title || __( '(no tracks yet)', 'bozzies' ) }</span>
							{ firstMeta && <span className="pp__now-meta">{ firstMeta }</span> }
						</div>
						<div className="pp__controls">
							<button type="button" className="pp__btn" aria-label={ __( 'Previous track', 'bozzies' ) }>
								<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M6 4 L6 16 M14 4 L6 10 L14 16 Z" fill="currentColor" /></svg>
							</button>
							<button type="button" className="pp__btn pp__btn--play" aria-label={ __( 'Play or pause', 'bozzies' ) }>
								<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5 L19 12 L7 19 Z" fill="currentColor" /></svg>
							</button>
							<button type="button" className="pp__btn" aria-label={ __( 'Next track', 'bozzies' ) }>
								<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M14 4 L14 16 M6 4 L14 10 L6 16 Z" fill="currentColor" /></svg>
							</button>
						</div>
						<div className="pp__progress-wrap">
							<span className="pp__time">0:00</span>
							<div className="pp__progress"><div className="pp__progress-bar" /></div>
							<span className="pp__time">--:--</span>
						</div>
					</div>
					<ol className="pp__list" role="list">
						{ tracks.map( ( t, i ) => {
							const meta = [ t.artist, t.year ].filter( Boolean ).join( ' · ' );
							return (
								<li key={ i }>
									<button type="button" className="pp__track" aria-current={ i === 0 ? 'true' : 'false' }>
										<span className="pp__track-index" aria-hidden="true">
											{ String( i + 1 ).padStart( 2, '0' ) }
										</span>
										<span className="pp__track-body">
											<span className="pp__track-title">{ t.title || __( '(untitled)', 'bozzies' ) }</span>
											{ meta && <span className="pp__track-meta">{ meta }</span> }
										</span>
										{ t.duration && <span className="pp__track-duration">{ t.duration }</span> }
										<span className="pp__track-icon" aria-hidden="true">
											<svg width="18" height="18" viewBox="0 0 18 18"><path d="M5 3 L14 9 L5 15 Z" fill="currentColor" /></svg>
										</span>
									</button>
								</li>
							);
						} ) }
					</ol>
				</div>
			</>
		);
	},
	// Attributes-only, server-rendered.
	save: () => null,
} );
