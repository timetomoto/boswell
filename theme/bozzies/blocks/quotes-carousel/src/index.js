import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	TextControl,
	TextareaControl,
	Button,
	Notice,
} from '@wordpress/components';
import { __, sprintf } from '@wordpress/i18n';
import metadata from '../block.json';

function updateQuote( quotes, i, patch ) {
	return quotes.map( ( q, idx ) => ( idx === i ? { ...q, ...patch } : q ) );
}

registerBlockType( metadata.name, {
	edit: ( { attributes, setAttributes } ) => {
		const { quotes = [], intervalMs = 7000 } = attributes;
		const blockProps = useBlockProps( { className: 'qc' } );

		const addQuote = () => {
			setAttributes( { quotes: [ ...quotes, { text: '', attribution: '' } ] } );
		};
		const removeQuote = ( i ) => {
			setAttributes( { quotes: quotes.filter( ( _, idx ) => idx !== i ) } );
		};
		const moveQuote = ( i, delta ) => {
			const j = i + delta;
			if ( j < 0 || j >= quotes.length ) return;
			const next = quotes.slice();
			[ next[ i ], next[ j ] ] = [ next[ j ], next[ i ] ];
			setAttributes( { quotes: next } );
		};

		const first = quotes[ 0 ] || { text: '', attribution: '' };

		return (
			<>
				<InspectorControls>
					<PanelBody title={ __( 'Carousel timing', 'bozzies' ) } initialOpen={ false }>
						<TextControl
							label={ __( 'Auto-advance interval (ms)', 'bozzies' ) }
							type="number"
							value={ String( intervalMs ) }
							onChange={ ( v ) => setAttributes( { intervalMs: parseInt( v, 10 ) || 7000 } ) }
							__nextHasNoMarginBottom
						/>
					</PanelBody>
					<PanelBody title={ __( 'Quotes', 'bozzies' ) } initialOpen>
						<p style={ { marginTop: 0 } }>
							{ sprintf( __( '%d quotes in this carousel.', 'bozzies' ), quotes.length ) }
						</p>
						{ quotes.length === 0 && (
							<Notice status="warning" isDismissible={ false }>
								{ __( 'Add at least one quote for the carousel to appear on the front end.', 'bozzies' ) }
							</Notice>
						) }
						{ quotes.map( ( q, i ) => (
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
									{ String( i + 1 ).padStart( 2, '0' ) } — { q.attribution || __( '(no attribution)', 'bozzies' ) }
								</strong>
								<TextareaControl
									label={ __( 'Quote text', 'bozzies' ) }
									value={ q.text || '' }
									onChange={ ( v ) => setAttributes( { quotes: updateQuote( quotes, i, { text: v } ) } ) }
									rows={ 3 }
									__nextHasNoMarginBottom
								/>
								<TextControl
									label={ __( 'Attribution', 'bozzies' ) }
									value={ q.attribution || '' }
									onChange={ ( v ) => setAttributes( { quotes: updateQuote( quotes, i, { attribution: v } ) } ) }
									__nextHasNoMarginBottom
								/>
								<div style={ { display: 'flex', gap: '0.5rem', marginTop: '0.5rem' } }>
									<Button variant="tertiary" onClick={ () => moveQuote( i, -1 ) } disabled={ i === 0 }>
										{ __( '↑ Up', 'bozzies' ) }
									</Button>
									<Button variant="tertiary" onClick={ () => moveQuote( i, 1 ) } disabled={ i === quotes.length - 1 }>
										{ __( '↓ Down', 'bozzies' ) }
									</Button>
									<Button variant="tertiary" isDestructive onClick={ () => removeQuote( i ) }>
										{ __( 'Remove', 'bozzies' ) }
									</Button>
								</div>
							</div>
						) ) }
						<Button variant="secondary" onClick={ addQuote }>
							{ __( 'Add quote', 'bozzies' ) }
						</Button>
					</PanelBody>
				</InspectorControls>

				<div { ...blockProps }>
					<div className="qc__viewport">
						<figure className="qc__slide" data-active="true">
							<blockquote className="qc__quote">
								<span aria-hidden="true">&ldquo;</span>{ first.text || __( '(no quotes yet)', 'bozzies' ) }<span aria-hidden="true">&rdquo;</span>
							</blockquote>
							{ first.attribution && (
								<figcaption className="qc__attr">— { first.attribution }</figcaption>
							) }
						</figure>
					</div>
					<div className="qc__controls">
						<button type="button" className="qc__btn" aria-label={ __( 'Previous quote', 'bozzies' ) }>
							<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M13 4 L7 10 L13 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
						</button>
						<ol className="qc__dots" role="tablist">
							{ quotes.map( ( _, i ) => (
								<li key={ i }>
									<button type="button" className="qc__dot" role="tab" aria-selected={ i === 0 ? 'true' : 'false' }></button>
								</li>
							) ) }
						</ol>
						<button type="button" className="qc__btn" aria-label={ __( 'Next quote', 'bozzies' ) }>
							<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M7 4 L13 10 L7 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
						</button>
					</div>
				</div>
			</>
		);
	},
	save: () => null,
} );
