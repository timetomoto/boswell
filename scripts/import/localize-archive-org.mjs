#!/usr/bin/env node
// scripts/import/localize-archive-org.mjs
//
// Download every archive.org MP3 referenced anywhere in the site (WordPress
// wp_posts + the Astro source markdown as a safety net for URLs that might
// live there but not in the DB) into the WordPress media library, then
// rewrite every occurrence of the archive.org URL in wp_posts.post_content
// to the local media library URL.
//
// Prose mentions of "archive.org" (e.g. Privacy Policy noting embedded
// Internet Archive players, home page's `<a href="http://www.archive.org">`
// footer link) are NOT rewritten — only linked-file URLs (currently .mp3).
//
// Run: `node scripts/import/localize-archive-org.mjs` — idempotent (skips
// media library items that already exist by filename slug).

import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..', '..');
const astroRoot = resolve(process.env.HOME, 'boswell-poc');
const tmpDir = resolve(projectRoot, 'theme/bozzies/.import-tmp/archive-org');
mkdirSync(tmpDir, { recursive: true });

// The container's mount for the theme dir — the file needs to be visible to
// the wp-env cli container to import.
const containerTmp = '/var/www/html/wp-content/themes/bozzies/.import-tmp/archive-org';

/** Shell out to wp-env cli. */
function wp(args) {
	const cmd = ['npx', 'wp-env', 'run', 'cli', '--env-cwd=/var/www/html', 'wp', ...args];
	return execSync(cmd.join(' '), { encoding: 'utf8', maxBuffer: 200 * 1024 * 1024 });
}

/** Collect every unique archive.org URL from DB + Astro source. */
function collectUrls() {
	const urls = new Set();
	// DB dump.
	const dbOut = execSync(
		`npx wp-env run cli --env-cwd=/var/www/html wp db query "SELECT post_content FROM wp_posts WHERE post_status='publish' AND post_content LIKE '%archive.org%'" 2>&1`,
		{ encoding: 'utf8', maxBuffer: 200 * 1024 * 1024 }
	);
	for (const m of dbOut.matchAll(/https?:\/\/[^\s"'<>)]*archive\.org[^\s"'<>)]*/g)) {
		urls.add(m[0]);
	}
	// Astro grep.
	const astroOut = execSync(
		`grep -rhoE "https?://(www\\.|web\\.)?archive\\.org[^\\"'\\\\s<>)]+" ${astroRoot}/src/ 2>/dev/null || true`,
		{ encoding: 'utf8', maxBuffer: 100 * 1024 * 1024, shell: '/bin/bash' }
	);
	for (const m of astroOut.matchAll(/https?:\/\/[^\s"'<>)]*archive\.org[^\s"'<>)]*/g)) {
		urls.add(m[0]);
	}
	return [...urls].sort();
}

/** Only download URLs that look like file assets (.mp3, .m4a, .wav, .ogg, .flac, .pdf). */
function isDownloadable(u) {
	return /\.(mp3|m4a|wav|ogg|flac|pdf|jpg|jpeg|png|gif)(\?|$)/i.test(u);
}

/** Slugify the URL basename → safe filename (keeps extension). */
function urlToFilename(u) {
	const url = new URL(u);
	const base = decodeURIComponent(url.pathname.split('/').pop() || 'file');
	const [name, ...extParts] = base.split('.');
	const ext = extParts.pop() || 'bin';
	const slug = name
		.toLowerCase()
		.replace(/^\d+-/, '')          // strip leading matrix numbers like "2405-…"
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.replace(/-+/g, '-')
		.slice(0, 100);
	return `${slug}.${ext.toLowerCase()}`;
}

/** Slugified filename → human-readable title. */
function filenameToTitle(fname) {
	const stem = fname.replace(/\.[a-z0-9]+$/, '');
	return stem
		.split('-')
		.filter(Boolean)
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
		.join(' ');
}

/** Look up an attachment by filename (checks _wp_attached_file). */
function findAttachment(filename) {
	const out = wp([
		'db',
		'query',
		`"SELECT post_id FROM wp_postmeta WHERE meta_key='_wp_attached_file' AND meta_value LIKE '%/${filename}' LIMIT 1"`,
		'--skip-column-names',
	]).trim();
	const id = out.split(/\s+/).find((x) => /^\d+$/.test(x));
	return id ? parseInt(id, 10) : 0;
}

async function download(url, dest) {
	console.log(`  fetching ${url.slice(0, 100)}…`);
	const res = await fetch(url, { redirect: 'follow' });
	if (!res.ok) {
		throw new Error(`HTTP ${res.status} for ${url}`);
	}
	const buf = Buffer.from(await res.arrayBuffer());
	writeFileSync(dest, buf);
	return buf.length;
}

const urls = collectUrls();
console.log(`Found ${urls.length} archive.org URLs.`);

const downloadable = urls.filter(isDownloadable);
const prose = urls.filter((u) => !isDownloadable(u));
console.log(`  ${downloadable.length} file URLs (will download)`);
console.log(`  ${prose.length} prose URLs (skipped — kept as-is):`);
for (const u of prose) console.log(`    ${u}`);

const mapping = []; // [{oldUrl, newUrl, bytes, attachmentId, filename}]
const failures = [];

for (const url of downloadable) {
	const filename = urlToFilename(url);
	const localPath = resolve(tmpDir, filename);
	const title = filenameToTitle(filename);

	// Skip download if we already have a media library entry.
	let attId = findAttachment(filename);
	if (attId) {
		const newUrl = wp(['post', 'meta', 'get', String(attId), '_wp_attached_file']).trim().split(/\s+/).pop();
		const fullUrl = `/wp-content/uploads/${newUrl}`;
		let bytes = 0;
		try { bytes = statSync(localPath).size; } catch {}
		mapping.push({ oldUrl: url, newUrl: fullUrl, bytes, attachmentId: attId, filename, reused: true });
		console.log(`  [reuse] ${filename} → attachment ${attId}`);
		continue;
	}

	try {
		let bytes;
		if (existsSync(localPath) && statSync(localPath).size > 1000) {
			bytes = statSync(localPath).size;
			console.log(`  [cached ${bytes} B] ${filename}`);
		} else {
			bytes = await download(url, localPath);
		}
		// Import into media library.
		const containerPath = `${containerTmp}/${filename}`;
		const idOut = wp([
			'media',
			'import',
			containerPath,
			`--title=${JSON.stringify(title)}`,
			'--porcelain',
		]).trim();
		const id = parseInt(idOut.split(/\s+/).filter((s) => /^\d+$/.test(s)).pop() || '0', 10);
		if (!id) {
			throw new Error(`wp media import returned no id: ${idOut}`);
		}
		const attFile = wp(['post', 'meta', 'get', String(id), '_wp_attached_file']).trim().split(/\s+/).pop();
		const newUrl = `/wp-content/uploads/${attFile}`;
		mapping.push({ oldUrl: url, newUrl, bytes, attachmentId: id, filename });
		console.log(`  [OK ${bytes} B] ${filename} → attachment ${id}`);
	} catch (err) {
		failures.push({ url, filename, error: String(err.message || err) });
		console.log(`  [FAIL] ${url}: ${err.message}`);
	}
}

// Rewrite URLs in wp_posts.post_content using wp search-replace.
if (mapping.length) {
	console.log('\nRewriting URLs in wp_posts.post_content…');
	for (const { oldUrl, newUrl } of mapping) {
		const out = wp([
			'search-replace',
			JSON.stringify(oldUrl),
			JSON.stringify(newUrl),
			'wp_posts',
			'--all-tables-with-prefix',
			'--report-changed-only',
		]);
		const changed = (out.match(/Success: Made (\d+) replacements/) || [])[1] || '0';
		console.log(`  ${changed.padStart(3)} × ${newUrl.split('/').pop()}`);
	}
}

console.log('\n=== SUMMARY ===');
console.log(`Downloaded: ${mapping.length}`);
let totalBytes = 0;
for (const m of mapping) {
	totalBytes += m.bytes;
	console.log(`  ${(m.bytes / 1024).toFixed(1).padStart(9)} KB  ${m.filename}${m.reused ? ' (reused)' : ''}`);
}
console.log(`Total: ${(totalBytes / (1024 * 1024)).toFixed(2)} MB across ${mapping.length} files`);
if (failures.length) {
	console.log(`\nFAILURES (${failures.length}):`);
	for (const f of failures) console.log(`  ${f.filename}: ${f.error} — ${f.url}`);
}
