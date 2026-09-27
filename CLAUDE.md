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

**Last commit:** Task 10 Group 2 complete — page-by-page pass done through Home, Sisters, About, Media, Press, Privacy, 404.

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

**Task 10 Group 2 — complete (three commits):**

Commit 1 `e713cb1` — pullquote + is-style-card-plain foundation:
- Home regression at 1440 and 390: both placeholders render (`[Playlist player: interactive block pending]`, `[Quotes carousel: interactive block pending]`); layout, colours and typography track Astro. `scripts/visual-colors.mjs` at 390: **0 mismatches** (matched=12, missing-in-wp=66 and missing-in-astro=39 are all pathkey-pairing artefacts from CSS text-transform on the skip link and section-class prefixes).
- New block style `is-style-card-plain` (registered on `core/group` + `core/columns`) — paper card with 4 px purple left-accent, purple eyebrow, purple arrow CTA, hairline right/bottom borders. Matches Astro's `.sister-card`.
- Core `wp:pullquote` styled to Astro's `PullQuote.astro`: italic UI face, curly open/close marks via `quotes` + `::before`/`::after`, uppercased brass citation, per-ground colour overrides. Verified live on `/sisters/` and `/sisters/career-timeline/`.

Commit 2 `01bc239` — Sisters + About structural fixes:
- Sister bios (Connee, Martha, Vet): body rebuilt as native blocks — a `wp:group.bozzies-bio-body` wrapping `wp:columns` with the portrait in a 300 px sticky left column and the article prose in the right column. Facts strip is a `wp:group.bozzies-facts` with `wp:paragraph.bozzies-fact` children (`<strong>Label</strong> value`) rendered as an auto-fit CSS grid with a purple left-accent per pair. Sticky verified in a real browser at 1440: `_screens/task-10/connee-wp-sticky{1,2}b.png` show the portrait still at the top-left of the viewport when the article body has scrolled past the section title.
- Sisters hub cards: eyebrow split into a display-face order number (`span.bozzies-card-order`) + small-caps nickname to match Astro's `.sister-card__meta` row; body italicised.
- Bio Resources: hero moved to the gold ground, pull-quote wrapped in its own full-bleed ground-purple section (notes backdrop), and body + book cover placed in a `wp:columns` row with the image on the right (~40%).
- About: intro line changed from `h2 {fontSize: section-title}` to `paragraph.is-style-lede`.
- All content changes also applied to `scripts/import/group1.mjs` so re-imports stay correct. Text diff after re-import: sisters=0/0, martha=0/0, vet=0/0, bio-resources=0/0, about=0/0. Connee has 587 onlyAstro / 5 onlyWP — the missing tokens are the solo career timeline entries which are the `[Sisters timeline: interactive block pending]` placeholder.
- Wrong press-category names in CLAUDE.md fixed. Real categories are `vintage / feature / video / essay / in-their-own-words`.

Commit 3 `78a3319` — Media:
- `/media/` "Five keys to the Boswell sound" inline lesson list: replaced the bullet `ol` with five `bozzies-lesson-row` groups (num + body + cta) styled as a full-width `[num][body][cta]` grid with a 4 px purple left-accent and hairline row separators. Matches Astro's `.lesson-card` layout on the media index. Fulfils the `/media/` inline lesson list carry-over from Group 1.
- `/media/reviews/` rows: seven `h3 + p` pairs wrapped in a `bozzies-reviews` group so each `h3` picks up a hairline top border and the paragraph after each `h3` renders italic in the UI face on muted-ink. Matches Astro's `.reviews-body`.
- Photo-hero coverage carry-over: verified Astro `/media/charts/`, `/media/reviews/`, `/media/discography/` and `/media/lessons/[order]/` all use `ground-purple` heroes (no photo hero), which is what WP already renders. No hero change needed there.
- Text diff after re-import: charts=0/0, reviews=0/0, lesson-1=0/0, lesson-2=0/0. `/media/` has 176 onlyAstro (the actual playlist track list behind the `[Playlist player: interactive block pending]` placeholder). `/media/discography/` has 8 113 onlyAstro (the discography search entries behind the `[Discography search: interactive block pending]` placeholder). Both expected.

Press + Privacy + 404 (verified — no code changes needed):
- Press hub `/press/` renders with the photo hero, five category rows (Vintage Articles, In Their Own Words, Video Features, Features, About the Site), and the "Press releases & media" gold PDF grid. Text diff 0/0.
- All 5 category archives WP row-for-row match Astro (see order tables below). Text diff 0/0 each.
- Six articles spot-checked (one per category): `/press/vintage/02-cats-hepped/` 0/0, `/press/feature/andrews-sisters/` 4/4 (markdown `**bold**` marker artefacts, not real content), `/press/video/alexanders-ragtime-band/` 0/1 (`youtube-nocookie.com` URL token in the WP embed markup), `/press/essay/what-is-getting-bozzed/` 0/0, `/press/in-their-own-words/martha-the-spotlight/` 0/0, `/press/video/boswell-documentary/` 0/0.
- Privacy Policy renders at 1440 and 390 with the full WP-authored content. Astro has no `/privacy-policy/` route — Vercel returns its default 404 there — so this is WP-only content; no diff to compile.
- 404 at any unknown path renders the WP-branded 404 template (`404.html`): "ERROR 404 / The page isn't here" with a four-card section grid (HOME, Sisters, Press, Media). Astro's 404 is Vercel's default generic page — WP's is strictly better.

**Press-hub order tables — WP vs Astro row for row:**

`/press/vintage/` (11 items):
| # | WP | Astro |
|---|----|-------|
| 1 | Part 1: Cats Hepped by Connee's Chirping | Part 1: Cats Hepped by Connee's Chirping |
| 2 | Part 2: Visionary Scoring Put Boswell's Over | Part 2: Visionary Scoring Put Boswell's Over |
| 3 | Another Boswell Chronicle | Another Boswell Chronicle |
| 4 | Bothering the Boswells | Bothering the Boswells |
| 5 | Blending Termed Secret of Boswell Trio's Success | Blending Termed Secret of Boswell Trio's Success |
| 6 | Black Outs | Black Outs |
| 7 | Those Boswell Sisters Talk | Those Boswell Sisters Talk |
| 8 | Boswell Sister Nurses Father Back to Health On Visit Here | Boswell Sister Nurses Father Back to Health On Visit Here |
| 9 | Time for the Boswells | Time for the Boswells |
| 10 | In Harmony with the Boswell Sisters | In Harmony with the Boswell Sisters |
| 11 | Bozzin' With the Brian Sisters | Bozzin' With the Brian Sisters |

`/press/feature/` (10 items):
| # | WP | Astro |
|---|----|-------|
| 1 | We Copied the Boswell Sisters | We Copied the Boswell Sisters |
| 2 | Home at Last | Home at Last |
| 3 | In Perfect Harmony | In Perfect Harmony |
| 4 | It's the Girls (Bette Midler) | It's the Girls (Bette Midler) |
| 5 | The King Sisters | The King Sisters |
| 6 | Lamparski Talks with Connee and Vet | Lamparski Talks with Connee and Vet |
| 7 | Personal Storm of Connee Boswell | Personal Storm of Connee Boswell |
| 8 | Second Line — Post-event Recap | Second Line — Post-event Recap |
| 9 | Steely Bozzies | Steely Bozzies |
| 10 | A Conversation with Vet Boswell | A Conversation with Vet Boswell |

`/press/video/` (10 items):
| # | WP | Astro |
|---|----|-------|
| 1 | Alexander's Ragtime Band | Alexander's Ragtime Band |
| 2 | The Boswell Sisters — A Documentary Feature | The Boswell Sisters — A Documentary Feature |
| 3 | Connee Boswell Double Feature — with the Brian Sisters | Connee Boswell Double Feature — with the Brian Sisters |
| 4 | Constructing YOU-DLE-EE-OO-DE-OO | Constructing YOU-DLE-EE-OO-DE-OO |
| 5 | Crazy People (from "The Big Broadcast") | Crazy People (from "The Big Broadcast") |
| 6 | Falling Star (from "Syncopation") | Falling Star (from "Syncopation") |
| 7 | Lou'siana Waddle (in "Ramblin' Round Radio Row") | Lou'siana Waddle (in "Ramblin' Round Radio Row") |
| 8 | Martha (M'appari) | Martha (M'appari) |
| 9 | Sleepy Time Down South | Sleepy Time Down South |
| 10 | Harlem Hop (in "Under Montana Skies") | Harlem Hop (in "Under Montana Skies") |

`/press/essay/` (2 items):
| # | WP | Astro |
|---|----|-------|
| 1 | What is Getting Bozzed? | What is Getting Bozzed? |
| 2 | Why Bozzies.com? | Why Bozzies.com? |

`/press/in-their-own-words/` (1 item):
| # | WP | Astro |
|---|----|-------|
| 1 | Martha Boswell — The Spotlight | Martha Boswell — The Spotlight |

**Next: Group 3 sitewide audits**

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

**Group 3 (still to do):** page titles / meta descriptions / OG cards, favicon set, axe accessibility sweep, full crawl + network + text-diff + colour-check at both viewports.

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
