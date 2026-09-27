# bozzies.org WordPress theme

Boswell Sisters tribute archive, migrating from an Astro site to WordPress. One owner-editor, basic WordPress skills.

## References (READ-ONLY, never modify)
- ~/boswell-poc (Astro source: src/components, src/pages, src/content, src/styles, public/uploads)
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
- Never invent copy. Text comes verbatim from the Astro source; otherwise use an obvious labeled placeholder.
- Port Astro SVG/CSS values exactly.
- Measure widths, offsets and gaps in the browser (npm run measure, scripts/gap-measure.mjs), never by arithmetic.
- Compute WCAG AA contrast for every new text/background pair. Accessibility contract: skip link, keyboard access, visible focus, aria-live where content changes, prefers-reduced-motion, alt text.
- Screenshots go in _screens/ (gitignored), using installed Chrome headless.
- Local commits only. Never push. Never stage admin-credentials.txt or _screens/.
- Don't skip steps or mark work partial. If a step can't be finished, stop, don't commit, and report.
- Paste reports in chat. Never save report files.
- Verify version-dependent WordPress facts against official docs and cite them.

## Content
- Source of truth for content: the Astro repo (~/boswell-poc src/content/ Markdown + frontmatter, plus text hardcoded in src/pages/*.astro and components). Before any content import, confirm the commit deployed at https://boswell-poc.vercel.app/ matches the repo HEAD; if not, stop and ask.
- Content must be identical to the live Astro site: same text, same order, same images, same alt text, same links.
- Import as native, editable core/custom blocks (heading, paragraph, list, image, table, quote, etc.). Never dump content into Custom HTML or Classic blocks.
- Images, PDFs and MP3s go into the media library with Astro's alt text/titles.
- Verify every imported page with an automated visible-text diff (Playwright) between the Vercel page and the WP page. Report and fix all differences.

## Styling rules (added in tasks 7e–7g)
- Section ground and backdrop control colour and pattern only. Never font-size, clamp, line-height, padding, margin, gap, width, height, or button size. Only exceptions: ground background-colour, text colour, heading colour, eyebrow colour, link colour, button text + hover colour, backdrop pattern colour.
- Size and spacing come from: font-size presets (theme.json), Section spacing options (Section block), block styles (`is-style-*`), or per-block WP editor attributes (`style.spacing.margin.top`, `fontSize`). No new page-ID CSS. No `render_block` filters for styling.
- Font-size presets (9, at the max the editor should show): Small, Body, Lead, Large, X-Large, Display, **Section title**, **Section title medium**, **Section title small**. The last three are fluid clamps used on the four home section h2s.
- Section spacing options: `standard`, `compact`, `spacious`, `none`, **`roomy-bottom`** (standard top + `clamp(--space-8, 6vw, --space-9)` bottom, used for sample-style sections that end in a CTA button).
- Registered block styles: **`is-style-eyebrow`** and **`is-style-lede`** on `core/paragraph`; **`is-style-play`** (icon + 1rem × 2rem padding) and **`is-style-large`** (0.75rem × 2rem padding) on `core/button`; **`is-style-card`** on `core/group` and `core/columns`; separator/quote variations.
- Eyebrow is `display: inline-block` (matches Astro's baseline offset). Body paragraphs default to base body size — the `.bozzies-para-body` class is a width utility (58ch cap), not a font-size setter; intro body paragraphs pick up the Lead preset per-block.

## Current status

**Last commit:** Task 10 Group 2 (partial): pullquote + paper-card fixes applied; sitewide page pass still pending.

**Done**
- Theme foundation (`bozzies` block theme, no parent, no plugins, no page builder).
- Design tokens in `theme.json`: 10 palette colours, 3 font families (Cormorant Garamond / Source Serif 4 / Inter, self-hosted via `@fontsource`), 9 font-size presets, 8 spacing sizes, custom line-height / letter-spacing / space / motion / measure tokens.
- `bozzies/section` block: grounds (paper / ink / purple / gold / custom-bg + image), backdrops (vinyl / notes / staves / diamond-grid via SVG `mask-image`), width (container / narrow / edge), heading width (container / wide / reading), spacing (standard / compact / spacious / roomy-bottom / none), hero frame, image grayscale + Ken Burns.
- Header (`parts/header.html`) with sticky nav, subline, Donate CTA, full mobile menu (no hamburger; matches Astro 900px breakpoint).
- Footer (`parts/footer.html`) with purple ground, wordmark, tagline, nav, meta, cookie-settings button.
- GA4 (`inc/analytics.php`) with production-only + consent gating.
- Consent banner (`assets/js/consent.js`, `assets/css/consent.css`).
- Privacy Policy page.
- Templates: `page`, `page-landing`, `page-subpage`, `single`, `archive`, `category`, `404`, `index`.
- Patterns: `landing`, `subpage-hero`, `card-grid-2`, `card-grid-3`, `donate-teaser`, `see-also`, `item-hero`, `lesson-row`, `hero-photo`.
- Ornaments: hero corner brackets (tl/tr/bl/br), hero glyph, jazz divider, four backdrop SVGs.
- Home page built with real Astro copy.
- YouTube embeds forced to `youtube-nocookie.com` and styled to Astro's `.video-embed` (16:9, `--ink` background).
- Visual measurement scripts: `scripts/visual-colors.mjs`, `scripts/visual-backdrops.mjs`, `scripts/visual-diff.mjs`, `scripts/measure-sections.mjs`, `scripts/measure-others.mjs`, `scripts/crop-sections.mjs`.
- **All content imported from Astro** (tasks 9 + 9b): Sisters hub + Connee/Martha/Vet bios, About, Bio Resources, Media hub, Charts, Reviews, Discography, Career Timeline, Lessons hub + Lessons 1–5, Press hub with per-sub-hub core Query Loops, the five press categories, 34 article posts with author / publication / publicationDate post_meta (registered `show_in_rest=true`), and nine press-release PDFs linked from `/press/` (no per-release pages).
- Re-runnable import scripts in `scripts/import/`: `group1.mjs` (Sisters + About), `group2.mjs` (Media), `group3.mjs` (Press), shared `lib.mjs` (wp-cli wrapper, idempotent media importer, upsert-by-slug, `heroPhoto()`). Verification harness: `verify.mjs` (Playwright visible-text diff with wp=astro route mapping), `crawl.mjs` (BFS 404 sweep), `alt-audit.mjs` (per-image alt comparison), `network-audit.mjs` (failed subresource sweep).
- **Task 10 Group 1 — shared plumbing for the sitewide style pass:**
  - `page-subpage.html` stripped of placeholder chrome; every page assigned a template. Hubs → `page-landing`: Home (39), About (10), The Sisters (7), Media (9), Press (8), Lessons (23). Details → `page-subpage`: Connee (15), Martha (16), Vet (17), Bio Resources (18), Career Timeline (19), Charts (20), Reviews (21), Discography (22), Lessons 1–5 (24–28). Privacy Policy (3) and Sample Page (2) stay on WP `default` (`page.html`).
  - Full-bleed photo hero option on the Section block: new `is-hero-photo` variant (dark ground + corner brackets + Ken Burns + scrim), reusable `patterns/hero-photo.php`, and a shared `heroPhoto()` helper in `scripts/import/lib.mjs`. Applied to About (`Boswell_Sisters_1932.jpg`), The Sisters (`bozbios.jpg`), Media (`Boswell_Sisters_Bing_Crosby.jpg` + credit line "The Boswell Sisters recording with Bing Crosby."), Press (`bozbuz.jpg`), Lessons (`Boswell_Sisters_1932.jpg`).
  - Single article hero (no double band): `single.html` no longer injects a purple hero; the hero (back link, h1, article-meta binding, pull quote) is emitted from `buildArticleContent` in `group3.mjs` so the pull quote lives inside the same purple band as the title, matching Astro. DOM verified: purple hero → paper body → post-nav.
  - Article details sidebar panel: `assets/js/article-meta-panel.js` (plain JS, no build) enqueued from `functions.php` on post-editor screens only. Exposes `_bozzies_author`, `_bozzies_publication`, `_bozzies_publication_date` via REST. Tested end-to-end (edit → article page + category list picked up the change).
  - Placeholders relabeled to `[<name>: interactive block pending]` across import scripts and the DB — Home (Playlist player, Quotes carousel), Media (Playlist player), Discography (Discography search), Connee (Sisters timeline), Career Timeline (Sisters timeline).
  - Duplicated eyebrow-per-ground and button-on-paper/gold rules removed from `assets/css/chrome.css`; canonical copies remain in `blocks/section/src/style.scss` keyed on `.ground-*`. Colour check at 1440: 0 mismatches.

**Task 10 Group 2 — partial (this commit):**
- Home regression at 1440 and 390: both placeholders render (`[Playlist player: interactive block pending]`, `[Quotes carousel: interactive block pending]`); layout, colours and typography track Astro. `scripts/visual-colors.mjs` at 390: **0 mismatches** (matched=12, missing-in-wp=66 and missing-in-astro=39 are all pathkey-pairing artefacts from CSS text-transform on the skip link and section-class prefixes, not real colour drift).
- **New block style `is-style-card-plain`** (registered on `core/group` + `core/columns`) — paper card with 4px purple left-accent, purple eyebrow, purple arrow CTA, hairline right/bottom borders. Matches Astro's `.sister-card`. Applied to the three sister cards on `/sisters/` (Martha/Connee/Vet); the two subpage teasers (Boz Biography, Career Timeline) stay on `is-style-card` because they sit on the gold ground and Astro renders them as dark purple cards there. Import helper `card()` in `scripts/import/group1.mjs` now takes `variant: 'card' | 'card-plain'`.
- **Core `wp:pullquote` styled to Astro's `PullQuote.astro`** in `chrome.css`: `--font-ui` italic body, `quotes: "\201C" "\201D"` with `::before`/`::after` open/close-quote content, uppercased brass citation. Per-ground overrides mirror the existing `wp-block-quote.is-style-pull-quote` rules (`ground-ink` → champagne body; `ground-purple` → white body + yellow-soft citation + subtle text-shadow). Verified live on `/sisters/` and `/sisters/career-timeline/`.
- YouTube CLAUDE.md line at line 64 was already complete ("YouTube embeds forced to `youtube-nocookie.com` and styled to Astro's `.video-embed` (16:9, `--ink` background).") — no edit needed.

**Next: Group 2 remaining pages + carry-overs, then Group 3**

Group 1 built the shared plumbing (templates, patterns, editor tools). Group 2 does the page-by-page visual pass; Group 3 does the sitewide audits.

## Group 2: Page by page
For each page, screenshot WP and Astro side by side at 1440 and 390, view them, and fix differences using the styling rules. Cover every page type:
- Home (check nothing regressed)
- Sisters hub, Connee, Martha, Vet (sticky scrolling must work like Astro), Bio Resources, Career Timeline
- About
- Media hub, Charts, Reviews, Discography, Lessons hub, all 5 lessons
- Press hub (including the release PDF grid), all 5 category archives, and at least 6 articles covering every category
- Privacy Policy, 404

**Order check:** for the press hub and each category archive, list the article titles in order on WP and on Astro side by side. They must match row for row.

Commit after Sisters/About, after Media, and after Press/other pages.

**Group 2 remaining after the partial pass above — page by page:**
- **Sister bios (`/sisters/connee/`, `/sisters/martha/`, `/sisters/vet/`) — structural rework.** Astro's `SisterBio` layout puts the facts (Born / Died / Hair / Eyes / etc.) in a fixed-column strip above the article (Martha, Vet) or in a sticky left rail (Connee), with the sister portrait floated inside the article body and previous/next sister links plus a "The Sisters" hub link at page-bottom. WP currently renders facts as a plain stacked paragraph list at the top of the article, centres the portrait, and shows the trio's shared prev/next only. **Fix path:** rebuild the sister-bio template — either (a) a per-page block layout with a Columns block (30/70 facts strip / article) and image-align-left on the portrait, or (b) a dedicated `sister-bio` page template PHP + a bindings-driven facts strip that reads `_bozzies_born / _bozzies_died / _bozzies_hair / _bozzies_eyes / _bozzies_complexion / _bozzies_height / _bozzies_marriage / _bozzies_children` from post_meta. Option (b) is cleaner (one source of truth per sister, no re-import needed). Also add the previous/next sister link pair — Astro cycles Martha ↔ Connee ↔ Vet with a link back to `/sisters/` in the centre.
- **`/sisters/bio-resources/` — wrong hero ground and pull-quote treatment.** Astro renders the hero on the **gold** ground (yellow eyebrow "A FAMILY AFFAIR", ink title on gold), a full-bleed purple pull-quote section under it, and a paper section with a two-column layout: article body left, "The Boswell Legacy" book cover on the right. WP renders the hero on **purple**, the pull-quote inline on paper, and centres the book cover above the body. Fix: switch the hero section to `backgroundStyle: 'gold'`, wrap the pull-quote in its own `bozzies/section` ground-purple with the notes backdrop, and put the article body + book cover in a `wp:columns` (image column ~40%, right).
- **`/sisters/career-timeline/` — layout matches Astro through the pull-quote; the actual year-by-year timeline is the `[Sisters timeline: interactive block pending]` placeholder** (as designed). Pull-quote now shows Astro's curly quotes + uppercased citation after this commit's chrome.css change.
- **`/about/` — mostly matching.** Two small diffs: intro line "Bozzies.org is dedicated to preserving the memory of the Boswell Sisters." renders as a display-size heading in WP (h2 with the "Section title" preset) but as a lead-sized single line in Astro; and the small ornament divider between the "Get involved" section and the gold "Get in touch" CTA is present on both but WP shows slightly more vertical padding above it. Fix: change the intro block from h2 → paragraph.is-style-lede (or drop the "Section title" font-size preset). Verify at 390 too.
- **Sisters hub (`/sisters/`) — done in this commit** (paper cards + pullquote). The 4 remaining nits are cosmetic: sister-card body text is italic on Astro (WP is regular); Astro's card-order number is a large display-face "01/02/03" separated from the small-caps nickname on the same row, WP renders one paragraph line "01 MBoz". Not blockers.
- **Home — done in this commit.** Placeholders confirmed, colour check clean at 390.

**Cross-cutting Group 2 work still to do (not yet started this pass):**
- **Media hub (`/media/`), Charts, Reviews, Discography, Lessons hub, all 5 lessons** — screenshots not yet taken at 1440 / 390.
- **Press hub (`/press/`), 5 category archives (`/press/interviews/`, `/press/reviews/`, `/press/features/`, `/press/press-releases/`, `/press/personal-notes/`), at least 6 articles covering every category, Privacy Policy, 404** — screenshots not yet taken. Order-tables (WP vs Astro row-for-row) for the press hub and each category archive still to compile.
- **Photo-hero coverage carry-over from Group 1** — check Astro on `/media/charts/`, `/media/reviews/`, `/media/discography/`, `/media/lessons/N/` and individual article pages; if Astro shows a `heroPhoto` treatment there, apply the same via `heroPhoto()` in `scripts/import/lib.mjs` and re-run the relevant import.
- **`/media/` inline lesson list carry-over** — add the lesson list to the `/media/` page (inline) so it matches Astro. Keep the `/media/lessons/` hub route.

**Group 3 (unchanged from previous notes):** page titles / meta descriptions / OG cards, favicon set, axe accessibility sweep, full crawl + network + text-diff + colour-check at both viewports.

## Group 3: Sitewide checks
1. **Page titles, meta descriptions, and social share previews** (Open Graph/Twitter tags, share image): compare every page's head tags against Astro. Output matching values from the theme (no plugins). Make descriptions editable by the owner where Astro has page-specific ones (e.g. use the page excerpt). Paste a table: page, WP vs Astro title and description, match yes/no.
2. **Site icon/favicon:** match Astro's (all sizes and apple-touch-icon Astro provides).
3. **Accessibility, every page type:** keyboard-only pass (every link and control reachable, visible focus), heading order (one h1, no skipped levels), color contrast AA, image alt text present, landmarks. Run axe (via Playwright) on every page: zero serious or critical issues. Paste results.
4. Re-run the full crawl (zero non-200), network audit (zero real failures), text diff on all pages (zero differences outside placeholders), and color check at 1440 and 390.

Commit Group 3.

**Carry-over gaps from Group 1, handle in Group 2**
- **Photo hero coverage.** Group 1 only added photo heroes to the five hubs (About, Sisters, Media, Press, Lessons). Check whether Astro uses a photo hero on `/media/charts/`, `/media/reviews/`, `/media/discography/`, `/media/lessons/N/`, and individual article pages, and apply the `heroPhoto` pattern where it does.
- **/media/ inline lesson list.** Astro shows the lesson list inline on `/media/`, and its playlist track list currently sits behind the `[Playlist player: interactive block pending]` placeholder. Add the lesson list to `/media/` so it matches Astro. Keep the `/media/lessons/` hub route.
- **Colour check at 390.** Group 1 only ran `scripts/visual-colors.mjs` at 1440 (0 mismatches). Re-run at 390 as part of the Home regression check.
- **Home placeholders.** The Group 1 template table did not include Home; confirm the two placeholders on `/` (`[Playlist player: interactive block pending]`, `[Quotes carousel: interactive block pending]`) actually render on the front.

**After the style pass**
- Build the interactive blocks and drop each into its labelled placeholder: playlist player, quotes carousel, sisters timeline (used on `/sisters/connee/` for the solo timeline and on `/sisters/career-timeline/` for the trio), discography search.
- Read-only survey of `~/bozzies-dreamhost-backup` for higher-resolution originals of images, audio, or PDFs the site already uses, plus a list (no import) of any real content that exists in the DreamHost backup but not in Astro. Vercel is still the target — this pass produces findings only.

**Open items / pre-launch**
- Hero at 1440 has ~6% pixel diff vs Astro (photo grayscale/contrast render + heading font-metrics on the same image file). Titles at 1920 read ~5% wider due to font-metric drift on Cormorant Garamond. Neither is content-visible; flagged in earlier 7d/7f/7g reports.
- `Privacy Policy` copy still has a `[CONTACT EMAIL]` placeholder.
- Three test pages in the DB: `Section styles test` (id 46, publish), `Section styles + patterns test` (id 6, draft), `Embed test` (id 54, from task 7d). Delete before handoff.
- **Delete WordPress default Sample Page (id 2).**
- **Before handoff, delete `theme/bozzies/.import-tmp/`.** The import script stages page content there because `wp-env` doesn't forward stdin. It's gitignored, but it lives inside the theme directory, so it would otherwise ship with the theme zip.
- **Decide whether `scripts/import/` stays in the repo** for the handoff. The scripts are re-runnable and idempotent, but they assume a running local wp-env + a Python HTTP server on `host.docker.internal:8899` for uploads; a fresh owner would not need them.
- **`/media/lessons/` hub is WP-only.** Astro shows the lesson list inline on `/media/` and serves individual lessons at `/media/lessons/N/`. Per settled decisions the WP structure is `/media/lessons/` + `/media/lessons/lesson-N/`; the hub adds a route Astro does not have.
- **Two `render_block` filters exist** in `functions.php` (added in task 9b): `render_block_core/post-template` injects `<span class="bozzies-article-row__num">01</span>` inside each `<li>` on `.bozzies-article-list`, and `render_block_core/post-navigation-link` wraps around to the first/last sub-hub article when there's no adjacent post. These are structural (numbering + wraparound), not styling — the styling-rules ban on `render_block` filters was scoped to visual concerns.

**Working habits**
- Read files with `offset`/`limit` instead of loading whole files; re-read sparingly.
- Verify with browser measurements, colour checks, and by viewing your own cropped screenshots — don't claim "identical" without numbers.
- Paste full reports in chat. Never save report files to disk.
- Local commits only. Never push. Never stage `admin-credentials.txt` or `_screens/`.
- If running low on context room, stop at a clean point, commit, and report what's done and what remains.
