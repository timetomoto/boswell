<?php
/**
 * Title: Lesson card row
 * Slug: bozzies/lesson-row
 * Categories: boswell
 * Description: A single lesson row — big display number on the left, title + summary, "Listen" CTA. Paste five of these into the Lessons page. The purple left rail comes from the .lesson-row class.
 */
?>
<!-- wp:group {"className":"bozzies-lesson-row","layout":{"type":"flex","flexWrap":"nowrap","verticalAlignment":"center"}} -->
<div class="wp-block-group bozzies-lesson-row">
	<!-- wp:group {"className":"bozzies-lesson-row__num","layout":{"type":"default"}} -->
	<div class="wp-block-group bozzies-lesson-row__num">
		<!-- wp:paragraph {"className":"is-style-eyebrow"} --><p class="is-style-eyebrow">Lesson</p><!-- /wp:paragraph -->
		<!-- wp:paragraph {"fontSize":"x-large"} --><p class="has-x-large-font-size" style="line-height:1;color:var(--wp--preset--color--purple)">01</p><!-- /wp:paragraph -->
	</div>
	<!-- /wp:group -->
	<!-- wp:group {"className":"bozzies-lesson-row__body","layout":{"type":"default"}} -->
	<div class="wp-block-group bozzies-lesson-row__body">
		<!-- wp:heading {"level":3} --><h3 class="wp-block-heading"><a href="/media/lessons/1/">Lesson title</a></h3><!-- /wp:heading -->
		<!-- wp:paragraph --><p>A one-line summary of the lesson.</p><!-- /wp:paragraph -->
	</div>
	<!-- /wp:group -->
	<!-- wp:paragraph --><p><a href="/media/lessons/1/">▶ Listen</a></p><!-- /wp:paragraph -->
</div>
<!-- /wp:group -->
