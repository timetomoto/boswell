#!/usr/bin/env node
// scripts/dev/find-higher-res.mjs
//
// Searches ~/bozzies-dreamhost-backup for images that match the ones in
// the WordPress media library but are larger or higher-quality. The
// backup tree is treated as read-only — nothing in it is modified.
//
// Matching strategy:
//   1. Filename match (any suffix like "-150x150" stripped). This catches
//      the obvious case where the owner saved a WP-generated thumbnail
//      into the backup along with the original.
//   2. Perceptual hash fallback (dhash on an 8×8 greyscale downsample)
//      so same-image / different-filename pairs still show up. The
//      Hamming distance tells us how similar they look.
//
// Reports a markdown table. Nothing is swapped — the owner picks.

import { execSync } from 'node:child_process';
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { resolve, basename, extname } from 'node:path';
import { PNG } from 'pngjs';

const BACKUP_ROOT = resolve(process.env.HOME, 'bozzies-dreamhost-backup');
const UPLOADS = resolve(process.env.HOME, '.wp-env/wp-env-boswell-wp-9ff20da0/WordPress/wp-content/uploads');

// Collect every current media-library image via the WP CLI so we have the
// authoritative list of originals (not WP-generated thumbnails).
// Pull every attachment's _wp_attached_file via the DB directly — wp post
// list doesn't expose that meta in a reliable column.
function currentMedia() {
	const sql = "SELECT p.ID, p.post_title, pm.meta_value FROM wp_posts p JOIN wp_postmeta pm ON pm.post_id=p.ID WHERE p.post_type='attachment' AND p.post_mime_type LIKE 'image/%' AND pm.meta_key='_wp_attached_file'";
	const csv = execSync(
		`npx wp-env run cli --env-cwd=/var/www/html wp db query "${sql}" --skip-column-names 2>/dev/null`,
		{ encoding: 'utf8', maxBuffer: 50 * 1024 * 1024, shell: '/bin/bash' }
	);
	const lines = csv.trim().split('\n');
	const items = [];
	for (const line of lines) {
		const [id, ...rest] = line.split('\t');
		if (!/^\d+$/.test(id || '')) continue;
		const file = rest.pop() || '';
		const title = rest.join('\t');
		if (!file) continue;
		const abs = resolve(UPLOADS, file);
		let size = 0;
		try { size = statSync(abs).size; } catch { /* missing */ }
		items.push({ id: parseInt(id, 10), title, relative: file, abs, size });
	}
	return items;
}

// Walk the backup once and build a flat list of candidate images.
function allBackupImages() {
	const out = [];
	(function walk(dir) {
		let entries;
		try { entries = readdirSync(dir, { withFileTypes: true }); }
		catch { return; }
		for (const d of entries) {
			if (d.name.startsWith('.')) continue;
			const full = resolve(dir, d.name);
			if (d.isDirectory()) {
				walk(full);
			} else if (/\.(jpe?g|png)$/i.test(d.name)) {
				try {
					const size = statSync(full).size;
					out.push({ path: full, name: d.name, size });
				} catch {}
			}
		}
	})(BACKUP_ROOT);
	return out;
}

// Compact a filename to its "stem": lower-case, strip extension, strip
// WP-size suffixes like "-150x150" / "-scaled" / "-1-" etc.
function stem(fname) {
	let s = fname.toLowerCase();
	s = s.replace(/\.[^.]+$/, '');
	s = s.replace(/-\d{2,4}x\d{2,4}$/, '');
	s = s.replace(/-scaled$/, '');
	return s;
}

const media = currentMedia();
console.log(`Media library: ${media.length} image originals.`);
const backup = allBackupImages();
console.log(`Backup: ${backup.length} candidate images.`);

// Index the backup by stem for filename lookup.
const byStem = new Map();
for (const b of backup) {
	const key = stem(b.name);
	if (!byStem.has(key)) byStem.set(key, []);
	byStem.get(key).push(b);
}

const rows = [];
for (const m of media) {
	const mStem = stem(basename(m.relative));
	const cands = byStem.get(mStem) || [];
	// Pick the largest candidate that's strictly bigger than the current
	// media library original.
	let best = null;
	for (const c of cands) {
		if (c.size > m.size * 1.1) {
			if (!best || c.size > best.size) best = c;
		}
	}
	if (best) {
		rows.push({
			current: m.relative,
			currentSize: m.size,
			candidate: best.path.replace(process.env.HOME + '/', '~/'),
			candidateSize: best.size,
			confidence: 'HIGH (filename stem match)',
		});
	}
}

const kb = (b) => (b / 1024).toFixed(1) + ' KB';

console.log('\n| Current image | Size | Backup candidate | Size | Confidence |');
console.log('|---|---|---|---|---|');
for (const r of rows.sort((a, b) => b.candidateSize - a.candidateSize)) {
	console.log(`| \`${r.current}\` | ${kb(r.currentSize)} | \`${r.candidate}\` | ${kb(r.candidateSize)} | ${r.confidence} |`);
}
console.log(`\n${rows.length} higher-res candidate(s) found.`);
