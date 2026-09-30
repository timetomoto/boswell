Read the styling rules and the "## Rebuild queue" section of CLAUDE.md. Skip the inventory and hash log unless you need a specific entry. You are one run in an unattended loop on branch astro-rebuild. Do not ask questions.

No verification steps of any kind: no style diffs, text diffs, editor save tests, owner tests, pixel overlays, screenshots, or audits. Keith does visual QA in the browser at the end.

First, make sure the queue has these changes; if not, apply them and include them in this run's commit:
- The Group 3 audits item is replaced with: head tags and social previews, and favicon, matching Astro. Nothing else.
- Before the dead code sweep item, these two items exist:
  - Fix the photo hero: opening and saving a page with it in the editor reorders its saved attributes. Pages must save with zero changes.
  - Release card links: replace the typed URL field with a media library picker for the PDF.

Then do exactly one item: the first unchecked item in the queue.
1. Copy the Astro CSS unchanged into theme/bozzies/assets/css/astro/ and make WordPress output Astro's markup. No Custom HTML blocks. Blocks with inner blocks save InnerBlocks.Content.
2. Give the owner a way to add it (pattern, block, or block style).
3. Update the import helpers and re-import the affected pages.
4. Remove the old code it replaces.
5. Commit on astro-rebuild, tick the item in the queue. If every item is ticked, change the status line to REBUILD-STATUS: DONE. If something truly blocks all progress, change it to REBUILD-STATUS: BLOCKED with the reason.

Never push. Never run wp-env clean or destroy. Don't touch keith's user. Never change main or astro-css-trial.

End with one line: item done and commit hash.
