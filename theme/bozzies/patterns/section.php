<?php
/**
 * Title: Section
 * Slug: bozzies/section
 * Categories: boswell
 * Description: A full-width section shell. Pick a Ground style (Paper/Ink/Purple/Gold) and optionally add a backdrop CSS class. Content inside caps at Astro's container width via wide-alignment and gets the section gutter automatically.
 */
?>
<!-- wp:group {"align":"full","className":"is-style-paper","layout":{"type":"constrained"}} -->
<div class="wp-block-group alignfull is-style-paper">
	<!-- wp:paragraph {"className":"is-style-eyebrow","align":"center"} --><p class="is-style-eyebrow has-text-align-center">Eyebrow</p><!-- /wp:paragraph -->
	<!-- wp:heading {"textAlign":"center","level":2} --><h2 class="wp-block-heading has-text-align-center">Section title</h2><!-- /wp:heading -->
	<!-- wp:paragraph {"align":"center"} --><p class="has-text-align-center">One or two sentences of section prose.</p><!-- /wp:paragraph -->
</div>
<!-- /wp:group -->
