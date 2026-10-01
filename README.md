# bozzies.org — WordPress

The Boswell Sisters tribute archive — a self-contained WordPress block
theme and the tooling to run and deploy it. This README is written for a
developer joining the project; some sections assume no prior npm, Docker,
or Claude Code background and walk through those tools briefly.

- Production: <https://bozzies.org> on DreamHost Shared Unlimited.
- Owner UI: a single Editor-role account; the Admin role is for maintenance.
- Repo: <https://github.com/timetomoto/boswell>. `main` is live-equivalent.

---

## 1. What this site is and how it was built

The visual design was first prototyped as an Astro site (code lives in a
separate `~/boswell-poc/` tree, kept read-only during the WordPress build
for reference). The WordPress phase does **not** rebuild Astro's design
from scratch — it ports Astro's CSS unchanged into the theme and makes
WordPress emit the same DOM. See `CLAUDE.md` for the full history and
styling rules.

Three consequences flow from that choice:

1. **Astro's CSS is the only styling source**, copied verbatim into
   `theme/bozzies/assets/css/astro/*.css`. We do not re-derive styles.
   When Astro's source changes, the diff is a one-to-one re-port.
2. **WordPress output must carry Astro's exact class names and markup**,
   so the ported CSS matches without selector gymnastics. Custom blocks
   emit Astro's DOM from their `render.php`. Patterns hard-code Astro
   class names on inner core blocks.
3. **WordPress layout CSS is turned off** (`useRootPaddingAwareAlignments:
   false`, narrow `layout.contentSize`, no global block-gap) so it can't
   fight Astro's cascade. The `bozzies/section` block owns vertical
   rhythm.

Content is edited inside the block editor as native core blocks and
custom `bozzies/*` blocks. No ACF, no custom post types (except WP's
`post` for press articles — organised by categories), no page builder.
Pages = pages, posts = press articles, categories = press sub-hubs.

---

## 2. Prerequisites and tooling

- **git** — version control.
- **Docker Desktop** — runs the local WordPress environment. Install
  from <https://www.docker.com/products/docker-desktop/>. Keep it
  running whenever you work on the site.
- **Node.js (current LTS) and npm** — needed only for local tooling
  (wp-env, block builds, verification scripts). The deployed site itself
  does not use Node.
- **An SSH key registered with the DreamHost `khalboz` user** — used by
  `scripts/deploy/*.sh`. Private key stays on the maintainer's machine.
- **Optional: Claude Code** (<https://claude.com/claude-code>). The CLI
  AI assistant that drove most of the build; `CLAUDE.md` is its
  conventions file. Not required to run the site.

### A one-minute npm primer (for hand coders)

`npm install` reads `package.json` and downloads dependencies into
`node_modules/` (gitignored). `npm run <script>` invokes an entry under
`"scripts":`. The scripts this project uses are listed in section 4.

---

## 3. Local setup

```sh
git clone https://github.com/timetomoto/boswell.git
cd boswell
npm install
npm start                # first time: pulls WP container, prints URL
```

Default local URL: `http://localhost:8888`, admin at
`http://localhost:8888/wp-admin`. The default local admin login
is `admin` / `password` — wp-env creates it; do not reuse those on
the live site.

Shut down with `npm stop`. If you ever need a clean slate: `npm run
destroy` wipes the containers and the local database. **Never run
`clean` or `destroy` on the production server** — those are local-only.

Everything in `.wp-env.json` and `.wp-env.override.json` is dev-only.
`.wp-env.override.json` holds the local SMTP settings and the dev-host
mu-plugin mapping; it is **gitignored** so credentials never land in
git. The repo ships a template-less setup — regenerate your own
`.wp-env.override.json` by copying the shape from `CLAUDE.md`'s
pre-launch checklist.

---

## 4. Common commands

```sh
npm start                    # start the local site
npm stop                     # stop containers (data preserved)
npm run destroy              # wipe local containers + DB (dev only)
npm run wp -- theme list     # pass anything to WP-CLI inside the container
npm run build:blocks         # one-off compile of every custom block's src/
npm run start:blocks         # watch mode for block src/
npm run measure              # Playwright-based style/pixel measure helper
```

Deploy and verification scripts live under `scripts/`:

```sh
bash scripts/deploy/deploy-theme.sh         # push theme/ to live (interactive)
bash scripts/deploy/set-live-secrets.sh     # inject DB/SMTP/admin passwords
node scripts/dev/a11y-axe.mjs               # axe sweep across 14 pages
node scripts/dev/a11y-keyboard.mjs          # keyboard-focus sweep
node scripts/dev/ga4-smoke.mjs --action=accept  # GA4 consent-flow test
```

---

## 5. Repo layout

```
theme/bozzies/        the block theme (everything shipped to the server
                      except plugins, uploads, and wp-config)
scripts/deploy/       bash scripts for pushing to and pulling from live
scripts/dev/          Node/Playwright verification scripts (a11y, GA4,
                      visual diffs, roundtrip tests)
scripts/import/       one-shot content importers (owner won't touch
                      these post-launch; kept for provenance)
.wp-env.json          pinned WordPress core version + theme mount
package.json          Node tooling + convenience scripts
CLAUDE.md             project log + conventions. Not shipped to live.
```

### Theme folder map

```
theme/bozzies/
  style.css           classic theme header (name, URI, textdomain)
  theme.json          design tokens, settings, template parts
  functions.php       entry point. Requires inc/*.php, registers hooks
  inc/
    analytics.php     consent-gated GA4 flow
    bindings.php      block-binding sources (bozzies/term-kicker etc.)
    music-backdrop.php shared SVG helper for the Astro backdrops
    owner-caps.php    role-cap tweaks so Editors can use Flamingo
    settings.php      "Bozzies" admin screen (Donate URL)
  parts/
    header.html       template part — wraps the bozzies/site-nav block
    footer.html       template part — wraps the bozzies/site-footer block
  templates/
    index.html        default archive (not used, we have category.html)
    archive.html      secondary archive fallback
    category.html     press sub-hub listing with hidden h2 for a11y
    404.html          "page isn't here" + four hub cards
    single.html       press article layout
    page.html         default page template (adds a purple hero around
                      the post title; used by Privacy Policy)
    page-landing.html page template with no auto-emitted title (used by
                      the hubs — the first block is a hero)
    page-subpage.html subpage template with no auto-emitted title
  patterns/           server-registered patterns (file-per-pattern)
  blocks/             custom blocks (one folder each)
  assets/
    css/
      astro/*.css     verbatim ports of Astro CSS, one file per
                      component. See section 7.
      chrome.css      the thin WP-specific plumbing left after the
                      Astro ports. Shrinks each release.
      consent.css     cookie banner (not part of Astro)
      contact.css     Contact Form 7 styles
    js/
      consent.js      cookie banner behaviour, loads gtag.js on Accept
      quotes-carousel.js
      discography-search.js
      ...             (one per interactive block)
    fonts/*.woff2     self-hosted Cormorant Garamond, Source Serif 4,
                      Inter, Instrument Serif
    img/              theme assets (favicon, screenshots, mark)
    svg/              reusable SVGs
```

### Load order on a front-end request

1. **WP core bootstraps** `wp-config.php` → `wp-settings.php` → loads
   active plugins.
2. **Theme bootstraps**: `functions.php` runs. The `require_once` block
   at the top loads the five `inc/*.php` modules in alphabetical order,
   which register their own hooks.
3. **`theme.json` is parsed** and injected as inline CSS custom
   properties (`--wp--preset--color--purple`, `--wp--custom--space--4`,
   etc.) under `:root` on every page.
4. **Templates render** (`page-landing.html`, `single.html`, etc.) by
   assembling block output. Each custom `bozzies/*` block runs its
   `render.php` and emits HTML inline.
5. **`wp_enqueue_scripts`** fires on every request. `functions.php`
   enqueues `assets/css/astro/global.css` first, then every other
   `astro/*.css` in dependency order, then `chrome.css` last. See
   section 7 for why ordering matters.
6. **`wp_head` and `wp_footer`** fire. The cookie banner and the
   consent JS are enqueued through `inc/analytics.php` and only when
   `bozzies_analytics_active()` returns true (production + logged out).

---

## 6. `theme.json` tokens ↔ Astro variables

Astro declares all design tokens in `~/boswell-poc/src/styles/tokens.css`
as plain CSS custom properties (`--purple`, `--space-4`, `--step-3`,
`--leading-snug`, etc.). WordPress declares the same values in
`theme.json` under `settings.color.palette`, `settings.custom.*`, and
`settings.spacing.spacingSizes`. WordPress then emits them as
`--wp--preset--color--purple`, `--wp--custom--space--4`,
`--wp--preset--spacing--m`, and so on — a longer, auto-prefixed form.

The port can't rewrite every Astro rule to use the WP-prefixed names
(point 1 of the styling rules: Astro's CSS stays verbatim), so
`assets/css/astro/global.css` begins with a block of **token aliases**:

```css
:root {
    --ink:            var(--wp--preset--color--ink);
    --paper:          var(--wp--preset--color--paper);
    --purple:         var(--wp--preset--color--purple);
    /* ... every Astro token re-exported ... */
    --space-4: 1rem;    /* Astro's spacing scale is hard-coded; it
                           doesn't live in theme.json because the owner
                           doesn't change those tokens. */
    --step-3:  1.953rem;
    --leading-snug: 1.24;
}
```

Owner-changeable tokens (grounds, link colour, font families) go
through theme.json so the WP palette picker and typography panels still
flow through them. Non-owner tokens (type scale, spacing, motion
curves) live in `global.css` as fixed values.

### Why not just use the WP-prefixed names?

Three reasons:

1. **Diffs stay readable.** When Astro's source changes, re-porting a
   component is a straight copy-paste followed by one `git diff`.
2. **Scoping stays Astro-shaped.** Astro uses `data-astro-cid-*` to
   scope rules per component; we match specificity on a few selectors
   with documented edits. If selectors already carried `--wp--preset--
   color--*` names, the match would be impossible to re-verify.
3. **Owner tokens still work.** Because the alias layer resolves at
   paint time, every `--purple` in the ported CSS still picks up any
   palette change the owner makes.

---

## 7. Why Astro CSS is copied unchanged

Early in the WordPress build we tried re-authoring the styles against
WP's class names. Every attempt drifted. The "copy Astro's CSS and
make WordPress emit Astro's exact DOM" approach was proven on a trial
branch (`astro-css-trial`, commits `2a31052` and `4edff2b`): computed
styles matched exactly. The rebuild adopted that approach wholesale.

Rules for the port:

- **One file per component**, under `assets/css/astro/`. Named after
  the Astro component (`hero.css`, `nav.css`, `pull-quote.css`, …).
- **Never port from `chrome.css` or any pre-existing hand-written
  CSS.** Astro's source is the single source of truth. When ported,
  delete the hand-written rule it replaces in the same commit.
- **Allowed edits in the ported files**: (a) the token aliases at the
  top of `global.css`; (b) selector adjustments forced by WP wrapper
  markup (e.g. `.hero__title.wp-block-heading` because `core/heading`
  always adds the `wp-block-heading` class). **Every edit must be
  listed in the file-header comment** with a short reason.
- **Enqueue order**: `global.css` first, then the components. CSS
  inside Astro's components can refer to selectors from `global.css`
  but not vice versa, so `functions.php` enqueues them with explicit
  `wp_enqueue_style()` dependency arrays. `chrome.css` is loaded last
  — it carries only WP-plumbing rules (admin-bar body margin, flush
  spacing between full-width sections, cookie-button appearance) and
  shrinks every time we port a new Astro component.

---

## 8. Hooks reference

Every `add_action` / `add_filter` across `functions.php` and `inc/*.php`,
in plain terms. "Why" always comes first.

### `functions.php`

#### `after_setup_theme` → `bozzies_astro_head_supports`
Enables `title-tag` and `excerpt` on pages so WordPress's own
`<title>` logic runs and so the pages have an editable description
field.

#### `document_title_separator` + `document_title_parts`
Match Astro's title format exactly: `"${page title} — The Boswell
Sisters"`. Strips the WordPress tagline, swaps the home page title to
"Meet the Boswells" (from Astro's home.md), and renames press
category archives to `"${label} — Press"`.

#### `wp_head` priority 1 → `bozzies_astro_head_meta`
Prints the `<meta name="description">`, theme-color, and font
preconnect tags Astro's `Base.astro` emits. The description reads
`post_excerpt` on singulars and the term description on categories.

#### `init` → `bozzies_astro_head_strip`
Removes everything in `<head>` that WordPress adds but Astro doesn't:
`wp_generator`, RSS feed links, WLW manifest, REST discovery, oEmbed,
canonical, robots, emoji scripts. Keeps `wp_site_icon` so the admin's
Site Icon drives favicons.

#### `init` → favicon redirect
`/favicon.ico` → 302 to the Site Icon URL set under Settings →
General. WP core's `is_favicon()` path can't be reached here because
our press rewrites would catch the request first, so we handle the
file request ourselves at `init` priority 1.

#### `init` → `bozzies_register_editor_style_variations`
Registers `is-style-eyebrow`, `is-style-lede`, `is-style-hairline`,
and the `is-style-large` button style. These are what the inserter's
Styles panel exposes to the owner.

#### `init` priority 9 → `bozzies_register_pattern_categories`
Creates the "Boswell" and "Bozzies sections" pattern categories so
the inserter's Patterns tab groups our patterns cleanly.

#### `block_categories_all` → `bozzies_register_block_categories`
Adds a "Boz Custom Component" block category for the custom blocks.

#### `init` + `rest_api_init` + related — custom URL rewrites
A compact set of hooks that turns `/press/` into category archives
with URLs of the form `/press/{category-slug}/{post-slug}/`. The
`post_link`, `term_link`, `pre_get_posts`, and `template_redirect`
filters all exist to make WordPress agree about the final URL shape.

#### `render_block_core/table`
Injects `role="region"`, a unique `aria-label`, and `tabindex="0"`
on every `<figure class="wp-block-table">` so narrow-viewport users
can keyboard-scroll the chart tables. (See a11y commit `0e03109`.)

#### `wpcf7_honeypot_html_output`
Rewrites the honeypot plugin's hard-coded `tabindex="1000"` to `-1`
so the decoy input doesn't fail axe's positive-tabindex rule.

#### `render_block_data`
Injects className values onto `core/template-part` renders where
`slug=header` or `slug=footer`, so the outer `<header>` / `<footer>`
elements carry Astro's `site-nav` / `site-footer` classes.

#### `embed_oembed_html` + `oembed_result`
Forces YouTube embeds through `youtube-nocookie.com` and strips the
default `?feature=oembed` so URL shapes match Astro.

#### `the_content` + related
`render_block` hook that assembles Astro's `.article-row` DOM
(wrapping anchor, number span, arrow SVG) for post-template loops.
Core's `core/post-template` can't emit that shape unaided.

#### `get_previous_post_where` / `get_next_post_where` / `*_sort`
Keeps adjacent-post navigation inside the current category so the
"Previous article / Next article" links don't jump between press
sub-hubs.

#### `body_class`
Adds `page-slug-<slug>` on singulars so `article.css` can scope a
few per-page max-widths without a template fork.

#### `pre_get_posts`
Secondary archives order by `menu_order` ascending, matching Astro's
hand-ordered press lists.

#### `run_wptexturize`
Disabled on `post_content` so Astro's curly-quote spans survive
WordPress's smart-quote filter unchanged.

#### `enqueue_block_editor_assets` ×2
First call enqueues the Astro CSS inside the editor iframe (via
`add_editor_style`); second call enqueues the a11y / interactive
block JS so the editor preview matches the front end.

#### `register_post_meta` / `register_term_meta`
Registers `_bozzies_author`, `_bozzies_publication`, and the term
`_bozzies_kicker` so the article-meta binding source and category
eyebrow binding source can resolve.

### `inc/analytics.php`

- `bozzies_analytics_active()` guards: production environment, logged
  out, measurement ID set. `BOZZIES_ANALYTICS_FORCE` constant can
  flip the first two guards for local testing.
- `wp_enqueue_scripts` enqueues `consent.css` and `consent.js`
  (deferred) and inlines a `window.__BOZZIES_CONSENT__` config
  object.
- `wp_footer` emits the cookie banner markup.
- The GA4 measurement ID is defined once as a theme constant
  (`BOZZIES_GA_MEASUREMENT_ID`) — not in the database.

### `inc/bindings.php`

- Registers the `bozzies/article-meta` and `bozzies/term-kicker` block
  binding sources. The former pulls `_bozzies_author`,
  `_bozzies_publication`, and `_bozzies_publication_date` meta into a
  paragraph; the latter pulls `_bozzies_kicker` term meta onto the
  category hero's eyebrow paragraph.

### `inc/music-backdrop.php`

- No hooks — a shared SVG helper (`bozzies_music_backdrop_html()`,
  `bozzies_music_backdrop_svg()`, `bozzies_music_backdrop_defaults()`)
  so every block that paints a `.music-backdrop` reuses the same
  twelve SVG variants (staves, vinyl, notes, diamond-grid, …).

### `inc/owner-caps.php`

- `flamingo_map_meta_cap` filter — remaps `flamingo_edit_inbound_
  messages` and `flamingo_edit_inbound_message` from `edit_users`
  (admin-only) to `edit_pages`, so an Editor can view CF7
  submissions in Flamingo. Delete / spam / Address Book caps stay
  on the plugin's default.

### `inc/settings.php`

- Registers one option, `bozzies_donate_url`, under capability
  `edit_pages` so Editors can edit it. Uses the Settings API for
  form rendering, option registration, and nonces. The header and
  footer "Donate" buttons read from this option; in-content Donate
  buttons keep their per-block URL attributes.

---

## 9. How the custom blocks are built

Every custom block lives at `theme/bozzies/blocks/<name>/` and ships
four pieces:

```
blocks/<name>/
    block.json      metadata: name, category, attributes, supports, references
    render.php      server-side HTML output. The authoritative rendering path.
    src/            editor-side source: edit.js, index.js, style.scss
                    (and sometimes save.js, variations.js). Not shipped
                    to the server; the compiled build/ is.
    build/          webpack output of src/, referenced from block.json
                    (editorScript, viewScript, style, editorStyle).
```

### `block.json`

Standard WordPress block metadata. Three fields matter most:

- `attributes` — the shape of the editor's state for this block.
  Strings, numbers, booleans, nested objects. The editor's state is
  the single source of truth for inline RichText fields; sidebar
  controls bind here too.
- `editorScript: "file:./build/index.js"` — webpack output.
- `render: "file:./render.php"` — the file WordPress calls on each
  front-end render. Receives `$attributes`, `$content` (inner-blocks
  HTML), and `$block`.

### `src/edit.js` — the editor UI

A React component. Renders the inline editing UI inside the block
editor. Three building blocks are common:

- `useBlockProps()` on the outer wrapper so WP adds the right classes
  (`wp-block-bozzies-<name>`) and alignment attributes.
- `RichText` on each inline-editable text attribute so the owner
  can type / format / use the floating toolbar inline.
- `InspectorControls` for sidebar panels — `TextControl`,
  `SelectControl`, `ToggleControl`, `MediaUpload`, etc. Reach for the
  sidebar when the thing isn't text (URLs, images, enums, booleans).
- `InnerBlocks` for container blocks (e.g. `bozzies/section`,
  `bozzies/voices-section`, `bozzies/subpage-cards`). Pass an
  `allowedBlocks` array to constrain what the owner can insert, and
  a `template` for the default child set.

### `src/index.js`

Calls `registerBlockType` with the config imported from `block.json`
and attaches the `edit` function (and sometimes `save` — see the next
paragraph).

### `save` — the serializer

Almost every custom block uses `save: () => null`. That means the
block saves no HTML inside its block comment — only attributes. The
front end builds the HTML from `render.php` using those attributes.
This separation prevents the "editor and front end disagree" class of
bug common in classic blocks.

**Container blocks that take inner blocks must save `<InnerBlocks.
Content />`.** Returning null when inner blocks exist silently
discards them on save. `scripts/dev/block-roundtrip.mjs` enforces this
by serializing → parsing → deep-comparing every custom block.

### `render.php` — the authoritative front-end markup

A plain PHP file with top-of-file documentation of exactly which
Astro file + line range the markup is based on. Guards:

```php
if ( ! defined( 'ABSPATH' ) ) { exit; }

$attrs = wp_parse_args(
    isset( $attributes ) && is_array( $attributes ) ? $attributes : array(),
    array( /* defaults for every attribute */ )
);
```

The `$content` parameter contains inner-blocks HTML; container blocks
echo it in place. Attribute strings are `html_entity_decode`'d (because
Gutenberg stores curly glyphs as `&ldquo;` / `&rdquo;` in JSON) and
re-escaped with `esc_html()` / `esc_attr()` / `esc_url()` on output.

### Inserter previews

Patterns (section 10) are what the owner inserts. Each pattern file
hard-codes Astro class names on the inner core blocks so the preview
renders with the right styling as soon as it's inserted.

### Where editor styles come from

Astro CSS is enqueued inside the block editor through
`add_editor_style()` so the editor preview looks like the front end.
This runs in a sandboxed iframe (WordPress 5.9+) which can see only
what we tell it; `functions.php` passes the full `astro/*.css` list.

---

## 10. What needs a build and what doesn't

**Rebuild only when `blocks/*/src/*` changes.** Everything else —
PHP, CSS under `assets/css/`, JS under `assets/js/`, templates,
patterns — is loaded at request time.

To rebuild a block after editing its `src/`:

```sh
npm install            # one-time, pulls @wordpress/scripts
npm run build:blocks   # compiles every blocks/*/src into blocks/*/build
```

Watch mode during active development:

```sh
npm run start:blocks
```

The compiled `build/` folders **are checked into git** so the server
doesn't need Node. If you edit a block's `src/` and forget to rebuild
before deploying, the block will render stale editor behaviour until
you do.

CSS and PHP changes are instant — refresh the browser.

---

## 11. Recipes

### Add a new custom block

1. Copy an existing block folder as a starting point (e.g. `cp -r
   theme/bozzies/blocks/pull-quote theme/bozzies/blocks/my-block`).
2. Rename everything inside: `block.json` → `"name": "bozzies/
   my-block"`, update `title`, `description`, `attributes`.
3. Edit `src/edit.js` so the editor UI matches the attributes.
4. Edit `src/index.js` to import the right block.json / edit.
5. Write `render.php`. If porting from Astro, add a top-of-file
   comment pointing to the Astro file + line range.
6. Run `npm run build:blocks`.
7. Insert it from the inserter under "Boz Custom Component" and
   confirm attributes round-trip through editor save / reload /
   front-end render.
8. If it carries inner blocks, add a round-trip test entry in
   `scripts/dev/block-roundtrip.mjs`.

### Add a new pattern

1. Create `theme/bozzies/patterns/my-pattern.php`. The leading
   docblock drives inserter metadata:
   ```php
   <?php
   /**
    * Title: My pattern
    * Slug: bozzies/my-pattern
    * Categories: bozzies-sections
    * Keywords: hero, intro
    * Viewport Width: 1200
    */
   ?>
   <!-- wp:bozzies/section {"backgroundStyle":"paper"} -->
   <!-- wp:heading {"className":"hero__title"} --><h2 class="wp-block-heading hero__title">Hello</h2><!-- /wp:heading -->
   <!-- /wp:bozzies/section -->
   ```
2. The pattern is live immediately — WordPress discovers it on next
   admin load. No code to add elsewhere.

### Change the palette

1. Edit `theme/bozzies/theme.json` → `settings.color.palette`. Add or
   edit a palette entry; keep the `slug` stable.
2. The slug flows through as `--wp--preset--color--<slug>`. Any
   ported Astro rule that references `--purple` will see the new
   value through the alias in `assets/css/astro/global.css`.
3. If you add a brand-new slug, add it to the alias block too.

### Deploy a theme change to live

1. Commit your changes locally. **Do not push without reviewing.**
2. Run the deploy script:
   ```sh
   bash scripts/deploy/deploy-theme.sh
   ```
   It does a dry-run first and prompts before touching the server.
3. If you're confident:
   ```sh
   bash scripts/deploy/deploy-theme.sh --yes
   ```
4. The script syncs `theme/bozzies/` only — plugins, core, uploads,
   and the database are left alone.
5. Push to GitHub when ready: `git push origin main`.

### Pull the live site down to local (DB + uploads)

See `scripts/deploy/pull-live.sh` (if present) or do it manually:

```sh
# Export live DB with URL rewrites back to localhost
ssh khalboz@bozzies.org "cd /home/khalboz/bozzies.org && \
  wp search-replace 'https://bozzies.org' 'http://localhost:8888' --export=/tmp/live.sql --all-tables --precise --skip-columns=guid"
scp khalboz@bozzies.org:/tmp/live.sql ~/boswell-backups/
npm run wp -- db import ~/boswell-backups/live.sql

# Pull uploads
rsync -avz khalboz@bozzies.org:/home/khalboz/bozzies.org/wp-content/uploads/ \
  "$(docker volume inspect --format '{{.Mountpoint}}' <wp-env-wordpress-vol>)/wp-content/uploads/"
```

The owner may make content edits on the live site after launch. Only
pull live → local until that happens; once the owner is editing live,
local overrides would overwrite their work.

---

## 12. Plugins and why we use them

Four plugins, all free from WordPress.org:

- **Contact Form 7** — one form on `/contact/`. Runtime for the
  message box, email delivery, success / error UX.
- **CF7 Apps Honeypot** — spam deterrent on the same form. Hidden
  decoy input that bots fill and humans don't. We filter its default
  `tabindex="1000"` down to `-1` in `functions.php` for a11y.
- **Flamingo** — logs CF7 submissions to a WordPress admin screen so
  the owner can read messages even if an SMTP delivery hiccups. See
  `inc/owner-caps.php` for the capability tweak that lets Editors
  reach it.
- **WP Mail SMTP** — relays outbound mail through DreamHost's
  authenticated SMTP so WordPress emails (CF7 notifications,
  password-reset mails, etc.) actually land. Configured through
  `WPMS_*` constants in `wp-config.php`; the password is injected by
  `scripts/deploy/set-live-secrets.sh` and lives in that file alone.

WordPress's own "Hello Dolly" and "Akismet" are explicitly **not**
installed on the live site. If a one-click install ever re-adds
them, remove with `wp plugin delete hello akismet`.

---

## 13. Analytics and consent

GA4 property `G-K0G0LKX17Z` collects anonymous page views, but only:

1. In the `production` environment (`WP_ENVIRONMENT_TYPE === 'production'`
   via wp-config). Local dev is `development` and never fires GA.
2. When the visitor is logged out (`is_user_logged_in()` returns false).
3. After the visitor clicks **Accept** on the cookie banner.

Implementation path:

- Server side: `inc/analytics.php` gates everything on the three
  conditions above. If all pass, it enqueues `consent.css` + `consent.js`
  and prints the banner markup in the footer.
- Client side: `assets/js/consent.js` reads the `bozzies_cookie_consent`
  cookie. `accept` → `loadGoogleTag()` which injects
  `googletagmanager.com/gtag/js?id=G-K0G0LKX17Z`. `decline` → nothing
  loads, cookie remembers the choice for 180 days.
- The footer "Cookie settings" button re-opens the banner so a
  visitor can change their mind.
- `scripts/dev/ga4-smoke.mjs` end-to-end tests this on any host.

---

## 14. Do-not-delete

Removing or modifying any of the following will take the site down or
cause silent data loss:

- `bozziecomwp09` MySQL database on `mysql.bozzies.org`. The legacy
  WordPress install also lives in this database under the `wp_rv1tum_`
  prefix. Our site uses the `wpboz_` prefix. Dropping the DB or
  renaming either prefix will break both sites.
- `/home/khalboz/bozzies.org-old-2026-10-01/` on the server. 2.2 GB
  snapshot of the pre-WordPress static site, kept as a safety net.
- The `khalboz` SSH user and its authorized key. Every deploy script
  relies on it; losing the key means losing SSH access.
- The `contact@bozzies.org` DreamHost mailbox. Changing its password
  breaks outbound CF7 delivery until `WPMS_SMTP_PASS` in wp-config is
  re-injected via `scripts/deploy/set-live-secrets.sh`.
- The four plugins listed in section 12. The theme assumes they are
  present and active.
- The `bozzies` theme folder on the server. The site has no fallback
  theme — breaking the active theme breaks the site.
- `wp-config.php` on the server. The salts and secrets inside are
  install-specific; a backup copy before any edit is wise.

Local-only operations that would be destructive on the live server:

- `npm run clean` — resets the local wp-env database.
- `npm run destroy` — wipes local containers and volumes.
- `wp db drop / reset / clean` — wipes the WordPress database.
- `rm -rf wp-content/uploads` — deletes all media.

**Never run those against the live server.**

---

## 15. Where to look next

- `CLAUDE.md` — long-form project log, every design decision, every
  commit summary. The source of truth for build-order history and
  styling conventions.
- `scripts/deploy/` — deploy and backup toolkit.
- `scripts/dev/` — verification harnesses (a11y, GA4, visual diffs,
  roundtrip tests). Add new ones here when a regression needs
  guarding against.
- The two owner-facing guides in Google Drive (My Drive/Boswell/
  Guides/). Written for the Editor-role owner, not developers.
