#!/usr/bin/env node
// scripts/import/contact-wire-links.mjs
//
// Points the About page's bozzies/about-cta "Contact us" button at /contact/,
// and rewrites the two contact refs in the Privacy Policy to link to the new
// /contact/ page (per privacy-policy update in item 3). Idempotent.

import { wp } from './lib.mjs';

const php = `
// About: set contactHref on the bozzies/about-cta block.
$about = get_post(10);
if ($about) {
	$new = preg_replace_callback(
		'#(<!--\\\\s*wp:bozzies/about-cta\\\\s+)(\\\\{.*?\\\\})(\\\\s*/-->)#s',
		function ($m) {
			$attrs = json_decode($m[2], true);
			if (!is_array($attrs)) return $m[0];
			$attrs['contactHref'] = '/contact/';
			return $m[1] . wp_json_encode($attrs, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . $m[3];
		},
		$about->post_content
	);
	if ($new !== $about->post_content) {
		wp_update_post(['ID'=>10,'post_content'=>wp_slash($new)]);
		echo "About: contactHref set to /contact/.\\n";
	} else {
		echo "About: contactHref already /contact/.\\n";
	}
}

// Privacy: swap the two contact refs to /contact/.
$privacy = get_post(3);
if ($privacy) {
	$content = $privacy->post_content;
	$new_intro = '<!-- wp:paragraph -->' . "\\n" .
		'<p>The site has one form — the <a href="/contact/">contact form</a>. What you type there is emailed to the site owner and stored in the site\\'s WordPress dashboard under the ordinary email rules of the owner\\'s provider; nothing is sent to third-party services. There are no user accounts and no comments.</p>' . "\\n" .
		'<!-- /wp:paragraph -->';
	$content = preg_replace(
		'#<!-- wp:paragraph -->\\\\s*<p>The site has no user accounts, no comments, and no forms\\\\..*?</p>\\\\s*<!-- /wp:paragraph -->#s',
		$new_intro,
		$content
	);
	$new_contact = '<!-- wp:paragraph -->' . "\\n" .
		'<p>Questions or requests: use the <a href="/contact/">contact form</a>.</p>' . "\\n" .
		'<!-- /wp:paragraph -->';
	$content = preg_replace(
		'#<!-- wp:paragraph -->\\\\s*<p>Questions or requests: <a href="mailto:.*?</a>\\\\.</p>\\\\s*<!-- /wp:paragraph -->#s',
		$new_contact,
		$content
	);
	if ($content !== $privacy->post_content) {
		wp_update_post(['ID'=>3,'post_content'=>wp_slash($content)]);
		echo "Privacy: contact refs rewritten to /contact/.\\n";
	} else {
		echo "Privacy: no changes needed.\\n";
	}
}
`;

const out = wp(['eval', php]);
console.log(out.trim());
