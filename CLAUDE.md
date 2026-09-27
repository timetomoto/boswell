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
- **THIS commit** — astro-rebuild article list: port article-list / article-row / article-hero / page-hero / article-nav / prose / video-embed CSS; rewrite category.html + single.html to Astro DOM; rewrite `bozzies_wrap_post_navigation` filter to emit `.article-nav__link` shape.

**Build order — one commit per step, riskiest first:**

1. **[DONE via cherry-pick]** Hero (photo) — trial commits already on branch. Verify against new base layer once base ships.
2. **[DONE]** Step 1 inventory — recorded in the "Astro inventory" section below.
3. **[DONE]** Base layer — `theme/bozzies/assets/css/astro/global.css` ports Astro's `global.css` verbatim (with token aliases + WP-scoping edits documented in the file header). `theme.json` adds Instrument Serif font, disables `useRootPaddingAwareAlignments`. `functions.php` enqueues astro/global.css → astro/hero.css → chrome.css in that order (front + editor). Test pages deleted (Sample Page 2, Section styles + patterns test 6, Section styles test 46, Embed test 54). chrome.css kept for now; the dead-code sweep at Step 15 will prune whatever the ported CSS has replaced.
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
3. Do the next step in the build order above. Follow the styling rules block above.
4. After every commit, update this "Current status" block (last commit, next step, any recorded issues) and include the CLAUDE.md change in the same commit.
5. Delete throwaway admin (usually `astroshot`) at the end of any editor-test session.

## Working habits
- Read files with `offset`/`limit` instead of loading whole files; re-read sparingly.
- Paste full reports in chat. Never save report files to disk.
- Local commits only. Never push. Never stage `admin-credentials.txt` or `_screens/`.
- If running low on context room, stop at a clean point, commit (with the CLAUDE.md status update), and report what's done and what remains.
- Verify with browser measurements, colour checks, and by viewing your own cropped screenshots — don't claim "identical" without numbers.
