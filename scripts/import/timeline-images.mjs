#!/usr/bin/env node
// scripts/import/timeline-images.mjs
//
// One-shot patcher that fixes the broken timeline images on
// /sisters/career-timeline/ (post 19) and /sisters/connee/ (post 15).
//
// Problem the owner reported: images don't show on career-timeline. Root
// cause — the import stored the raw Astro public-dir path from the
// trio.md frontmatter (`image: /uploads/timeline/timeline-01.jpg`)
// directly into the bozzies/timeline block attributes. On Astro that
// path resolves because Vercel serves /public under /. On WordPress
// /uploads/* is not a valid URL (uploads live at /wp-content/uploads/
// and inside year/month subfolders anyway), so every <img src> 404s.
//
// This patcher:
//   1. Reads Astro's trio.md and connee.md frontmatter.
//   2. For each entry that has an `image`, imports the file into the WP
//      media library via importMedia() (uses the local HTTP server on
//      host.docker.internal:8899 — must be running).
//   3. Rewrites the bozzies/timeline block JSON in each page's
//      post_content with the WP uploads URL AND a numeric imageId. The
//      block's render.php prefers imageId at render time so later edits
//      via the MediaUpload picker flow through automatically.
//
// Idempotent: entries that already carry a wp-content URL + imageId
// pointing at a real attachment are left alone.

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'js-yaml';
import { wp, importMedia } from './lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASTRO_DIR = resolve(__dirname, '../../../boswell-poc/src/content/timelines');

function readFrontmatter(slug) {
	const src = readFileSync(resolve(ASTRO_DIR, `${slug}.md`), 'utf8');
	const m = src.match(/^---\n([\s\S]*?)\n---/);
	if (!m) throw new Error(`${slug}.md: no frontmatter found`);
	return load(m[1]);
}

function phpStr(s) {
	return `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

// Patch a single page: find the bozzies/timeline block, parse its entries
// JSON, upload any Astro-path image references, rewrite the block attrs.
function patchPage(id, slug) {
	const content = wp(['post', 'get', String(id), '--field=post_content']);
	// The timeline block is self-closing in current content (save: () => null),
	// so look for `<!-- wp:bozzies/timeline {...} /-->`.
	const re = /<!-- wp:bozzies\/timeline (\{[\s\S]*?\}) \/-->/;
	const match = content.match(re);
	if (!match) {
		console.log(`  ${slug} (id=${id}): no bozzies/timeline block found — skip`);
		return { touched: 0, imported: 0 };
	}
	let attrs;
	try {
		attrs = JSON.parse(match[1]);
	} catch (err) {
		throw new Error(`${slug}: couldn't parse timeline block attrs: ${err.message}`);
	}

	const astroEntries = readFrontmatter(slug).entries || [];
	let imported = 0;
	let touched = 0;
	const next = attrs.entries.map((e, i) => {
		// Already a real WP uploads URL? skip.
		const current = typeof e.image === 'string' ? e.image : '';
		const hasWpUrl = /\/wp-content\/uploads\//.test(current);
		if (hasWpUrl && e.imageId) {
			return e;
		}
		// Prefer Astro's authoritative source for the image path — the block
		// may hold a stale `image` from a prior import; Astro's trio.md L N
		// is the ground truth either way.
		const astroImage = astroEntries[i]?.image || current || '';
		const astroAlt   = astroEntries[i]?.imageAlt || e.imageAlt || '';
		if (!astroImage) {
			// No image at this slot; preserve empty state.
			return { ...e, image: '', imageId: 0, imageAlt: e.imageAlt || astroAlt || '' };
		}
		const media = importMedia(astroImage, astroAlt);
		if (!media) {
			console.log(`    ! entry ${i + 1}: couldn't import ${astroImage}`);
			return e;
		}
		imported++;
		touched++;
		return {
			...e,
			image: media.url,
			imageId: media.id,
			imageAlt: astroAlt || e.imageAlt || '',
		};
	});

	if (!touched) {
		console.log(`  ${slug} (id=${id}): already up to date`);
		return { touched: 0, imported: 0 };
	}

	// Rebuild the block JSON. JSON.stringify matches Gutenberg's own
	// client-side serializer for simple numeric / string values.
	const nextAttrs = { ...attrs, entries: next };
	const nextBlock = `<!-- wp:bozzies/timeline ${JSON.stringify(nextAttrs)} /-->`;
	const nextContent = content.replace(re, nextBlock);

	const php = `wp_update_post(['ID'=>${id},'post_content'=>wp_slash(${phpStr(nextContent)})]); echo 'OK';`;
	wp(['eval', php]);
	console.log(`  ${slug} (id=${id}): ${touched} entries patched, ${imported} images imported`);
	return { touched, imported };
}

console.log('Patching timeline images…');
const trio   = patchPage(19, 'trio');
const connee = patchPage(15, 'connee');

console.log('\nflushing object cache…');
wp(['cache', 'flush']);

console.log('\n=== SUMMARY ===');
console.log(`  career-timeline (id=19):  ${trio.imported} images imported`);
console.log(`  connee          (id=15):  ${connee.imported} images imported`);
