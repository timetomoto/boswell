# bozzies.org — WordPress theme

The Boswell Sisters tribute archive, a WordPress block theme. Live at
<https://bozzies.org> since **2026-10-01**.

> Post-launch note: the **live database is the source of truth**. The
> owner edits live. **Never push the local database to live again.** Use
> `scripts/deploy/pull-live.sh` to bring live data down to local.

## References (READ-ONLY, never modify)
- `~/boswell-poc` — Astro source the design was ported from (src/components, src/pages, src/content, src/styles, public/uploads). Reference tag: **Astro 6.4.4** per its package.json. If Vercel's build changes, the style-diff harness may drift on gradient serialization; re-pin to the Astro tag live on Vercel before running the harness.
- <https://boswell-poc.vercel.app/> — the original Astro site, retained as the visual reference.

## Live state

- **URL**: <https://bozzies.org>.
- **Hosting**: DreamHost Shared Unlimited.
- **Web folder**: `/home/khalboz/bozzies.org/`.
- **Old-site backup**: `/home/khalboz/bozzies.org-old-2026-10-01/` (2.2 GB). Do not delete.
- **WordPress**: 7.1.2.
- **PHP (web / FastCGI)**: 8.3.30 — serves every HTTP request.
- **PHP (shell / WP-CLI)**: 8.2.30 — used by SSH scripts. Difference is expected on DreamHost shared and does not break WP-CLI.
- **SSH**: `khalboz@bozzies.org`, key-based auth. The deploy scripts assume the key is loaded.

### Database

- **DB name**: `bozziecomwp09` on `mysql.bozzies.org`, user `bozzies_wp_user`.
- **Our prefix**: `wpboz_` (18 tables).
- **Legacy prefix**: `wp_rv1tum_` (10 tables, from an older WordPress install in the same database). **Untouched. Do not drop or rename.**
- **wp-config.php**: on the live server only, not in this repo. Carries DB creds, fresh salts, `WP_ENVIRONMENT_TYPE=production`, `WP_DEBUG=false`, `DISALLOW_FILE_EDIT=true`, and `WPMS_*` SMTP constants. Rotate the SMTP / DB passwords with `scripts/deploy/set-live-secrets.sh`.

### Users

- **Administrators only.** Both the site owner (Cynthia) and the developer (Keith) run under full Administrator accounts. No Editor, Author, Contributor, or Subscriber accounts exist on the live site; the capability tweak in `inc/owner-caps.php` stays in the theme as dormant plumbing so a future Editor-role account would still see Flamingo if one were ever added.
- For editor-UI tests on live, create a throwaway admin, test, then delete it in the same session.

### Email flow

- `contact@bozzies.org` is the **outbound** mailbox. WordPress sends from this address via DreamHost SMTP (WP Mail SMTP + `WPMS_*` constants in wp-config.php).
- `info@bozzies.org` is the **inbound** mailbox. Forwards to the owner's Gmail via a DreamHost mail-forwarder rule.
- Contact form (`/contact/`):
  - **Notification mail → `info@`** with `From: Bozzies.org <contact@bozzies.org>`, `Reply-To: <sender>` so the owner can click Reply in Gmail and reach the visitor directly.
  - **Confirmation mail → the sender** with `From: Bozzies.org <contact@bozzies.org>`, `Reply-To: info@bozzies.org`.
  - Every submission is also saved by Flamingo (Admin → Flamingo → Inbound Messages).
- If the `contact@` mailbox password changes at DreamHost, re-sync wp-config.php with `scripts/deploy/set-live-secrets.sh` (it detects which placeholder is missing and prompts only for that).

### Analytics + consent

- GA4 property **`G-K0G0LKX17Z`** (constant `BOZZIES_GA_MEASUREMENT_ID` in `inc/analytics.php`).
- Gated three ways in `bozzies_analytics_active()`: production environment, visitor logged out, Accept clicked on the cookie banner. All three must be true before any Google script loads.
- `BOZZIES_ANALYTICS_FORCE` constant bypasses the environment + logged-in checks for local testing only.
- **Google's own Tag Checker reports "not detected" by design** — it fires a request before any consent can be given, and our gate correctly refuses to load gtag.js at that moment. The real verification is `scripts/dev/ga4-smoke.mjs` which drives Chromium through the Accept path and confirms a `/collect` request fires with `tid=G-K0G0LKX17Z`.

## Deploy workflow (post-launch)

| What | How | Direction |
|---|---|---|
| Theme code | `bash scripts/deploy/deploy-theme.sh` (dry-run then prompt; `--yes` to skip the prompt) | local → live |
| Must-use plugins (`mu-plugins/*.php`) | `bash scripts/deploy/deploy-mu-plugins.sh` (dry-run then prompt; `--yes` to skip) | local → live |
| Live DB + uploads | `bash scripts/deploy/pull-live.sh` | live → local |
| Secret rotation (DB, SMTP, admin password) | `bash scripts/deploy/set-live-secrets.sh` | local prompts, SSH-piped stdin → live wp-config |
| WP Duplicate as Draft plugin | rsync from its own repo (see below) | local → live |

**Do not push the local database to live.** The owner edits live. If
you absolutely need to replace the live DB with a specific snapshot,
mint a maintenance window, back up live first, then let the owner know
the exact edits that will be lost.

## Plugins (5)

All active on live. The four from WordPress.org update through the
admin's Plugins → Updates screen; the fifth is ours and updates by
rsync from its sibling repo.

- **Contact Form 7** (`contact-form-7`, 6.1.7) — runs the one form at `/contact/`. The two Mail blocks (notification + confirmation) carry the From / Reply-To shape documented under "Email flow" above. Form ID is 868; the mail templates live on the form, not in theme code.
- **CF7 Apps Honeypot** (`contact-form-7-honeypot`, 3.8.0) — spam decoy. `functions.php` filters its default `tabindex="1000"` down to `-1` for a11y.
- **Flamingo** (`flamingo`, 2.6.4) — stores every CF7 submission in the DB. Reachable at Admin → Flamingo → Inbound Messages.
- **WP Mail SMTP** (`wp-mail-smtp`, 4.10.0) — relays outbound mail through DreamHost SMTP using the `WPMS_*` constants defined in wp-config.php.
- **WP Duplicate as Draft** (`wp-duplicate-as-draft`, 1.0.0) — **ours**. Repo: <https://github.com/timetomoto/WP-duplicate-as-draft> (private). Not vendored into this repo. Local working copy at `~/code/wp-duplicate-as-draft/`.
  - **Deploy an update**: edit in `~/code/wp-duplicate-as-draft`, `git push`, then `rsync -az --delete --exclude '.git/' ~/code/wp-duplicate-as-draft/ khalboz@bozzies.org:/home/khalboz/bozzies.org/wp-content/plugins/wp-duplicate-as-draft/`. No DB migration; the plugin stores nothing.
  - **Remove**: `ssh khalboz@bozzies.org 'cd /home/khalboz/bozzies.org && wp plugin deactivate wp-duplicate-as-draft && wp plugin delete wp-duplicate-as-draft'`.

**Not installed, must not be re-added**: Akismet, Hello Dolly. DreamHost's WP one-click sometimes seeds both; if they ever reappear, `wp plugin delete akismet hello`.

### Auto-update policy on live

- **Core**: at WordPress default — minor releases install automatically, major releases wait for a manual click. We do not force major updates with `WP_AUTO_UPDATE_CORE` either way.
- **The four WordPress.org plugins** (Contact Form 7, CF7 Apps Honeypot, Flamingo, WP Mail SMTP): `auto_update: on`. Enabled 2026-10-02 with `wp plugin auto-updates enable <slug>` on the server.
- **WP Duplicate as Draft**: `auto_update: off`. Carries `Update URI: false` in its plugin header, so WordPress's updater won't match it against the WordPress.org directory. Updates still deploy by rsync from `~/code/wp-duplicate-as-draft/`.
- **Bozzies theme**: carries `Update URI: false` in `style.css`. Same rationale — no stranger with the slug `bozzies` on wp.org can ever offer an "update" that overwrites our theme. Deploys via `scripts/deploy/deploy-theme.sh`.
- **No update-blocking constants**: `DISALLOW_FILE_MODS` is undefined, `AUTOMATIC_UPDATER_DISABLED` is undefined, `FS_METHOD` is undefined (direct). `DISALLOW_FILE_EDIT` is `true`, which blocks the admin's in-browser file editor but does not block updates. Site Health → "Background updates are working" reports **good**.

### Live schedules (khalboz crontab)

```
*/15 * * * * cd /home/khalboz/bozzies.org && /usr/bin/wp cron event run --due-now >/dev/null 2>&1   # bozzies-cron
15 3 * * 0 /home/khalboz/bin/bozzies-weekly-db-backup.sh >> /home/khalboz/backups-db/weekly-backup.log 2>&1   # bozzies-weekly
```

- **Visit-triggered pseudo-cron is off**: `define('DISABLE_WP_CRON', true)` is now in the live `wp-config.php` just above the `require_once ABSPATH . 'wp-settings.php'` line. All WordPress scheduled tasks (Flamingo hourly cron, Action Scheduler queue, personal-data cleanup, transient GC, Site Health, etc.) run through the system cron every 15 minutes instead.
- **Weekly DB backups**: `/home/khalboz/bin/bozzies-weekly-db-backup.sh` runs Sundays 03:15 server time. Dumps `wp db export | gzip` to `/home/khalboz/backups-db/db-weekly-<date>.sql.gz`, keeps the newest 8, deletes older. Separate from DreamHost's own server-level backups; this is the self-managed developer-reachable copy that doesn't depend on a DreamHost support ticket. The script also logs a one-liner to `/home/khalboz/backups-db/weekly-backup.log` for each run.
- To edit either schedule later: `ssh khalboz@bozzies.org 'crontab -e'`. The marker comments (`# bozzies-cron`, `# bozzies-weekly`) are used by the install step to strip and replace our lines idempotently.

## Must-use plugins

Live at `wp-content/mu-plugins/` on the server. WordPress loads every
top-level `.php` file in that directory unconditionally — they cannot
be deactivated from the admin UI, which is why we keep site-wide
security hardening here rather than in the theme or as a regular
plugin. Deployed from the repo's `mu-plugins/` folder with
`scripts/deploy/deploy-mu-plugins.sh`.

- **`bozzies-hardening.php`** (`mu-plugins/bozzies-hardening.php`) — single-file mu-plugin that:
  - Disables XML-RPC: `xmlrpc_enabled` → false, strips the `X-Pingback` header + `<link rel="EditURI">` RSD tag, and intercepts any request to `/xmlrpc.php` at `init` priority 1 with a 403.
  - Removes the `wp/v2/users` + `wp/v2/users/{id}` REST routes for logged-out visitors via `rest_endpoints`.
  - Hooks `template_redirect` priority 1 (before core's `redirect_canonical` at 10) to 301 `?author=N` **and** direct `/author/<slug>/` requests to the home page when logged out. Blocks both username-discovery paths; logged-in editors keep access.
  - Sends 5 security response headers via `send_headers`: `Strict-Transport-Security: max-age=300` (short to start, no `includeSubDomains` or `preload` — ramp up once stable), `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`. **No Content Security Policy** yet.
  - The consent cookie's Secure + SameSite=Lax flags live in `theme/bozzies/assets/js/consent.js` (JS-set cookie, no server-side path). The mu-plugin has a reference comment pointing at that file.

## Rules

- Work on `main`. Commit on `main`. Push to `origin` only when the user asks.
- Never run `wp-env clean` or `wp-env destroy` locally — both wipe the local DB and the admin user "keith".
- Never touch "keith" the user on either local or live. Use a throwaway admin for editor tests, delete after.
- Never invent copy. Text comes verbatim from the Astro source; otherwise use an obvious labeled placeholder.
- Compute WCAG 2.2 AA contrast for every new text/background pair. Accessibility contract: skip link, keyboard access, visible focus, aria-live where content changes, prefers-reduced-motion, alt text.
- Never stage `admin-credentials.txt`, `_screens/`, `.wp-env.override.json`, `dev-tools/mu-plugins/` — all gitignored.
- No passwords, keys, or private email addresses in any committed file. Reference where a value lives instead.
- Verify version-dependent WordPress facts against official docs and cite them.

## Content

- **Source of truth for content: the live database.** Pull it down with `scripts/deploy/pull-live.sh` before any content-touching change.
- The original Astro content lives at `~/boswell-poc/src/content/`; it's a historical reference now, not an active source. Content additions / corrections happen in the live editor, not in Markdown files.
- Images, PDFs, and MP3s live in the live Media Library. Pulling live down brings uploads too (unless `--db-only`).
- Any copy change made against the Astro repo (e.g. the Astro site shifting) should **not** be reflected on the live site unless the owner specifically asks for it.

## Styling rules

The Astro CSS trial (branch `astro-css-trial`, commits `2a31052` + `4edff2b`) proved that porting Astro's CSS unchanged and making WordPress emit Astro's exact class names and markup gives a provable computed-style match. The rebuild shipped on that basis.

- **Astro's CSS is the only source of styling truth.** Each Astro `<style>` block, plus the global rules its markup depends on, lives at `theme/bozzies/assets/css/astro/<component>.css`. One file per component, plus `global.css` for the sitewide reset + typography + grounds + layout helpers.
- **Never port from `chrome.css` or any hand-written CSS.** Astro's source is the only source. When porting a new component, delete every hand-written rule the port replaces in the same commit.
- **The only allowed edits to Astro CSS**: (1) token aliases at the top of `global.css` that re-export the theme's WP tokens (`--purple: var(--wp--preset--color--purple)` etc.) so palette pickers still flow; (2) selector adjustments forced by WordPress wrapper markup (e.g. `.hero__title.wp-block-heading` because `core/heading` adds the class). **Every edit must be listed in the file-header comment** with a short reason.
- **WordPress output carries Astro's exact class names and structure.** Custom blocks emit Astro's DOM from `render.php`. Patterns carry Astro class names hard-coded on inner blocks.
- **WordPress layout CSS is turned off**: `useRootPaddingAwareAlignments` off, narrow `layout.contentSize`, no global block-gap. `bozzies/section` owns vertical rhythm.
- **Every block with inner blocks must save `<InnerBlocks.Content />`.** `save: () => null` silently discards children. The round-trip test in `scripts/dev/*-roundtrip.mjs` catches this.
- **Templates that emit a hero never emit a page title.** `page-landing.html` and `page-subpage.html` render `core/post-content` only. `page.html` auto-emits a ground-purple hero around `core/post-title`. No page shows two titles; no page is missing an h1.
- **Fonts self-hosted** via `@fontsource` (Cormorant Garamond, Source Serif 4, Inter, Instrument Serif). All Astro fonts included.

## Verification scripts

Permanent scripts under `scripts/dev/`. Keep extending; don't delete after a port lands.

- **Accessibility**: `a11y-axe.mjs` (axe sweep across 14 pages × 2 viewports) and `a11y-keyboard.mjs` (keyboard focus-outline + hidden-under-sticky-nav check). Current state is 0 axe violations across the sweep set.
- **Analytics**: `ga4-smoke.mjs --action=accept|decline|none` drives the consent flow in Chromium against any host and reports whether gtag.js and `/collect` fire where expected.
- **Component style-diff**: `component-style-diff.mjs`, `style-diff-all.mjs`, `hero-style-diff.mjs`, and per-component files (one per block). Pairs by Astro class name at 1440 + 390 and reports computed-style mismatches.
- **Block round-trips**: `*-roundtrip.mjs` per block. Serialize → parse → deep-compare; fails if a block drops InnerBlocks or validates with a warning.
- **Owner tests**: `*-owner-tests.mjs` per block. A (insert from inserter), B (insert pattern + sidebar-click), C (pre-typed JSON renders).

## Accessibility status

Full a11y remediation shipped on 2026-09-30 (commits `a1067a6`, `95201ab`, `e31f52b`, `0e03109`, `ea79626`):

- Playlist player + Quotes carousel + cookie button all have visible 2 px `:focus-visible` outlines with ≥ 3:1 contrast against their grounds.
- Quotes carousel has a visible Pause / Play button (WCAG 2.2.2), `aria-current` dots instead of `role=tab`, 24×24 target sizes, and a silent live region during auto-rotation.
- `category.html` and `404.html` carry a visually-hidden h2 so heading order never jumps h1 → h3.
- Bio pages (connee/martha/vet) use h3 for MUSIC and PERSONALITY, not h4.
- Horizontally scrollable tables are focusable regions with per-table aria-labels (`render_block_core/table` filter).
- Honeypot's `tabindex="1000"` rewritten to `-1`.
- `.bio-portrait` releases its 300 px fixed width on mobile so the 320 px viewport has no overflow.
- `html { scroll-padding-top }` keyed to measured sticky-header heights at each breakpoint so keyboard focus and anchor jumps clear the header.

`scripts/dev/a11y-axe.mjs` and `scripts/dev/a11y-keyboard.mjs` are the regression guards; run after any theme change.

## Owner-facing documentation

The owner uses two guides, **not stored in this repo**:

- **Owner guide** (hosting, email, backups, do-not-delete, the 11 missing playlist tracks)
- **Editor guide** (login, pages, posts, blocks, patterns, Flamingo, Site Editor, what-not-to-do)

Both live in **Google Drive → My Drive → Boswell → Guides**. Developer-side changes that affect the owner's workflow should be reflected there too, in the same session. Working copies also sit at `~/boswell-backups/guides/*.md` on the developer's machine.

## Open items

- **11 missing playlist tracks on the home page.** When the site launched, 11 of the 26 playlist entries pointed at archive.org files that had already been removed by Google before launch day. 14 tracks were saved locally during the build; 1 more was recovered from the DreamHost backup of the pre-WordPress site. The 11 missing titles are listed in the owner guide; the plan is to replace them when the owner locates working audio.
- **Raise HSTS `max-age`** — set 2026-10-02 to `max-age=300` as a safety floor on first roll-out. If no reports of broken HTTPS come in by **2026-10-16** (two weeks), bump it to `max-age=31536000` (one year) in `mu-plugins/bozzies-hardening.php`, redeploy with `scripts/deploy/deploy-mu-plugins.sh`, and tick this item off. Do NOT add `includeSubDomains` or `preload` yet — the account hosts other subdomains (e.g. new.bozzies.org) that aren't ready to be HTTPS-locked.
- **WordPress Administration Email** — currently set to the DreamHost one-click installer's placeholder (visible via `wp option get admin_email` on the server). This is where background-update-success / failure notices land, so until it's set to a real inbox those messages go nowhere. Change it from Admin → Settings → General, or `wp option update admin_email '<address>'`. (Not changed in this task because the owner asked only to be told the current value.)

## Working habits

- Read files with `offset`/`limit` instead of loading whole files; re-read sparingly.
- Paste full reports in chat. Never save report files to disk.
- Commit on `main` locally. Push to `origin` only when the user asks.
- When editing an existing file, update or add comments in the parts you touch so the "why" stays current with the "what".
- **Commit messages**: a short summary line, then a body explaining what changed and why in plain language. The body is for the owner reading `git log` later, not for the compiler.
- **Code comments**: explain anything non-obvious — especially why something differs from Astro, WordPress-specific workarounds, and which Astro file + lines a ported rule or markup came from. Don't comment the obvious.
- If running low on context room, stop at a clean point, commit (updating this file if the state changed), and report what's done and what remains.
