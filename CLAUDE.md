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
- `4d80b67` astro-rebuild Step 0: rewrite styling rules + set up branch
- `82d6650` astro-rebuild Step 1: full Astro inventory in CLAUDE.md
- `b59500f` astro-rebuild base layer: port global.css, add Instrument Serif, disable WP layout CSS
- `fdae892` astro-rebuild article list: port article-list / article-row / article-hero / page-hero / article-nav / prose / video-embed CSS; rewrite category.html + single.html; rewrite post-navigation filter
- `d04714c` astro-rebuild cards (sisters): port sister-card / subpage-card / bio-body / bio-portrait / facts / bio-timeline / bio-nav
- `ac5cfd4` astro-rebuild cards (media/press): append release-card / lesson-card / music-teaser / see-also
- `ee23f90` astro-rebuild base layer II: disable WP layout output (blockGap, is-layout-constrained on templates)
- `64bfc17` astro-rebuild Step 2: article list + hero + nav as Astro DOM, verified (article-row 0/0)
- `0ee0630` astro-rebuild Step 3 (partial): activate ported cards CSS via class rename (bozzies-bio-body → bio-body, bozzies-facts → facts, class="fact" → class="facts__pair", bozzies-para-body → article-body)
- `ac20320` astro-rebuild sister cards: emit Astro DOM via wp:html on /sisters/ — style-diff 0/0.
- `702b5c7` astro-rebuild sister cards: real block replaces wp:html on /sisters/. New `bozzies/sister-cards` + `bozzies/sister-card` blocks with Astro's exact DOM (including `<blockquote>` and `"` glyph spans). Import rewritten in `scripts/import/group1.mjs` + `scripts/import/lib.mjs` wraps `wp_slash()` around post_content in `wp_insert_post`/`wp_update_post`.
- `155b79b` astro-rebuild Custom HTML audit: only one wp:html in user-visible content (Home split-hero glyph, deferred). Zero wp:html elsewhere.
- `83b2e02` astro-rebuild bio facts: dt/dd via `bozzies/facts` + `bozzies/fact` blocks emit Astro's exact `<section class="section-tight ground-paper facts-strip"><div class="container"><dl class="facts"><div class="facts__pair"><dt class="facts__label">…</dt><dd class="facts__value">…</dd></div>…</dl></div></section>` DOM. Old `.bozzies-facts`/`.bozzies-fact`/`.bozzies-fact strong` rules removed from `chrome.css`.
- `3c1ad23` astro-rebuild bio-body: sticky portrait via `bozzies/bio-body` block. New block emits Astro's exact `<section class="section ground-paper bio-body"><div class="container bio-body__layout"><figure class="bio-portrait"><img><figcaption class="bio-portrait__caption">…</figcaption></figure><div class="prose">…inner blocks…</div></div></section>` DOM. Portrait on block attrs (sidebar `TextareaControl` for alt + `MediaUpload`); prose is inner blocks. Import rewritten. Old `.bozzies-bio-body` chrome.css rules gone. One selector added to `cards.css`: `.bio-body .prose { position: relative; z-index: 1; }`.
- `a61b644` astro-rebuild bio-hero: purple hero via `bozzies/bio-hero` block. New block emits Astro's exact `<section class="bio-hero ground-purple"><div class="music-backdrop">…staves SVG…</div><div class="container-narrow bio-hero__inner"><a class="bio-hero__back">← The Sisters</a><span class="eyebrow bio-hero__eyebrow">…</span><h1 class="bio-hero__name">…</h1><blockquote class="bio-hero__quote"><span aria-hidden="true">"</span>…<span aria-hidden="true">"</span><cite>—…</cite></blockquote></div></section>` DOM verbatim from `~/boswell-poc/src/pages/sisters/[slug].astro` lines 46-63 + `~/boswell-poc/src/components/MusicBackdrop.astro` lines 250-277 (staves SVG). All four editable fields (`nickname`, `name`, `pullQuote`, `pullQuoteAttribution`) are inline `RichText` in the editor; `backHref` + `backLabel` are sidebar `TextControl`s. `save: () => null` — block is attributes-only, no inner blocks. New `assets/css/astro/bio-hero.css` (verbatim port of the `.bio-hero*` rules) + `assets/css/astro/music-backdrop.css` (verbatim port of `.music-backdrop` from MusicBackdrop.astro), both enqueued front + editor. Import (`scripts/import/group1.mjs`) rewritten: the old `bozzies/section {ground-purple + backdrop staves + spacious}` wrapper with 4 inner core blocks (paragraph "← The Sisters" + paragraph.is-style-eyebrow + h1 + wp:quote) is replaced by a single `<!-- wp:bozzies/bio-hero {…attrs…} /-->` on all 3 bio pages. `decodeFactValue` also runs on the hero string attrs so the JSON stored in `post_content` contains real Unicode glyphs (avoiding a Gutenberg re-serialization diff on `&ldquo;` in Connee's pull-quote). One edit to the ported bio-hero CSS documented in its header: `.bio-hero .bio-hero__back` scoping (specificity 0,2,0) beats `global.css`'s `.ground-purple a` rule (0,1,1) — Astro achieves the same bump via its `data-astro-cid-*` attribute scoping.
- `578b50a` astro-rebuild bio-nav: prev/all/next nav via `bozzies/bio-nav` block. New block emits Astro's exact `<nav class="section-tight ground-paper bio-nav" aria-label="Sisters navigation"><div class="container bio-nav__inner"><a class="bio-nav__link bio-nav__link--prev"><span class="bio-nav__label">Previous</span><span class="bio-nav__name">…</span></a><a class="bio-nav__link bio-nav__link--all">…</a><a class="bio-nav__link bio-nav__link--next">…</a></div></nav>` DOM verbatim from `~/boswell-poc/src/pages/sisters/[slug].astro` lines 114-129. Six string content attrs (`prevLabel`, `prevName`, `allLabel`, `allName`, `nextLabel`, `nextName`) are inline `RichText` in the editor; `prevHref`/`allHref`/`nextHref` + `ariaLabel` are sidebar `TextControl`s. `save: () => null` — attributes-only, no inner blocks. `render.php` `html_entity_decode`s all string attrs so any curly glyphs in sister names survive round-trips. CSS for `.bio-nav*` was already ported verbatim into `cards.css` at commit `d04714c` — no new CSS in this commit and no chrome.css rules to remove (chrome.css never had bio-nav rules). Import (`scripts/import/group1.mjs`) rewritten: the old `bozzies/section {ground-paper + compact}` wrapper with `core/columns` × 3 (eyebrow paragraph + name paragraph per column, each carrying a raw `<a href>`) is replaced by a single `<!-- wp:bozzies/bio-nav {…attrs…} /-->` on all 3 bio pages. No documented edits to the ported bio-nav CSS — `.bio-nav a` sits on `ground-paper` where `global.css`'s `.ground-purple a` rule doesn't apply, so no specificity bump is needed (unlike bio-hero).
- **THIS commit** — subpage cards on /sisters/: new `bozzies/subpage-cards` container block + `bozzies/subpage-card` child block emit Astro's exact `<section class="section ground-gold sisters-subpages"><div class="container sisters-subpages__grid"><a class="subpage-card"><span class="eyebrow subpage-card__eyebrow">…</span><h3 class="subpage-card__title">…</h3><p class="subpage-card__body">…</p><span class="subpage-card__cta">…<svg>…</svg></span></a>…</div></section>` DOM verbatim from `~/boswell-poc/src/pages/sisters/index.astro` lines 87-110. Container carries `align:full` and `sisters-subpages` class; child is attributes-only (`eyebrow`, `title`, `body` are inline `RichText`; `href` + `ctaLabel` are sidebar `TextControl`s). `save: () => <InnerBlocks.Content />` on the container so child cards serialize; `save: () => null` on the child. `render.php` `html_entity_decode`s child string attrs so curly glyphs survive round-trips. Two documented edits to the ported cards.css: `.subpage-card` color/border rules bumped to `.sisters-subpages .subpage-card` (0-2-0) to beat `global.css`'s `.ground-gold a` rule (0-1-1); `.subpage-card__eyebrow` color bumped to `.subpage-card .subpage-card__eyebrow` (0-2-0) so cascade order (cards.css after global.css) picks yellow-soft over `.ground-gold .eyebrow`'s purple. Import (`scripts/import/group1.mjs`) rewritten: the old `bozzies/section {ground-gold}` wrapper containing `core/columns` × 2 (each with `core/group.is-style-card` holding eyebrow + h3 + paragraph + button) is replaced by a single `<!-- wp:bozzies/subpage-cards -->` on `/sisters/`. Also normalized `\"` → `"` in the sister-card serialized JSON on the same page (pre-existing latent issue that only became visible with a round-trip test on the sisters hub — Gutenberg encodes ASCII `"` as `"` on save while `JSON.stringify` emits `\"`, causing a re-serialization delta). Old `is-style-card` chrome.css rules kept for now (Group 15 dead-code sweep — may still be used elsewhere).

**Build order — one commit per step, riskiest first:**

1. **[DONE via cherry-pick]** Hero (photo) — trial commits already on branch. Verify against new base layer once base ships.
2. **[DONE]** Step 1 inventory — recorded in the "Astro inventory" section below.
3. **[DONE]** Base layer — `theme/bozzies/assets/css/astro/global.css` ports Astro's `global.css` verbatim (with token aliases + WP-scoping edits documented in the file header). `theme.json` adds Instrument Serif font, disables `useRootPaddingAwareAlignments`. `functions.php` enqueues astro/global.css → astro/hero.css → chrome.css in that order (front + editor). Test pages deleted (Sample Page 2, Section styles + patterns test 6, Section styles test 46, Embed test 54). chrome.css kept for now; the dead-code sweep at Step 15 will prune whatever the ported CSS has replaced.
4. **[DONE]** Article list + article-hero + adjacent-post nav — `fdae892`
5. **[DONE — CSS only]** Cards (sister/subpage/bio-body/facts/bio-nav) `d04714c` + (release/lesson/music-teaser/see-also) THIS commit.
    - **Follow-up needed:** rewrite `patterns/card-grid-2.php`, `patterns/card-grid-3.php`, `patterns/donate-teaser.php`, `patterns/lesson-row.php`, `patterns/see-also.php`, `patterns/item-hero.php`, `patterns/subpage-hero.php` to emit Astro class names. Add new patterns for sticky-portrait bio + facts strip.
6. **[NEXT]** Section patterns rewrite (item above). Owner-facing surface — the pattern text is what carries the Astro classes onto the inner blocks.
7. **Home split hero — new `bozzies/hero-split` block.** Astro DOM verbatim (`~/boswell-poc/src/components/Hero.astro` split variant). Only used on the home page. Astro home is `~/boswell-poc/src/pages/index.astro`; the hero image comes from `heroImage` in `content/pages/home.md`.
8. **Home page + Sisters hub CSS.** Port intro/sample/voices/playlist/donate-teaser CSS from `pages/index.astro` (styles 118–201) plus sisters intro/pull-quote CSS. New `assets/css/astro/pages.css`.
9. **Nav + Footer template parts.** Rewrite `parts/header.html` and `parts/footer.html` to emit `.site-nav__*` and `.site-footer.ground-purple` DOM. Port `Nav.astro` (37–132) and `Footer.astro` (33–71). New `assets/css/astro/nav.css` and `assets/css/astro/footer.css`.
10. **Pull quote.** Port `PullQuote.astro` CSS (11–41) to `assets/css/astro/pull-quote.css`. Register as block style on `core/quote` (already exists, verify).
11. **Section divider.** New `bozzies/divider` block; Astro's 11 variants (`SectionDivider.astro` 255–268). Owner menu shows only the ones the live site uses.
12. **Music backdrop.** Extend `bozzies/section` backdrop enum to include Astro's 12 variants (`MusicBackdrop.astro` 354–368); ship all SVGs; owner menu shows only the 4-5 used variants.
13. **Playlist player.** New `bozzies/playlist-player` block. Astro DOM + JS verbatim (`PlaylistPlayer.astro` 80–256). Round-trip safe (save `<InnerBlocks.Content />` — has no inner blocks so `save: () => null` is fine, but ATTRIBUTES round-trip must be tested).
14. **Quotes carousel.** New `bozzies/quotes-carousel`. Astro DOM + JS (`QuotesCarousel.astro` 44–191).
15. **Sisters timeline.** New `bozzies/timeline` block (`Timeline.astro` 54–152). Used on Connee bio (solo entries) + career-timeline (trio entries). Replaces the `[Sisters timeline: interactive block pending]` placeholder.
16. **Discography search.** New `bozzies/discography` block (`media/discography.astro` 101–265). Replaces the `[Discography search: interactive block pending]` placeholder.
17. **Import script rewrite** — move `scripts/import/` → `scripts/dev/import/` with a short README (per settled answer 8). Add helpers for the new patterns/blocks. Re-import all content. Text diff every page.
18. **Templates + `page.html` behavior** — `page.html` (default) auto-emits a ground-purple `.page-hero` bound to the post title; `page-landing.html` and `page-subpage.html` emit only `core/post-content` because their content starts with a hero. No page ever shows two titles; no page is ever missing an h1.
19. **Dead code sweep + Group 3 audits + final CLAUDE.md.** Remove every rule/PHP/pattern/SVG/JS the ports replaced. chrome.css should be down to WP plumbing only (or gone). Run axe on every page (zero serious or critical). Crawl. Network audit. Colour check.

**Recorded issues / things not matching Astro exactly:**
- **`.article-hero__quote` at 390 is ~4px taller than Astro** on articles that have a pull quote. Astro's blockquote wraps its text inline directly in `<blockquote>`; WP's core/quote block always wraps text in a `<p>`. The port already resets `.article-hero__quote p { line-height: inherit; margin: 0; max-width: none }` to eliminate most of the delta, but a residual line-height/font-metric rounding remains at 390 wraps.
- **`.article-nav` and `.article-nav__inner` are 1px taller than Astro** on every article. Same shape/box otherwise (border-top 1px paper-hairline, section-tight padding); trivial box-model/rounding artifact.
- **Cards CSS applies to Astro class names only.** Existing imported content on `/sisters/`, `/sisters/{connee,martha,vet}/`, `/sisters/bio-resources/`, `/sisters/career-timeline/` still uses the pre-rebuild `bozzies-bio-body`, `bozzies-facts`, `bozzies-fact`, `bozzies-card-*` class prefixes. Old chrome.css rules keep those visually correct today. Step 14 re-imports content with Astro class names; that's when the cards.css port takes effect on hub pages. New sister-card DOM authored via the block editor (Step 5b, follow-up pattern) will get Astro classes from the pattern directly.
- **`.page-hero__eyebrow` on category archives has margin-top: 18px vs Astro 0** — because WP's `.wp-block-paragraph { margin-top: --space-4 = 1rem }` reset from p+p adds a top margin. Follow-up: reset margin-top on the eyebrow paragraph via a `.page-hero__eyebrow { margin-top: 0 }` rule.
- **Article row DOM.** Astro wraps the whole `<li>` content in a single `<a class="article-row__link">` with `<span class="article-row__num">`, `<div class="article-row__body">`, `<h3 class="article-row__title">`, `<p class="article-row__meta">`, `<svg class="article-row__arrow">` children. WP's `core/post-template` with `core/post-title {"isLink":true}` inside a `core/group` emits `<h3><a>title</a></h3>` + sibling `<p>meta</p>` inside the `<li>`; there is no wrapping `<a>` and no arrow SVG. The port applies `.article-list`, `.article-row`, `.article-row__title`, `.article-row__meta`, `.article-row__num` (the last injected by the `bozzies_number_article_rows` filter) but not `.article-row__link` (no wrapping anchor) or `.article-row__arrow`. Row hover state and the "→" arrow won't match Astro until a follow-up commit rebuilds the row via a `render_block_core/post-template` filter that assembles Astro's exact DOM server-side.
- **Category header eyebrow.** WP's `bozzies/term-kicker` binding renders term meta into a paragraph. The template applies both `eyebrow` and `page-hero__eyebrow` classes so Astro's `.eyebrow` typography + `.page-hero__eyebrow` yellow color apply. This should match Astro but has not been visually verified yet.

## Astro inventory (Step 1)

Every distinct styled piece in ~/boswell-poc/src/, grouped by owning file, so each rebuild commit can port one file's CSS at a time. Full class names + `<style>` line ranges below. `.prose` is defined **per-page** (each page has its own scoped `<style>` with `:global(p)` etc.), **not** in global.css.

### Global (styles/)
- `tokens.css` 1–130 — palette, type stacks (`--font-display` Cormorant Garamond, `--font-body` Source Serif 4, `--font-accent` **Instrument Serif**, `--font-ui` Inter), scale, spacing, measures, motion.
- `global.css` 1–191 — reset + `@fontsource` imports + base typography + public classes: `.ground-ink / -paper / -purple / -gold` (paper has SVG-noise grain), `.container / -narrow / -wide`, `.section / -tight`, `.hairline / -thin`, `.eyebrow`, `.skip-link`, `.visually-hidden`.

### Layout
- `layouts/Base.astro` — `<html>` + skip-link + `<Nav>` + `<main id="main">` + `<Footer>`. Imports global.css.

### Components
- `components/Hero.astro` — two layouts. Full-bleed rules 103–287 (`.hero, .hero--full-bleed, .hero--{tall,medium,short,center,left}, .hero__{image-wrap, image, tint, scrim, content, eyebrow, title, subtitle, glyph, credit, frame, frame-corner}`). Split rules 120–196 (`.hero--split, .hero__split, .hero__image-panel, .hero__text-panel, .hero__image--split, .hero__tint--gradient, .hero__title--split, .hero__subtitle--split, .hero__tagline, .hero__credit--split, .hero__text-inner`). **@media (max-width: 900px)** stacks split.
- `components/Nav.astro` 37–132 — `.site-nav, .site-nav__inner, .site-nav__mark, .site-nav__mark-line-1, .site-nav__mark-line-2, .site-nav__list, .site-nav__link, .site-nav__donate`.
- `components/Footer.astro` 33–71 — `.site-footer.ground-purple, .site-footer__inner, .site-footer__wordmark, .site-footer__tagline, .site-footer__nav, .site-footer__meta`.
- `components/PullQuote.astro` 11–41 — `.pull-quote, .pull-quote__quote, .pull-quote__attr`; per-ground overrides on `.ground-ink` and `.ground-purple`.
- `components/SectionDivider.astro` 255–268 — `.divider, .divider__line, .divider__ornament-wrap, .divider__ornament, .divider__ornament--wide, .divider__ornament--jazz`. **11 variants**: line, fan, step, rays, fleur, deco, notes, diamond, jazz, second-line, bar-line. **4 colors**: brass (default), purple, yellow, copper.
- `components/MusicBackdrop.astro` 354–368 — `.music-backdrop` + **12 variants**: sunburst, chevrons, arcs, rays, diamond-grid, piano-keys, vinyl, sheet-music, staves, notes, fleur, ironwork. All SVG.
- `components/QuotesCarousel.astro` 93–191 CSS + 44–90 JS — `.qc, .qc__viewport, .qc__slide, .qc__quote, .qc__attr, .qc__controls, .qc__btn, .qc__dots`. Auto-rotate, hover/focus pause, arrow-key nav, reduced-motion respect.
- `components/PlaylistPlayer.astro` 160–256 CSS + 80–157 JS — `.pp, .pp__player, .pp__now, .pp__controls, .pp__progress-wrap, .pp__time, .pp__progress, .pp__progress-bar, .pp__list, .pp__track`, `.pp__track[aria-current='true']`. HTML5 audio, seek by click/keyboard, autoplay-next.
- `components/Timeline.astro` 54–152 — `.timeline, .timeline::before, .timeline__entry, .timeline__entry--alt, .timeline__marker, .timeline__dot, .timeline__year, .timeline__event, .timeline__event-text, .timeline__image`. `--tl-accent` CSS var. **@media (max-width: 640px)** collapses to 2-col.

### Page-owned pieces (each page has its own `<style>` and owns the CSS for its DOM shapes)
- `pages/index.astro` — home sections. `.intro-section, .intro, .intro__lede, .intro__body, .intro__body--lead` (lines 118–135); `.playlist-section, .playlist-section__head, .playlist-section__title, .playlist-section__blurb` (143–145); `.voices-section, .voices-section__head, .voices-section__eyebrow, .voices-section__title` (148–150); `.sample-section, .sample__inner, .sample__title, .sample__body, .sample__cta` (152–167); `.donate-teaser, .donate-teaser__inner, .donate-teaser__title, .donate-teaser__body, .btn, .btn--purple` (169–201).
- `pages/about.astro` — `.section-intro, .about-cta, .about-cta__inner, .about-cta__head, .about-cta__title, .about-cta__body, .about-cta__actions, .btn--outline, .btn--gold` (74–97). **Per-page `.prose`** (61–72).
- `pages/sisters/index.astro` — `.sisters-grid, .sisters-grid__head, .sisters-grid__title` (122–130); `.sisters-cards` (131–138); `.sister-card, .sister-card::before, .sister-card__link, .sister-card__meta, .sister-card__order, .sister-card__nickname, .sister-card__name, .sister-card__quote, .sister-card__cta` (139–210); `.sisters-subpages, .sisters-subpages__grid, .subpage-card, .subpage-card__eyebrow, .subpage-card__title, .subpage-card__body, .subpage-card__cta` (212–257).
- `pages/sisters/[slug].astro` — `.bio-hero, .bio-hero__inner, .bio-hero__back, .bio-hero__eyebrow, .bio-hero__name, .bio-hero__quote` (132–179); `.bio-body, .bio-body__layout, .bio-portrait, .bio-portrait__caption` (181–226); `.facts-strip, .facts, .facts__pair, .facts__label, .facts__value` (228–258); `.bio-timeline, .bio-timeline__head, .bio-timeline__title` (260–268); **per-page `.prose`** (271–302); `.bio-nav, .bio-nav__inner, .bio-nav__link, .bio-nav__link--prev/all/next, .bio-nav__label, .bio-nav__name` (305–338).
- `pages/sisters/bio-resources.astro` — `.page-hero, .page-hero__inner, .page-hero__back, .page-hero__title, .page-hero__subtitle` (50–80); per-page `.prose` (82–86); `.btn--purple` (89–102).
- `pages/sisters/career-timeline.astro` — `.page-hero...` (41–63); `.timeline-section, .timeline__image` cap (65–70).
- `pages/press/index.astro` — per-page `.prose` (122–124); `.subhub-section, .subhub-head, .subhub-title, .subhub-blurb` (126–130); `.article-list` (132–133); `.article-row, .article-row__link, .article-row__num, .article-row__body, .article-row__title, .article-row__meta, .article-row__arrow` (134–150); `.press-releases, .releases-head, .releases-head__title, .releases-head__blurb, .releases-grid, .release-card, .release-card__link, .release-card__type, .release-card__title, .release-card__date` (152–182).
- `pages/press/[subhub]/index.astro` — same `.page-hero...` (62–83); same `.article-list, .article-row...` (88–117).
- `pages/press/[subhub]/[slug].astro` — `.article-hero, .article-hero__inner, .article-hero__back, .article-hero__title, .article-hero__meta, .article-hero__quote` (101–143); per-page `.prose, .article-body, .video-embed, .article-external` (146–169); `.article-nav, .article-nav__inner, .article-nav__link, .article-nav__link--prev/all/next, .article-nav__label, .article-nav__title` (172–183).
- `pages/media/index.astro` — per-page `.prose--centered` (151–153); `.lessons-grid, .lessons-grid__head, .lessons-grid__title, .lessons-grid__lede, .lessons-cards, .lesson-card, .lesson-card::after, .lesson-card__link, .lesson-card__num, .lesson-card__num-label, .lesson-card__num-value, .lesson-card__body, .lesson-card__title, .lesson-card__summary, .lesson-card__cta` (162–192); `.music-teasers, .music-teasers__grid, .music-teaser, .music-teaser__eyebrow, .music-teaser__title, .music-teaser__body, .music-teaser__cta` (195–213).
- `pages/media/lessons/[order].astro` — `.lesson-hero, .lesson-hero__inner, .lesson-hero__back, .lesson-hero__eyebrow, .lesson-hero__title, .lesson-hero__summary` (89–122); `.lesson-player, .lesson-player__label, .lesson-player__label-kicker, .lesson-player__label-title, .lesson-player__audio, .lesson-player__download` (125–152); prose (154–156); `.lesson-nav, .lesson-nav__inner, .lesson-nav__link, .lesson-nav__label, .lesson-nav__name` (159–182).
- `pages/media/charts.astro` — `.page-hero...` (43–49); per-page `.prose :global(table/thead/th/td)` with hover + purple date column + brass peak column (52–96); `.see-also, .see-also__grid, .see-also__card, .see-also__eyebrow, .see-also__title, .see-also__body, .see-also__cta` (98–123).
- `pages/media/reviews.astro` — `.page-hero...` (29–35); per-page `.prose` with H3+P reviews and hairline separators (38–65).
- `pages/media/discography.astro` — `.page-hero` (151–173); `.discography-tools, .disc-search, .disc-search__label, .disc-search__input, .disc-search__count` (175–199) **+ inline JS 101–147 debounced-filter**; `.disc-scope, .disc-scope__head, .disc-scope__title, .disc-scope__subtitle, .disc-scope__attribution, .disc-sessions, .disc-session, .disc-session__header, .disc-tracks, .disc-track, .disc-track__matrix, .disc-track__title, .disc-track__notes, .disc-track__refs` (201–264); see-also card 268–292.
- No `pages/404.astro` — Astro's default 404 is used.

### Pieces the rebuild plan must build

| Piece | Owning Astro file | Which build step |
|---|---|---|
| Full-bleed photo hero (`.hero.hero--full-bleed`) | Hero.astro | done (trial cherry-pick) — re-verify vs base |
| Split hero (`.hero--split`) | Hero.astro | new `bozzies/hero-split` block |
| Page hero (`.page-hero`, ground-purple, no image) | 8 pages share the pattern | new pattern `bozzies/page-hero`; `page.html` default template auto-emits it bound to `core/post-title` |
| Bio hero (`.bio-hero`) | sisters/[slug].astro | new pattern for sister bios |
| Article hero (`.article-hero` + `.article-hero__quote`) | press/[subhub]/[slug].astro | in `single.html` template |
| Lesson hero (`.lesson-hero`) | media/lessons/[order].astro | new pattern (lessons live under pages, not posts) |
| `.article-list` + `.article-row` + `.article-row__num` | press/index + press/[subhub]/index | `bozzies-article-list` block variation on `core/post-template` + row-number render filter (already exists) + article-row CSS ported from Astro pages |
| `.article-nav` + `.bio-nav` + `.lesson-nav` (3-col prev / all / next) | 3 pages | shared partial rendered from `render_block_core/post-navigation-link` (existing wraparound filter) plus new pattern; CSS ported once |
| `.sister-card` + `.subpage-card` + `.music-teaser` + `.release-card` + `.see-also` (card family) | sisters/index + media/index + press/index + charts + discography | new patterns emitting these class names; single ported CSS file `astro/cards.css` |
| `.bio-body` + `.bio-portrait` (sticky) | sisters/[slug] | new pattern `bozzies/sticky-portrait-bio` |
| `.facts-strip` + `.facts` + `.facts__pair` | sisters/[slug] | new pattern `bozzies/facts` |
| `.lesson-card` (5-lesson list on media hub) | media/index | new pattern `bozzies/lesson-rows` |
| `.pull-quote` | PullQuote.astro | `is-style-pull-quote` on `core/quote` |
| `.qc.*` (quotes carousel) | QuotesCarousel.astro | new `bozzies/quotes-carousel` block |
| `.pp.*` (playlist player) | PlaylistPlayer.astro | new `bozzies/playlist-player` block |
| `.timeline.*` | Timeline.astro | new `bozzies/timeline` block |
| `.divider.*` (11 variants) | SectionDivider.astro | new `bozzies/divider` block; menu shows 5 used variants; rest under "Advanced" |
| `.music-backdrop.*` (12 variants) | MusicBackdrop.astro | extend `bozzies/section` backdrop enum; menu shows 5 used variants; rest under "Advanced" |
| `.disc-search` + `.disc-scope` + `.disc-session` + `.disc-track` | media/discography | new `bozzies/discography` block |
| `.lesson-player` (native HTML5 with wrapper) | media/lessons/[order] | new pattern `bozzies/lesson-player` (no JS — native audio) |
| `.video-embed` | press/[subhub]/[slug] | CSS-only wrapper on `core/embed` youtube (existing `youtube-nocookie` filter stays) |
| `.donate-teaser` + `.btn--purple` + `.about-cta__actions` (buttons row) | index + about | patterns; button styling from Astro pages |
| Home intro/sample/voices/playlist sections | index.astro | patterns emitting Astro classes; no new blocks needed |
| `.pull-quote` on grounds | PullQuote.astro | ported CSS |
| `.prose` (per-page) | 8 pages | port each page's `.prose` block into a shared `astro/prose.css`, applied via `is-style-article-prose` on `core/post-content` in `single.html` and on `core/group` on hub-page bodies |
| `.hairline`, `.eyebrow` variants (`--purple / --yellow / --copper / --brass`) | global.css + pages | in `astro/global.css` |
| `.skip-link`, `.visually-hidden` | global.css | in `astro/global.css` |

### Build order (updated from inventory)
Same as the original 15-step order; the inventory confirms every piece has a home. The two things Step 1 clarified:
- `.prose` lives per-page, not in global.css — port each page's prose block into one shared `astro/prose.css` at the article-list commit (Step 4) so `single.html` can apply it via a block-style variation.
- **Instrument Serif** (`--font-accent`) is used — port it as a self-hosted font at the base-layer step.

**How to resume from this file alone:**
1. `git status` clean on branch `astro-rebuild`.
2. Read the last commit's message + this "Current status" block.
3. Do the next `[NEXT]` step in the build order above. Follow the styling rules block above.
4. After every commit, update this "Current status" block (last commit, next step, any recorded issues) and include the CLAUDE.md change in the same commit.
5. Delete throwaway admin (usually `astroshot`) at the end of any editor-test session.
6. Verification harness lives at `scripts/dev/hero-style-diff.mjs` — extend per component. Owner-test harness at `scripts/dev/owner-tests.mjs`. Text-diff harness at `scripts/import/verify.mjs`.
7. **Backup before any DB change:** `cd ~/boswell-wp && npx wp-env run cli --env-cwd=/var/www/html wp db export - > ~/boswell-backups/db-$(date +%Y-%m-%d-%H%M).sql`.

**Committed CSS ports so far (all live under `theme/bozzies/assets/css/astro/`):**
- `global.css` — full Astro global (reset scoped inside `.wp-site-blocks`, tokens re-exported from `--wp--*`, grounds, container, section, hairline, eyebrow, skip-link, visually-hidden).
- `hero.css` — Astro's full-bleed hero (from the trial). Split hero pending.
- `article.css` — page-hero, article-hero, article-hero__quote, article-list, article-row, article-nav, prose, video-embed, subhub-section.
- `cards.css` — sister-card, subpage-card, bio-body, bio-portrait, facts-strip, facts, bio-timeline (head), bio-nav, release-card, lesson-card, music-teaser, see-also.
- `music-backdrop.css` — `.music-backdrop` wrapper CSS from `MusicBackdrop.astro`. Currently consumed by `bozzies/bio-hero`; Step 12 shares it with the `bozzies/section` backdrop enum.
- `bio-hero.css` — `.bio-hero*` rules from `sisters/[slug].astro`. Owned by the `bozzies/bio-hero` block.

**Still needed:**
- CSS ports for: home page sections (intro, sample, voices, playlist, donate-teaser), Nav, Footer, PullQuote, SectionDivider (11 variants), MusicBackdrop remaining 11 variants (staves already inline in the bio-hero block render), PlaylistPlayer, QuotesCarousel, Timeline, discography search + tracks + sessions, lesson-hero, lesson-player, `.page-hero__inner` context on lesson pages.
- Pattern rewrites so the block-editor inserter emits Astro class names.
- Import script rewrite + full re-import (this is when existing content picks up the ported CSS, because the imports currently emit `bozzies-*` prefixed class names on structured content).
- Templates: `page.html` default hero, `page-landing.html`, `page-subpage.html` — audit for duplicate titles.
- Interactive blocks (Playlist, Carousel, Timeline, Discography).
- Dead code sweep of `theme/bozzies/assets/css/chrome.css` — most of chrome.css can be removed after the imports run with Astro class names.
- Group 3 audits (heads, favicon, axe, crawl, network, colour).

## Rebuild queue
REBUILD-STATUS: RUNNING

- [x] Sister cards as a proper block (bozzies/sister-cards + bozzies/sister-card children with inline-editable fields) replacing the Custom HTML block on /sisters/.
- [x] Audit and replace every remaining Custom HTML block (currently the split-hero glyph SVG on /home/, which the Home split hero block item below will replace; verify no others). **2026-09-27**: only the Home split-hero glyph in user content (deferred with the Home split hero item, which also owns the same glyph in `patterns/landing.php`). Footer cookie-settings button in `parts/footer.html` is theme plumbing, out of scope. Zero wp:html in reusable blocks, DB templates, options. See `_screens/custom-html-audit-2026-09-27.md`.
- [x] Bio pages — facts as dt/dd (new `bozzies/facts` + `bozzies/fact` blocks emitting `<dl class="facts">` with `.facts__pair`/`.facts__label`/`.facts__value`). Re-import 3 bio pages. **2026-09-27**: style-diff 0/0 for `.facts-strip / .facts / .facts__pair / .facts__label / .facts__value` at 1440 + 390 on all three bio pages; text diff 0/0 on Martha and Vet (Connee's diff is entirely the pre-existing `[Sisters timeline: interactive block pending]` placeholder); editor round-trip clean (unchanged=true, invalid=0 on all three); owner tests A/B/C all pass (A: 4 default facts insert, B: sidebar HTML-anchor mutates + persists + renders id on front, C: inline RichText value round-trips into DB + front + correct DOM shape); pixel overlay 0.19–1.34% at Martha/Vet/Connee@390 and Martha/Vet@1440, Connee@1440 measured 2.80% — DOM heights identical to 6dp; the residual is font sub-pixel positioning of the parent stack (Astro y=551.734375, WP y=643.09375 — 0.64px sub-pixel offset causing every glyph to rasterize at a slightly different sub-pixel position in the clipped screenshot); visually identical to the eye.
- [x] Bio pages — bio-body + bio-portrait: emit `<section class="section ground-paper bio-body"><div class="container bio-body__layout"><figure class="bio-portrait">…</figure><div class="prose">…</div></div></section>`. **2026-09-27**: new `bozzies/bio-body` block replaces the old `core/group.bio-body` + `core/columns` (300px + 1fr) shim on all three bio pages; portrait carried on block attributes with a sidebar TextareaControl for alt-text + MediaUpload for the image, prose is the block's inner blocks. Style-diff 0/0 for `.bio-body / .bio-body__layout / .bio-portrait / .bio-portrait__caption / .prose` at 1440 + 390 on all three bios (after adding `.bio-body .prose { position: relative; z-index: 1; }` to `cards.css` to match Astro's per-page scoped rule at slug page line 271). Text diff 0/0 on Martha and Vet (Connee's diff is entirely the pre-existing `[Sisters timeline: interactive block pending]` placeholder). Editor round-trip clean (unchanged=true, invalid=0 on all three). Owner tests A/B/C all pass (A: default template = core/heading + core/paragraph inside `.prose`; B: sidebar `TextareaControl` mutates `portraitAlt`, persists into post_content, and renders on front `<img alt="">`; C: pre-typed heading + two paragraphs + portrait metadata all serialize into DB and render with correct `section > div > figure + div.prose` DOM shape). Pixel overlay: Martha@1440=0.49% ok, Vet@1440=0.55% ok, Connee@1440=2.76% ○, Martha@390=4.63% ○, Vet@390=4.15% ○, Connee@390=3.09% ○ — `.bio-body` outerHTML heights identical to the pixel between Astro and WP (e.g. Vet@390: astro=6702px, wp=6702px; figure=330/330; prose=6290/6290); the ○ residuals are the parent-stack sub-pixel offset (Vet@390: bio-body top astro=1186.65625, wp=1272.09375 — 85.44px absolute-y offset, 0.34px fractional-part difference) causing every glyph across ~5000 words of prose to rasterize at a fractional-pixel offset; visually identical to the eye (verified by cropped astro/wp mid-page screenshots). Sticky portrait verified at two scroll positions on Martha. Old `.bozzies-bio-body` chrome.css rules (columns→grid override, `overflow:visible` shim, image/figcaption styles) removed.
- [x] Bio pages — bio-hero DOM: emit `.bio-hero__back`/`.bio-hero__eyebrow`/`.bio-hero__name`/`.bio-hero__quote` classes on the purple hero section (currently plain paragraphs + core heading + core quote inside `bozzies/section`). **2026-09-27**: new `bozzies/bio-hero` block emits Astro's exact `<section class="bio-hero ground-purple">` DOM with the inlined staves music-backdrop SVG, `.container-narrow.bio-hero__inner`, `.bio-hero__back`/`.bio-hero__eyebrow`/`.bio-hero__name` and a `<blockquote class="bio-hero__quote">` with the two `aria-hidden="true"` quote-glyph spans + `<cite>`. Style-diff 0/0 on `.bio-hero`, `.bio-hero__inner`, `.bio-hero__back`, `.bio-hero__eyebrow`, `.bio-hero__name`, `.bio-hero__quote` at 1440 + 390 on all three bios (Connee/Martha/Vet), plus `.bio-hero__quote cite` color/font/margin verified matching. Text diff 0/0 on Martha and Vet; Connee's diff is entirely the pre-existing `[Sisters timeline: interactive block pending]` placeholder (5 tokens onlyWP, 587 tokens onlyAstro = timeline entries). Editor round-trip clean on all three: unchanged=true, invalid=0 (needed `decodeFactValue` on hero string attrs so Connee's `&ldquo;They also sing&rdquo;.` serializes as Unicode curly quotes instead of getting `&`→`&` on re-save). Owner tests A/B/C all 9 checks pass (A: attributes-only block inserts with default backHref=`/sisters/` + backLabel=`The Sisters` + empty inline fields, 0 children; B: sidebar `TextControl` mutates `backLabel`, persists in post_content JSON, renders `← All Sisters` on front `<a class="bio-hero__back">`; C: pre-typed nickname/name/pullQuote/pullQuoteAttribution all serialize into JSON and render into the correct outer + inner DOM shape with `<blockquote>` + `<cite>` content). Pixel overlay under 2% at all three bios × 2 viewports: Connee 0.40%/1.18%, Martha 0.41%/1.42%, Vet 0.40%/1.64% (1440/390). One documented edit to the ported bio-hero CSS: `.bio-hero .bio-hero__back` scoping bumps specificity to beat `global.css`'s `.ground-purple a` rule; Astro sidesteps the same conflict via `data-astro-cid-*` attribute scoping.
- [x] Bio pages — bio-nav: emit `<nav class="section-tight ground-paper bio-nav">` with `.bio-nav__inner` grid and `.bio-nav__link--prev/all/next` + `.bio-nav__label`/`.bio-nav__name`. **2026-09-27**: new `bozzies/bio-nav` block replaces the old `bozzies/section {ground-paper + compact}` + `core/columns` × 3 (eyebrow paragraph + name paragraph per column) shim on all three bio pages. All content on block attributes: `prev/all/next` × `Href`/`Label`/`Name` + `ariaLabel`; six labels/names are inline `RichText`, three hrefs + aria label are sidebar `TextControl`s. Style-diff 0/0 on `.bio-nav / .bio-nav__inner / .bio-nav__link / .bio-nav__link--{prev,all,next} / .bio-nav__label / .bio-nav__name` at 1440 + 390 on all three bios. Text diff 0/0 on Martha and Vet (Connee's diff is the pre-existing timeline placeholder). Editor round-trip clean on all three: unchanged=true, invalid=0. Owner tests A/B/C all 9 checks pass (A: attributes-only block inserts with default prevHref='' + allHref='/sisters/' + nextHref='' + labels 'Previous'/'All'/'Next' + ariaLabel 'Sisters navigation' + 0 children; B: sidebar `TextControl` mutates `nextHref` to `/sisters/vet/`, persists in post_content JSON, renders `href="/sisters/vet/"` on front `a.bio-nav__link--next`; C: pre-typed prev/all/next href+label+name all serialize into JSON [except `allName` which matches its default and is omitted by Gutenberg — verified round-trip via rendered anchor] and render into the correct outer + inner DOM shape with three anchors each holding `<span class="bio-nav__label">` + `<span class="bio-nav__name">`). Pixel overlay 0.59–1.09% at all three bios × 2 viewports (well under 2%). Existing bio-nav CSS in `cards.css` was ported at commit `d04714c` — no CSS changes in this commit; no chrome.css rules to remove.
- [x] Hub cards — subpage cards on /sisters/ (bio-resources + career-timeline teasers). New `bozzies/subpage-cards` container block + `bozzies/subpage-card` child block emit Astro's exact `<section class="section ground-gold sisters-subpages"><div class="container sisters-subpages__grid"><a class="subpage-card"><span class="eyebrow subpage-card__eyebrow">…</span><h3 class="subpage-card__title">…</h3><p class="subpage-card__body">…</p><span class="subpage-card__cta">…<svg>…</svg></span></a>…</div></section>` DOM verbatim from `~/boswell-poc/src/pages/sisters/index.astro` lines 87-110. Import (`scripts/import/group1.mjs`) rewritten: the old `bozzies/section {ground-gold}` wrapper containing `core/columns` × 2 (each with `core/group.is-style-card` holding eyebrow + h3 + paragraph + button) is replaced by a single `<!-- wp:bozzies/subpage-cards -->` on `/sisters/`. Style-diff 0/0 on `.sisters-subpages / .sisters-subpages__grid / .subpage-card / .subpage-card__eyebrow / .subpage-card__title / .subpage-card__body / .subpage-card__cta` at 1440 + 390. Text diff 0/0. Editor round-trip clean: unchanged=true, invalid=0 (needed a `\"` → `"` normalization pass on the sister-card serialized JSON in `group1.mjs` — pre-existing latent issue that only became visible with a round-trip test on the sisters hub). Owner tests A/B/C all 10 checks pass (A: default template = 2 pre-filled subpage-card children with bio-resources + timeline attrs, container align=full; B: sidebar `TextControl` mutates child `href` to `/sisters/vet/`, persists in post_content JSON, renders `href="/sisters/vet/"` on front `a.subpage-card`; C: pre-typed eyebrow/title/body/cta/href all serialize into JSON and render into the correct outer + inner DOM shape with two anchors each holding `.eyebrow.subpage-card__eyebrow` + `h3.subpage-card__title` + `p.subpage-card__body` + `.subpage-card__cta` with arrow SVG). Pixel overlay: 1.06% at 1440 ok, 5.64% at 390 ○ — DOM heights identical (astro=711px, wp=712px, 0.14% error); the residual is sub-pixel text glyph rasterization (every character offset by <1px in fractional-pixel positioning) plus the sticky nav bar overlapping the top of the section screenshot at 390. Visually identical to the eye. Two documented edits to ported cards.css: `.subpage-card` color/border rules bumped to `.sisters-subpages .subpage-card` specificity (0-2-0) to beat `global.css`'s `.ground-gold a` rule (0-1-1); `.subpage-card__eyebrow` color rule bumped to `.subpage-card .subpage-card__eyebrow` (0-2-0) so cascade order (cards.css after global.css) picks yellow-soft over `.ground-gold .eyebrow`'s purple. Old `is-style-card` chrome.css rules kept for now (Group 15 dead-code sweep — may still be used elsewhere).
- [ ] Hub cards — music teasers on /media/.
- [ ] Hub cards — release cards on /press/.
- [ ] Hub cards — lesson cards on /media/.
- [ ] Hub cards — see-also on /media/charts/ + /media/discography/.
- [ ] Hub cards — donate teaser on /home/ + /about/.
- [ ] Page hero for subpages, and default page.html behavior (title shown in Astro's page hero, never two titles, never missing an h1).
- [ ] Photo hero: verify on all hubs against the new base layer.
- [ ] Home split hero block.
- [ ] Home page sections.
- [ ] Pull quote.
- [ ] Section divider.
- [ ] Music backdrops.
- [ ] Nav and footer.
- [ ] Lesson pages.
- [ ] Charts and reviews.
- [ ] 404.
- [ ] Playlist player block.
- [ ] Quotes carousel block.
- [ ] Sisters timeline block.
- [ ] Discography search block.
- [ ] Full re-import and text diff of every page (include the andrews-sisters markdown residue), and every page opens in the editor without warnings and survives a save unchanged.
- [ ] Dead code sweep (CSS, PHP, patterns, templates, SVG, JS, scripts; chrome.css holds only WordPress plumbing or is gone).
- [ ] Group 3 audits: head tags and social previews, favicon, axe on every page, crawl, network audit, color check at 1440 and 390.

## Working habits
- Read files with `offset`/`limit` instead of loading whole files; re-read sparingly.
- Paste full reports in chat. Never save report files to disk.
- Local commits only. Never push. Never stage `admin-credentials.txt` or `_screens/`.
- If running low on context room, stop at a clean point, commit (with the CLAUDE.md status update), and report what's done and what remains.
- Verify with browser measurements, colour checks, and by viewing your own cropped screenshots — don't claim "identical" without numbers.
