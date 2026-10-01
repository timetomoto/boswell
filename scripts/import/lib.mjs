// scripts/import/lib.mjs
// Re-runnable helpers for content import into the local wp-env WordPress instance.
// - runs wp-cli inside the wp-env container via `wp-env run cli wp ...`
// - imports media files by URL (files are served on the host at http://host.docker.internal:8899/)
// - upserts pages by slug (matches existing items — never creates duplicates)

import { execFileSync } from 'node:child_process';

const HOST_UPLOAD_BASE = 'http://host.docker.internal:8899';

// Run a wp-cli command inside the wp-env cli container. Returns stdout trimmed.
export function wp(args, { input, allowFail = false } = {}) {
  const argv = ['wp-env', 'run', 'cli', 'wp', ...args];
  try {
    const out = execFileSync('npx', argv, {
      cwd: process.cwd(),
      encoding: 'utf8',
      input,
      stdio: ['pipe', 'pipe', 'pipe'],
      maxBuffer: 64 * 1024 * 1024,
    });
    return out.trim();
  } catch (err) {
    if (allowFail) return '';
    const stderr = err.stderr?.toString?.() || '';
    const stdout = err.stdout?.toString?.() || '';
    throw new Error(`wp ${args.join(' ')} failed:\n${stderr || stdout}`);
  }
}

// Look up an attachment by title (WP defaults title to the filename basename).
// Returns numeric ID or null.
export function findAttachmentByTitle(title) {
  const out = wp([
    'post', 'list', '--post_type=attachment',
    `--post_title=${title}`,
    '--fields=ID,post_title', '--format=csv',
  ], { allowFail: true });
  const lines = out.split('\n').slice(1).filter(Boolean);
  for (const line of lines) {
    const [id, t] = line.split(',');
    if ((t || '').replace(/^"|"$/g, '') === title) return parseInt(id, 10);
  }
  return null;
}

// Import a public/-relative path (e.g. "/uploads/Boswell_Sisters_1932.jpg").
// Idempotent: matches existing attachment by title (filename basename minus extension).
// The wp-env container can't fetch by URL directly (wp media import rejects the
// host.docker.internal host), so we curl the file to /tmp inside the container first,
// then import from the local path.
// Returns { id, url, alt }.
import { execFileSync as _run } from 'node:child_process';
const mediaCache = new Map();
export function importMedia(publicPath, alt = '', title = '') {
  if (!publicPath) return null;
  if (mediaCache.has(publicPath)) return mediaCache.get(publicPath);

  const clean = publicPath.replace(/^\/+/, '');
  const url = `${HOST_UPLOAD_BASE}/${clean}`;
  const filename = clean.split('/').pop();
  const titleGuess = title || filename.replace(/\.[^.]+$/, '');

  // Search by title (== filename basename).
  let id = findAttachmentByTitle(titleGuess);

  if (!id) {
    // curl the file to /tmp/<filename> inside the container, then import.
    _run('npx', ['wp-env', 'run', 'cli', 'bash', '-c',
      `curl -fsSLo /tmp/${filename} "${url}"`
    ], { stdio: ['pipe', 'pipe', 'pipe'] });

    const args = ['media', 'import', `/tmp/${filename}`, '--porcelain', `--title=${titleGuess}`];
    if (alt) args.push(`--alt=${alt}`);
    const out = wp(args);
    id = parseInt(out.split(/\s+/).filter(Boolean).pop(), 10);
    if (!Number.isFinite(id)) throw new Error(`media import returned non-numeric id: ${out}`);
  } else if (alt) {
    // Ensure alt text is set (idempotent).
    wp(['post', 'meta', 'update', String(id), '_wp_attachment_image_alt', alt]);
  }

  // Resolve final URL.
  const resolvedUrl = wp(['post', 'get', String(id), '--field=guid']);
  const result = { id, url: resolvedUrl, alt };
  mediaCache.set(publicPath, result);
  return result;
}

// Look up a page by slug. Returns numeric ID or null.
export function findPageBySlug(slug) {
  return findPostBySlug(slug, 'page');
}
export function findPostBySlug(slug, postType = 'post') {
  const out = wp([
    'post', 'list', `--post_type=${postType}`,
    `--name=${slug}`,
    '--fields=ID', '--format=ids',
  ], { allowFail: true });
  if (!out) return null;
  const id = parseInt(out.split(/\s+/)[0], 10);
  return Number.isFinite(id) ? id : null;
}

// Upsert a page by slug. Never creates duplicates.
// opts: { slug, title, content, template, status='publish' }
// wp-env doesn't forward stdin, so we write content to a file under the mounted
// theme directory and read it back inside the container.
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const __dirname = dirname(fileURLToPath(import.meta.url));
const TMP_HOST_DIR = resolve(__dirname, '../../theme/bozzies/.import-tmp');
const TMP_CONTAINER_DIR = '/var/www/html/wp-content/themes/bozzies/.import-tmp';

function writeTmpContent(slug, content) {
  mkdirSync(TMP_HOST_DIR, { recursive: true });
  const path = `${TMP_HOST_DIR}/${slug}.html`;
  writeFileSync(path, content, 'utf8');
  return `${TMP_CONTAINER_DIR}/${slug}.html`;
}

export function upsertPage(opts) {
  return upsertPost({ ...opts, postType: 'page' });
}
export function upsertPost({ slug, title, content, template, status = 'publish', postType = 'post', categorySlug, postDate, menuOrder, excerpt, meta = {} }) {
  const existing = findPostBySlug(slug, postType);
  const containerPath = writeTmpContent(`${postType}-${slug}`, content);

  const extra = [];
  if (postDate) extra.push(`'post_date'=>${phpStr(postDate)}`, `'post_date_gmt'=>${phpStr(postDate)}`);
  if (typeof menuOrder === 'number') extra.push(`'menu_order'=>${menuOrder}`);
  if (typeof excerpt === 'string') extra.push(`'post_excerpt'=>${phpStr(excerpt)}`);
  const extraStr = extra.length ? ',' + extra.join(',') : '';

  let id;
  if (existing) {
    const php = `wp_update_post(['ID'=>${existing},'post_title'=>${phpStr(title)},'post_status'=>${phpStr(status)},'post_content'=>wp_slash(file_get_contents(${phpStr(containerPath)}))${extraStr}]); echo 'OK';`;
    wp(['eval', php]);
    id = existing;
  } else {
    const php = `$id = wp_insert_post(['post_type'=>${phpStr(postType)},'post_name'=>${phpStr(slug)},'post_title'=>${phpStr(title)},'post_status'=>${phpStr(status)},'post_content'=>wp_slash(file_get_contents(${phpStr(containerPath)}))${extraStr}]); echo $id;`;
    const out = wp(['eval', php]);
    id = parseInt(out.split(/\s+/).filter(Boolean).pop(), 10);
  }
  if (template) wp(['post', 'meta', 'update', String(id), '_wp_page_template', template]);
  if (categorySlug) wp(['post', 'term', 'set', String(id), 'category', categorySlug]);
  for (const [k, v] of Object.entries(meta)) {
    if (v === null || v === undefined || v === '') {
      wp(['post', 'meta', 'delete', String(id), k], { allowFail: true });
    } else {
      wp(['post', 'meta', 'update', String(id), k, String(v)]);
    }
  }
  return { id, created: !existing };
}

// Delete a post (or page) by slug. No-op if not found. Force-deletes.
export function deleteBySlug(slug, postType = 'post') {
  const id = findPostBySlug(slug, postType);
  if (!id) return { id: null, deleted: false };
  wp(['post', 'delete', String(id), '--force']);
  return { id, deleted: true };
}

function phpStr(s) {
  return `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

// Escape a text string for use inside HTML text nodes (not attributes).
export function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Escape a text string for use inside HTML attribute values.
export function escAttr(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Full-bleed photo hero — used for the hub pages that Astro renders with
// title + subtitle overlaid on a photo (About, Sisters, Media, Press,
// Lessons). Emits a bozzies/section block with `heroPhoto:true` on it; the
// section's PHP render adds Astro's own class names (hero, hero--full-bleed,
// hero--medium, hero--center) and DOM structure (hero__image-wrap, tint,
// scrim, frame corners, hero__content container, hero__glyph) so the ported
// Astro hero CSS (assets/css/astro/hero.css) applies directly. Inner blocks
// use Astro's class names for the eyebrow, title, and subtitle.
//
// Emitted markup must match Gutenberg's canonical serializer output byte-for-
// byte, so opening + saving a page in the block editor yields no changes:
//   - attributes appear in block.json order,
//   - attributes matching the block's declared defaults are omitted,
//   - inner block comments and their HTML sit on their own lines, separated
//     by blank lines between blocks.
//
// opts = { media: {id,url,alt}, title, subtitle, credit, eyebrow }
export function heroPhoto({ media, title, subtitle, credit, eyebrow }) {
  if (!media || !media.url) {
    throw new Error('heroPhoto: media is required (pass importMedia result)');
  }
  const bgImage = { id: media.id, url: media.url, alt: media.alt || '' };
  const attrs = {
    backgroundStyle: 'ink',
    backgroundImage: bgImage,
    overlayStrength: 55,
    spacing: 'spacious',
    heroFrame: true,
    imageGrayscale: true,
    imageZoom: true,
    heroPhoto: true,
  };
  const blocks = [];
  if (eyebrow) {
    blocks.push(
      `<!-- wp:paragraph {"className":"eyebrow hero__eyebrow"} -->\n<p class="eyebrow hero__eyebrow">${eyebrow}</p>\n<!-- /wp:paragraph -->`
    );
  }
  blocks.push(
    `<!-- wp:heading {"level":1,"className":"hero__title"} -->\n<h1 class="wp-block-heading hero__title">${title}</h1>\n<!-- /wp:heading -->`
  );
  if (subtitle) {
    blocks.push(
      `<!-- wp:paragraph {"className":"hero__subtitle"} -->\n<p class="hero__subtitle">${subtitle}</p>\n<!-- /wp:paragraph -->`
    );
  }
  if (credit) {
    blocks.push(
      `<!-- wp:paragraph {"className":"hero__credit"} -->\n<p class="hero__credit">${credit}</p>\n<!-- /wp:paragraph -->`
    );
  }
  const inner = blocks.join('\n\n');
  return `<!-- wp:bozzies/section ${JSON.stringify(attrs)} -->\n${inner}\n<!-- /wp:bozzies/section -->`;
}
