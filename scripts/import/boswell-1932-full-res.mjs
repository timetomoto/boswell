#!/usr/bin/env node
// scripts/import/boswell-1932-full-res.mjs
//
// The 1932 hero photograph (attachment id 62) currently serves the
// WordPress -scaled.jpg at 2218×2560 even though the uploaded source
// file (and the identical copy in the Dreamhost backup) is 3119×3600.
// That's WordPress's `big_image_size_threshold` (defaults to 2560 px)
// kicking in: on upload WP generates a `-scaled.jpg` capped at the
// threshold and makes _wp_attached_file point at it. Every page using
// attachment 62 then serves the 2560-cap copy — losing roughly 1.4×
// linear resolution in each dimension.
//
// This patcher:
//   1. Repoints attachment 62's `_wp_attached_file` at the full-res
//      Boswell_Sisters_1932.jpg (the original WP kept alongside the
//      scaled one).
//   2. Deletes the stale -scaled.jpg copy.
//   3. Regenerates every intermediate size (300×300, 1024, 1536, 2048,
//      150×150 crop) from the full-res original — the `-scaled.jpg`
//      is NOT regenerated because this run disables
//      big_image_size_threshold for the duration.
//
// Alt text, attachment id, title, and every link to this image stay
// put, so pages pick up the sharper file automatically.

import { wp } from './lib.mjs';

const php = `
add_filter( 'big_image_size_threshold', '__return_false' );

$id = 62;
$upload_dir = wp_upload_dir();
$current    = get_post_meta( $id, '_wp_attached_file', true );   // 2026/09/Boswell_Sisters_1932-scaled.jpg
$meta       = wp_get_attachment_metadata( $id );
$original   = isset( $meta['original_image'] ) ? $meta['original_image'] : basename( $current );

// Compute the full-res sibling that WP kept next to the scaled file.
$dir       = dirname( $current );
$full_rel  = $dir . '/' . $original;
$full_abs  = $upload_dir['basedir'] . '/' . $full_rel;
$scaled_abs = $upload_dir['basedir'] . '/' . $current;

if ( ! file_exists( $full_abs ) ) {
	echo 'ERR: full-res file not found at ' . $full_abs;
	exit;
}

// 1. Point the attachment at the full-res file.
update_post_meta( $id, '_wp_attached_file', $full_rel );

// 2. Drop the stale -scaled.jpg from disk if it still exists.
if ( $full_rel !== $current && file_exists( $scaled_abs ) ) {
	@unlink( $scaled_abs );
}

// Also clear every intermediate size the old metadata recorded, so the
// regenerate below writes clean replacements (no stale pixels left over
// from the smaller source).
if ( ! empty( $meta['sizes'] ) && is_array( $meta['sizes'] ) ) {
	foreach ( $meta['sizes'] as $size => $info ) {
		if ( empty( $info['file'] ) ) { continue; }
		$abs = $upload_dir['basedir'] . '/' . $dir . '/' . $info['file'];
		if ( file_exists( $abs ) ) {
			@unlink( $abs );
		}
	}
}

// 3. Regenerate the attachment metadata + intermediate sizes.
require_once ABSPATH . 'wp-admin/includes/image.php';
$new_meta = wp_generate_attachment_metadata( $id, $full_abs );
wp_update_attachment_metadata( $id, $new_meta );

echo 'file=' . $full_rel . "\n";
echo 'width=' . $new_meta['width'] . "\n";
echo 'height=' . $new_meta['height'] . "\n";
echo 'sizes=' . implode( ',', array_keys( $new_meta['sizes'] ?? [] ) ) . "\n";
`;

console.log( wp(['eval', php]) );
