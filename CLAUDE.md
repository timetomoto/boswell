# bozzies.org WordPress theme

Boswell Sisters tribute archive, migrating from an Astro site to WordPress. One owner-editor, basic WordPress skills.

## References (READ-ONLY, never modify)
- ~/boswell-poc (Astro source: src/components, src/pages, src/content, src/styles, public/uploads). Reference version: **Astro 6.4.4** (per package.json). If Vercel's build updates, the style-diff harness may drift on gradient serialization; re-pin to the Astro tag currently on Vercel before running the harness.
- https://boswell-poc.vercel.app/ (live Astro site, the visual reference)

## Decisions (do not revisit)
- WordPress native, standalone block theme "bozzies" at theme/bozzies/. No parent theme, no page builder, no WordPress plugins.
- Match the Astro design as closely as possible. Little to no drift.
- Owner can change brand colors; palette presets are defaults, custom pickers stay on.
- Structured content (timeline, playlist, quotes, discography) = custom blocks edited on the page. No ACF, no custom post types.
- Articles = posts, 5 press sub-hubs = categories, URLs /press/{category}/{slug}/. Everything else = pages.
- A custom "Section" block (bozzies/section) is the main owner-facing layout component.
- GA4 (G-K0G0LKX17Z) loads only in production, logged out, after cookie consent.
- Handoff = complete site (theme + database + uploads). No legacy redirects. Donate link added later by the owner.

## Rules
- Only change files in ~/boswell-wp and the local WP database.
- Never run wp-env clean or destroy (wipes the admin account "keith").
- Never touch keith's user; use a throwaway admin for editor tests, delete after.
- Never invent copy. Text comes verbatim from the Astro source; otherwise use an obvious labeled placeholder.
- Port Astro SVG/CSS values exactly.
- Compute WCAG AA contrast for every new text/background pair. Accessibility contract: skip link, keyboard access, visible focus, aria-live where content changes, prefers-reduced-motion, alt text.
- Screenshots go in _screens/ (gitignored), using installed Chrome headless.
- Local commits only. Never push. Never stage admin-credentials.txt or _screens/.
- Paste reports in chat. Never save report files.
- Verify version-dependent WordPress facts against official docs and cite them.

## Content
- Source of truth for content: the Astro repo (~/boswell-poc src/content/ Markdown + frontmatter, plus text hardcoded in src/pages/*.astro and components). Before any content import, confirm the commit deployed at https://boswell-poc.vercel.app/ matches the repo HEAD; if not, stop and ask.
- Content must be identical to the live Astro site: same text, same order, same images, same alt text, same links.
- Import as native, editable core/custom blocks (heading, paragraph, list, image, table, quote, etc.). Never dump content into Custom HTML or Classic blocks.
- Images, PDFs and MP3s go into the media library with Astro's alt text/titles.
- Verify every imported page with an automated visible-text diff (Playwright) between the Vercel page and the WP page. Report and fix all differences.

## Styling rules — the astro-rebuild approach

The Astro CSS trial (branch astro-css-trial, commits 2a31052 + 4edff2b) proved that porting Astro's CSS unchanged and making WordPress emit Astro's exact class names and markup gives a provable computed-style match. The rebuild is built the same way.

- **Astro's CSS is the only source of styling truth.** Copy each Astro `<style>` block, plus the global rules the markup depends on, into `theme/bozzies/assets/css/astro/<component>.css`. **One file per component**, plus `global.css` for the sitewide reset + typography + grounds + layout helpers.
- **Never port from `chrome.css` or any existing hand-written CSS.** Astro's source is the only source. During the port, delete every hand-written rule the ported CSS replaces, in the same commit.
- **The only allowed edits to Astro CSS**: (1) token aliases at the top that re-export the theme's WP custom-property tokens (`--purple: var(--wp--preset--color--purple)` etc.) so the owner's palette pickers still flow through; (2) selector adjustments forced by WordPress wrapper markup (e.g. `.hero__title.wp-block-heading` because `core/heading` adds `wp-block-heading`). **Every edit must be listed in the file header comment**, with a short reason.
- **WordPress output must carry Astro's exact class names and structure.** Custom blocks emit Astro's DOM from `render.php`. Patterns carry Astro's class names hard-coded on inner blocks. Core blocks that carry Astro classes do so via block-style variations (`is-style-eyebrow`, `is-style-lede`, `is-style-card`, `is-style-pull-quote`, etc.) or hard-coded className on pattern-inserted blocks.
- **WordPress layout CSS is turned off** so it cannot fight Astro's CSS. Specifically: `useRootPaddingAwareAlignments` off, `layout.contentSize` narrower than any Astro `.container` measure, no global spacing output. Section-block owns all vertical rhythm. Details recorded in `theme.json` and the base-layer commit.
- **Every block with inner blocks must save `<InnerBlocks.Content />`.** The trial found `save: () => null` silently deleting inner blocks on serialization. Round-trip test in `scripts/dev/block-roundtrip.mjs` runs on every custom block; the build fails if any block drops content.
- **Templates that emit a hero never emit a page title.** Landing + subpage templates render `core/post-content` only. The `page.html` default template auto-emits a ground-purple page hero bound to the post title. No page ever shows two titles, and no page is ever missing an h1.
- **Fonts self-hosted** via `@fontsource` (Cormorant Garamond, Source Serif 4, Inter, and Instrument Serif if used). All Astro fonts included.
- **Backdrops and dividers**: port every Astro variant for parity, but show only the ones the live site uses in the owner's main menu; the rest live behind an "Advanced" collapse.

## Owner surface

- **Inserter → Bozzies sections**: alphabetized tiles for the section patterns (Hero photo, Hero split, Card grid 2/3, Facts strip, Sticky portrait bio, Lesson rows, Playlist player, Pull quote, Quotes carousel, Sisters timeline, Divider, Text section).
- **Inserter → Blocks → Bozzies**: the custom blocks themselves.
- Patterns ship with Astro class names hard-coded on inner blocks. Owner replaces text/images; classes stay.
- Turning any block option on never wipes owner content. Existing headings are annotated in place (see hero-photo toggle).

## Verification per component

Every component port ships four passes before commit:
1. **Computed-style diff** (`scripts/dev/hero-style-diff.mjs` extended per component). Pair by Astro class name, read 30 CSS properties at 1440 + 390. Zero real mismatches; residuals explained.
2. **Text diff** (`scripts/import/verify.mjs`). Zero outside placeholders.
3. **Owner tests** (`scripts/dev/owner-tests.mjs` extended): A (inserter), B (pattern), C (pre-typed content). At least one real sidebar-control click.
4. **Pixel overlay** (new: `scripts/dev/pixel-overlay.mjs`). Fail if > 2 % pixels differ.
5. **Block round-trip test** (`scripts/dev/block-roundtrip.mjs`). Serialize → parse → deep-compare. No validation warnings when the block is opened + saved in the editor.

## Current status — astro-rebuild

**Branch:** astro-rebuild (created from main @ 6b52116). **Do not modify main or astro-css-trial.**

**Backup:**
- `~/boswell-backups/db-before-astro-rebuild-2026-09-27-1556.sql` (6.7 MB MariaDB dump)
- `~/boswell-backups/uploads-before-astro-rebuild-2026-09-27-1556/` (73 files, 53 MB)
- `~/boswell-backups/RESTORE.md` updated

**Commits so far:**
- `6b52116` main baseline
- `0187eb2` cherry-pick from trial: port Hero.astro verbatim, emit Astro DOM
- `d140a99` cherry-pick from trial: owner-first photo hero (toggle, pre-fill, pattern)
- **THIS commit** — CLAUDE.md rewrite: new styling rules, current status placeholder for the rebuild.

**Build order — one commit per step, riskiest first:**

1. **[DONE via cherry-pick]** Hero (photo) — trial commits already on branch. Verify against new base layer once base ships.
2. **[NEXT]** Step 1 inventory — read every file in ~/boswell-poc/src/pages/ (and layouts, styles, and any other folder with markup or CSS). List every distinct styled piece and every style block, with file + line. Commit inventory into this section.
3. **Base layer** — theme.json rebuild (Astro's 17 tokens.css tokens → WP presets + custom); port `global.css` verbatim; disable WP layout CSS; add every font Astro uses; wire enqueues (front + editor); delete 3 test pages + Sample Page (per settled answers).
4. **Article list + article-hero + adjacent-post nav.** Article-row DOM comes from Astro's page files (`src/pages/press/index.astro` etc.), not chrome.css. Ports `.article-list`, `.article-row`, `.article-row__num`, `.article-hero`, `.article-hero__quote`, `.post-navigation` from Astro. Wires `bozzies-article-list` block variation on `core/post-template`; rewrites `single.html` and `category.html`.
5. **Cards + sticky-portrait bio + facts strip.** Ports `.sister-card`, `.card-grid`, `.teaser-card`, `.bio-body`, `.bio-body__portrait`, `.bozzies-facts` (Astro names verified during Step 1) from Astro pages. Rewrites 4 patterns.
6. **Hero (split) — new `bozzies/hero-split` block.** Astro DOM verbatim. Only used on home page.
7. **Nav + Footer template parts.** Rewrite `parts/header.html` and `parts/footer.html` to emit `.site-nav__*` and `.site-footer.ground-purple` markup.
8. **Pull quote.** Port `PullQuote.astro` CSS. Register as block style on `core/quote`.
9. **Section divider.** New `bozzies/divider` block; every Astro variant; owner menu shows only the ones the live site uses.
10. **Playlist player.** New `bozzies/playlist-player` block. Astro DOM + JS verbatim. Round-trip safe.
11. **Quotes carousel.** New `bozzies/quotes-carousel`. Astro DOM + JS.
12. **Sisters timeline.** New `bozzies/timeline` block (Astro's `Timeline.astro`). Used on Connee bio (solo) + career-timeline (trio).
13. **Discography search.** New `bozzies/discography-search` block.
14. **Import script rewrite** — move `scripts/import/` → `scripts/dev/import/` with README; add helpers for the new patterns; re-import all content; text diff every page.
15. **Dead code sweep + Group 3 audits + final CLAUDE.md.**

**Recorded issues / things not matching Astro exactly:**
- (none yet — will be filled in per commit)

**How to resume from this file alone:**
1. `git status` clean on branch `astro-rebuild`.
2. Read the last commit's message + this "Current status" block.
3. Do the next step in the build order above. Follow the styling rules block above.
4. After every commit, update this "Current status" block (last commit, next step, any recorded issues) and include the CLAUDE.md change in the same commit.
5. Delete throwaway admin (usually `astroshot`) at the end of any editor-test session.

## Working habits
- Read files with `offset`/`limit` instead of loading whole files; re-read sparingly.
- Paste full reports in chat. Never save report files to disk.
- Local commits only. Never push. Never stage `admin-credentials.txt` or `_screens/`.
- If running low on context room, stop at a clean point, commit (with the CLAUDE.md status update), and report what's done and what remains.
- Verify with browser measurements, colour checks, and by viewing your own cropped screenshots — don't claim "identical" without numbers.
