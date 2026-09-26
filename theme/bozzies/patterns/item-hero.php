<?php
/**
 * Title: Item hero (article / bio / lesson)
 * Slug: bozzies/item-hero
 * Categories: boswell
 * Description: Purple hero for a single item (article, sister bio, lesson). Back-link, eyebrow (publication/date/author or lesson number), title, optional pull-quote/subtitle.
 */
?>
<!-- wp:group {"align":"full","className":"is-style-purple","layout":{"type":"constrained"}} -->
<div class="wp-block-group alignfull is-style-purple">
	<!-- wp:paragraph --><p><a href="#">← Back to section</a></p><!-- /wp:paragraph -->
	<!-- wp:paragraph {"className":"is-style-eyebrow"} --><p class="is-style-eyebrow">Publication · Date · Author</p><!-- /wp:paragraph -->
	<!-- wp:heading {"level":1} --><h1 class="wp-block-heading">Article title</h1><!-- /wp:heading -->
	<!-- wp:quote {"className":"is-style-pull-quote"} --><blockquote class="wp-block-quote is-style-pull-quote"><p>An optional pull-quote hero.</p><cite>— Attribution</cite></blockquote><!-- /wp:quote -->
</div>
<!-- /wp:group -->
