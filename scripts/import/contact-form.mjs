#!/usr/bin/env node
// scripts/import/contact-form.mjs
//
// Creates (or updates) the Bozzies contact form (Contact Form 7) with:
//   - Fields: your-name (required), your-email (required), your-message
//     (required, 2–5000 chars), human-check (quiz: "sisters' last name?" =
//     boswell — case-insensitive via wpcf7_canonicalize), honeypot-field
//     (CF7 Apps honeypot plugin), submit.
//   - Mail 1 (notification): to info@bozzies.org, From
//     "Bozzies.org <contact@bozzies.org>", Reply-To the sender.
//   - Mail 2 (confirmation): to the sender, From
//     "Bozzies.org <contact@bozzies.org>", Reply-To info@bozzies.org.
//     Short thank-you only; does NOT echo the message back.
//
// Idempotent: keyed on post title "Bozzies contact form". Preserves _hash
// on re-run so the [contact-form-7 id="…"] shortcode in /contact/ stays
// valid across re-imports.

import { wp } from './lib.mjs';

const php = `
$form_title = 'Bozzies contact form';

// Wipe CF7's seeded "Contact form 1" so the owner sees only our form.
$default = get_posts(['post_type'=>'wpcf7_contact_form','title'=>'Contact form 1','posts_per_page'=>1]);
if (!empty($default)) {
	wp_delete_post($default[0]->ID, true);
	echo 'Deleted CF7 default form id=', $default[0]->ID, "\\n";
}

$existing = get_posts(['post_type'=>'wpcf7_contact_form','title'=>$form_title,'posts_per_page'=>1]);
$existing = !empty($existing) ? $existing[0] : null;

$form_template = <<<'HTML'
<div class="contact-form">

<p class="contact-form__field">
<label for="cf7-name">Your name <span class="contact-form__req" aria-hidden="true">*</span><span class="visually-hidden"> (required)</span></label>
[text* your-name id:cf7-name autocomplete:name]
</p>

<p class="contact-form__field">
<label for="cf7-email">Your email <span class="contact-form__req" aria-hidden="true">*</span><span class="visually-hidden"> (required)</span></label>
[email* your-email id:cf7-email autocomplete:email]
</p>

<p class="contact-form__field">
<label for="cf7-message">Message <span class="contact-form__req" aria-hidden="true">*</span><span class="visually-hidden"> (required)</span></label>
[textarea* your-message id:cf7-message rows:6 minlength:2 maxlength:5000]
</p>

<p class="contact-form__field contact-form__quiz">
[quiz human-check id:cf7-quiz "What was the sisters' last name?|boswell"]
</p>

[honeypot honeypot-field]

<p class="contact-form__submit">
[submit "Send message"]
</p>

</div>
HTML;

$mail = [
	'active' => true,
	'subject' => '[Bozzies.org] New contact message from [your-name]',
	'sender' => 'Bozzies.org <contact@bozzies.org>',
	'recipient' => 'info@bozzies.org',
	'additional_headers' => 'Reply-To: [your-name] <[your-email]>',
	'body' => "A new message arrived from the Bozzies.org contact form.\\n\\nFrom:    [your-name] <[your-email]>\\nSent on: [_date] [_time]\\nPage:    [_url]\\n\\nMessage:\\n[your-message]\\n\\n--\\nThis notification was sent from [_site_title] ([_site_url]).",
	'attachments' => '',
	'use_html' => false,
	'exclude_blank' => false,
];

$mail_2 = [
	'active' => true,
	'subject' => 'Thanks for reaching out to Bozzies.org',
	'sender' => 'Bozzies.org <contact@bozzies.org>',
	'recipient' => '[your-email]',
	'additional_headers' => 'Reply-To: info@bozzies.org',
	'body' => "Hi [your-name],\\n\\nThanks for getting in touch with Bozzies.org — the Boswell Sisters tribute archive. We've received your message and will get back to you as soon as we can.\\n\\n— Bozzies.org\\n[_site_url]",
	'attachments' => '',
	'use_html' => false,
	'exclude_blank' => false,
];

$messages = [
	'mail_sent_ok' => "Thanks! Your message was sent — we'll be in touch.",
	'mail_sent_ng' => "Sorry, there was a problem sending your message. Please try again.",
	'validation_error' => 'One or more fields have an error. Please check and try again.',
	'spam' => 'Sorry, your message was flagged as spam.',
	'accept_terms' => 'You must accept the terms and conditions before sending your message.',
	'invalid_required' => 'Please fill out this field.',
	'invalid_too_long' => 'This field has too many characters.',
	'invalid_too_short' => 'This field is too short.',
	'invalid_email' => 'Please enter a valid email address.',
	'quiz_answer_not_correct' => "Please answer the question with the sisters' last name.",
];

$additional_settings = "acceptance_as_validation: on";

if (!$existing) {
	$post_id = wp_insert_post(['post_type'=>'wpcf7_contact_form','post_title'=>$form_title,'post_status'=>'publish','post_content'=>''], true);
	if (is_wp_error($post_id)) { echo 'ERROR: ', $post_id->get_error_message(); exit(1); }
	echo 'Created form post id=', $post_id, "\\n";
} else {
	$post_id = $existing->ID;
	echo 'Updating existing form post id=', $post_id, "\\n";
}

update_post_meta($post_id, '_form', $form_template);
update_post_meta($post_id, '_mail', $mail);
update_post_meta($post_id, '_mail_2', $mail_2);
update_post_meta($post_id, '_messages', $messages);
update_post_meta($post_id, '_additional_settings', $additional_settings);

$hash = get_post_meta($post_id, '_hash', true);
if (empty($hash)) {
	$hash = uniqid();
	update_post_meta($post_id, '_hash', $hash);
}
echo 'DONE post_id=', $post_id, ' hash=', $hash, "\\n";
`;

const out = wp(['eval', php]);
console.log(out.trim());
