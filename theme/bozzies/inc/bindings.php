<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_action( 'init', 'bozzies_register_bindings' );
function bozzies_register_bindings() {
	if ( ! function_exists( 'register_block_bindings_source' ) ) {
		return;
	}
	register_block_bindings_source(
		'bozzies/copyright-year',
		array(
			'label'              => __( 'Current copyright line', 'bozzies' ),
			'get_value_callback' => 'bozzies_bindings_copyright_year',
		)
	);
	register_block_bindings_source(
		'bozzies/article-meta',
		array(
			'label'              => __( 'Article meta line', 'bozzies' ),
			'get_value_callback' => 'bozzies_bindings_article_meta',
			'uses_context'       => array( 'postId' ),
		)
	);
	register_block_bindings_source(
		'bozzies/term-kicker',
		array(
			'label'              => __( 'Queried term kicker', 'bozzies' ),
			'get_value_callback' => 'bozzies_bindings_term_kicker',
		)
	);
}

function bozzies_bindings_copyright_year( $source_args, $block_instance, $attribute_name ) {
	return '© ' . gmdate( 'Y' );
}

/**
 * Return the article meta line as Astro renders it:
 *   [author, publication, publicationDate].filter(Boolean).join(' · ')
 *
 * Empty parts are dropped. If nothing is set, the returned value is the
 * empty string — a bound paragraph then renders as an empty <p>. Callers
 * that don't want that should use the `bozzies_article_meta_line()` helper
 * and skip the block entirely when empty.
 */
function bozzies_bindings_article_meta( $source_args, $block_instance, $attribute_name ) {
	$post_id = isset( $block_instance->context['postId'] )
		? (int) $block_instance->context['postId']
		: (int) get_the_ID();
	if ( ! $post_id ) {
		return '';
	}
	return bozzies_article_meta_line( $post_id );
}

/**
 * Return the queried category term's `_bozzies_kicker` meta (Astro's
 * per-hub `kicker` field: "From the 1930s", "Interviews", …). Falls back
 * to the term name if no kicker is set. Called only from bound paragraphs
 * on category archive templates, so `get_queried_object` is the term.
 */
function bozzies_bindings_term_kicker( $source_args, $block_instance, $attribute_name ) {
	if ( ! is_category() && ! is_tax() && ! is_tag() ) {
		return '';
	}
	$term = get_queried_object();
	if ( ! $term || empty( $term->term_id ) ) {
		return '';
	}
	$kicker = get_term_meta( $term->term_id, '_bozzies_kicker', true );
	return $kicker ?: '';
}

function bozzies_article_meta_line( $post_id ) {
	$parts = array();
	$author = get_post_meta( $post_id, '_bozzies_author', true );
	$pub    = get_post_meta( $post_id, '_bozzies_publication', true );
	$date   = get_post_meta( $post_id, '_bozzies_publication_date', true );
	if ( $author ) $parts[] = $author;
	if ( $pub )    $parts[] = $pub;
	if ( $date )   $parts[] = $date;
	return implode( ' · ', $parts );
}
