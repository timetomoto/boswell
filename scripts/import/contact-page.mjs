#!/usr/bin/env node
// scripts/import/contact-page.mjs
//
// Creates (or updates) /contact/ with the ground-purple page hero + the
// Bozzies contact form shortcode. Idempotent by slug. Depends on
// scripts/import/contact-form.mjs having been run first (looks up the
// current CF7 hash to build the shortcode).

import { wp } from './lib.mjs';

const php = `
$slug = 'contact';
$page_title = 'Contact';

$existing = get_page_by_path($slug, OBJECT, 'page');

$forms = get_posts(['post_type'=>'wpcf7_contact_form','title'=>'Bozzies contact form','posts_per_page'=>1]);
if (empty($forms)) { echo 'ERROR: run contact-form.mjs first'; exit(1); }
$form_id = $forms[0]->ID;
$form_hash = get_post_meta($form_id, '_hash', true);
$shortcode = '[contact-form-7 id="' . $form_hash . '" title="Bozzies contact form"]';

$page_hero_attrs = wp_json_encode([
	'align' => 'full',
	'backHref' => '/',
	'backLabel' => 'Home',
	'eyebrow' => 'Say hello',
	'title' => 'Contact',
	'subtitle' => "Questions, corrections, memories to share? Send a note and we'll get back to you.",
	'ground' => 'purple',
	'backdrop' => 'none',
], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

$hero_block = '<!-- wp:bozzies/page-hero ' . $page_hero_attrs . ' /-->';

$intro = '<!-- wp:paragraph {"className":"is-style-lede"} --><p class="is-style-lede">Fill out the short form below. Fields marked with * are required. Your message will land in the site owner\\'s inbox — no third-party services in the middle.</p><!-- /wp:paragraph -->';

$shortcode_block = "<!-- wp:shortcode -->\\n" . $shortcode . "\\n<!-- /wp:shortcode -->";

$body_group = "<!-- wp:group {\\"tagName\\":\\"section\\",\\"align\\":\\"full\\",\\"className\\":\\"section ground-paper contact-section\\",\\"layout\\":{\\"type\\":\\"constrained\\"}} -->\\n"
	. '<section class="wp-block-group alignfull section ground-paper contact-section">'
	. "<!-- wp:group {\\"className\\":\\"container-narrow contact-section__inner\\",\\"layout\\":{\\"type\\":\\"constrained\\"}} -->\\n"
	. '<div class="wp-block-group container-narrow contact-section__inner">' . "\\n"
	. $intro . "\\n\\n" . $shortcode_block . "\\n"
	. '</div>' . "\\n"
	. '<!-- /wp:group -->'
	. '</section>' . "\\n"
	. '<!-- /wp:group -->';

$post_content = $hero_block . "\\n\\n" . $body_group;

$data = [
	'post_type' => 'page',
	'post_title' => $page_title,
	'post_status' => 'publish',
	'post_name' => $slug,
	'post_content' => $post_content,
	'comment_status' => 'closed',
	'ping_status' => 'closed',
];

if ($existing) {
	$data['ID'] = $existing->ID;
	$id = wp_update_post(wp_slash($data), true);
	echo 'Updated /contact/ id=', $id;
} else {
	$id = wp_insert_post(wp_slash($data), true);
	if (is_wp_error($id)) { echo 'ERROR: ', $id->get_error_message(); exit(1); }
	echo 'Created /contact/ id=', $id;
}

// Use page-landing so page.html's default post-title hero doesn't double-render.
update_post_meta($id, '_wp_page_template', 'page-landing');
echo ' (template=page-landing, form_id=', $form_id, ', hash=', $form_hash, ')', "\\n";
`;

const out = wp(['eval', php]);
console.log(out.trim());
