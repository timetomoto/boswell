Read CLAUDE.md. You are one run in an unattended loop on branch astro-rebuild. Do not ask questions.

Do exactly one item: the first unchecked item in "## Rebuild queue". If it is too big to finish with full checks in this run, split it into smaller unchecked items in the queue, do the first one, and leave the rest.

For that item:
1. Read the Astro source. Copy its CSS unchanged into theme/bozzies/assets/css/astro/. Emit Astro's exact markup. Never port from chrome.css. No Custom HTML blocks. Blocks with inner blocks save InnerBlocks.Content.
2. Owner surface: pattern in "Bozzies sections", block, or block style, with Astro classes pre-attached; owner content never wiped.
3. Update the import helpers and re-import only the pages that use this item, so the new CSS is live.
4. Remove the old code this item replaces.
5. Checks, all required: computed-style diff against Vercel at 1440 and 390 paired by Astro class names (zero real mismatches, residuals explained); text diff on affected pages (zero outside placeholders); open each affected page in the editor, save, confirm no change and no validation warnings; owner tests A (inserter), B (pattern), C (pre-typed content) with at least one real sidebar click, test pages deleted; pixel overlay per section (flag over 2%). View only the cropped screenshots you need.
6. Keep context lean: write diff and audit output to files under _screens/, read only summaries and failures.

Then commit on astro-rebuild with check results in the commit body, tick the item in the queue, and update "Current status". If every item is ticked, change the status line to REBUILD-STATUS: DONE. If you hit a real blocker (backup or data loss risk, or nothing can proceed), change it to REBUILD-STATUS: BLOCKED with the reason, commit, and stop.

Never push. Never run wp-env clean or destroy. Never touch keith's user; use a throwaway admin and delete it. Never change main or astro-css-trial.

End with a short report: item done, files changed, check results, anything not matching and why, commit hash.
