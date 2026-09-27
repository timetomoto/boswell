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

**Last commit:** `03ed41b` — Fix sample and donate pixel-diff regression (task 7g).

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
- Patterns: `landing`, `subpage-hero`, `card-grid-2`, `card-grid-3`, `donate-teaser`, `see-also`, `item-hero`, `lesson-row`.
- Ornaments: hero corner brackets (tl/tr/bl/br), hero glyph, jazz divider, four backdrop SVGs.
- Home page built with real Astro copy — the only page with content.
- YouTube embeds forced to `youtube-nocookie.com` and styled to Astro's `.video-embed` (16:9, `--ink` background).
- Visual measurement scripts: `scripts/visual-colors.mjs`, `scripts/visual-backdrops.mjs`, `scripts/visual-diff.mjs`, `scripts/measure-sections.mjs`, `scripts/measure-others.mjs`, `scripts/crop-sections.mjs`.

**Open items**
- Hero at 1440 has ~6% pixel diff vs Astro (photo grayscale/contrast render + heading font-metrics on the same image file). Titles at 1920 read ~5% wider due to font-metric drift on Cormorant Garamond. Neither is content-visible; flagged in earlier 7d/7f/7g reports.
- Playlist player and quotes carousel on the home page are labelled `[Playlist player: added in task 8]` / `[Quotes carousel: added in task 8]` placeholders.
- Ground colour rules are duplicated in `blocks/section/src/style.scss` and `assets/css/chrome.css` (eyebrow colour, button text colour, heading colour). Not a bug; hygiene cleanup.
- `Privacy Policy` copy still has a `[CONTACT EMAIL]` placeholder.
- Two test pages exist in the DB: `Section styles test` (id 46, publish) and `Section styles + patterns test` (id 6, draft). Also an `Embed test` page (id 54) from task 7d. Delete before handoff.

**Only the home page has content.** Every other page and post is empty or missing. About, Sisters, Connee/Martha/Vet, Media, Press, Bio Resources, Career Timeline, Charts, Reviews, Discography, Lessons 1–5, and all article posts still need to be imported from `~/boswell-poc/src/content/` and `~/boswell-poc/src/pages/`.

**Next task — content import (before interactive blocks)**
Import all pages and posts from the Astro source as native editable blocks, with clearly labelled placeholders where a timeline, discography, or player will go. Scope:
- The three sisters: Connee, Martha, Vet — bios and per-sister timelines (`~/boswell-poc/src/content/sisters/`).
- Media hub: Charts, Reviews, Discography, 5 Lessons (`~/boswell-poc/src/content/media/`).
- About, Bio Resources.
- Press: 34 articles across 5 sub-hubs (`~/boswell-poc/src/content/articles/`), plus 9 press releases/PDFs.
- All images, PDFs, MP3s go into the media library with Astro's alt text / titles preserved.
- Verify each imported page with the visible-text Playwright diff (see the Content rules above) — zero visible-text differences before moving on.
Then build the interactive blocks: playlist player, quotes carousel, sisters timeline, discography search — and drop each into its labelled placeholder.

**Working habits**
- Read files with `offset`/`limit` instead of loading whole files; re-read sparingly.
- Verify with browser measurements, colour checks, and by viewing your own cropped screenshots — don't claim "identical" without numbers.
- Paste full reports in chat. Never save report files to disk.
- Local commits only. Never push. Never stage `admin-credentials.txt` or `_screens/`.
- If running low on context room, stop at a clean point, commit, and report what's done and what remains.
