#!/usr/bin/env node
// scripts/import/recover-archive-tracks.mjs
//
// Second pass at the 12 archive.org tracks that failed in the item-8
// localize-archive-org run. Two different strategies:
//
//   A. Two tracks returned HTTP 503 (transient). Retry those directly with
//      a bigger timeout and a longer back-off between attempts.
//
//   B. For the remaining 10 (persistent 404s), search ~/bozzies-dreamhost-backup
//      (read-only) for audio files whose filename or lowercased stem looks
//      like a match for the missing track title. If a match is found, copy
//      it (not move — the backup stays untouched) into the WP media library
//      and swap the archive.org URL for the local one.
//
// Reports: tracks recovered via retry, tracks matched in backup, tracks
// still missing. Idempotent — a track whose URL already points at
// /wp-content/uploads/ is skipped.

import { execSync, execFileSync } from 'node:child_process';
import { mkdirSync, copyFileSync, statSync, existsSync, writeFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { wp } from './lib.mjs';

const BACKUP_ROOT = resolve(process.env.HOME, 'bozzies-dreamhost-backup');
const tmpDir     = resolve(process.cwd(), 'theme/bozzies/.import-tmp/archive-org-retry');
const containerTmp = '/var/www/html/wp-content/themes/bozzies/.import-tmp/archive-org-retry';
mkdirSync(tmpDir, { recursive: true });

// --- The 12 tracks that failed on the first pass -----------------------------
// Each has: label (human-readable track title for backup matching), url (the
// stored archive.org URL on the home playlist block), mode ('retry' | 'backup').
const MISSING = [
	// 503 — retry
	{ label: 'On the Highway to Heaven',               mode: 'retry',
	  url: 'https://archive.org/download/1930-USA-Archives-1930-07-20-Boswell-Sisters-Were-On-The-Highway-To-Heaven/1930-USA-Archives-1930-07-20-Boswell-Sisters-Were-On-The-Highway-To-Heaven.mp3' },
	{ label: 'Lawd, You Made the Night Too Long',      mode: 'retry',
	  url: 'https://archive.org/download/LawdYouMadeTheNightTooLongDonRedmanBingCrosbyBoswellSisters/LawdYouMadeTheNightTooLongDonRedmanBingCrosbyBoswellSisters_vbr.mp3' },
	// 404 — try to find a match in the backup
	{ label: "I'm All Dressed Up With a Broken Heart", mode: 'backup', keywords: ['dressed', 'broken', 'heart'],
	  url: 'https://archive.org/download/1925-USA-Archives-1925-00-00-Boswell-Sisters-Im-All-Dressed-Up-With-A-Broken-Heart/1925-USA-Archives-1925-00-00-Boswell-Sisters-Im-All-Dressed-Up-With-A-Broken-Heart.mp3' },
	{ label: "Doggone, I've Done It",                  mode: 'backup', keywords: ['doggone', 'done'],
	  url: "https://archive.org/download/78_doggone-ive-done-it-acc-by-the-dorsey-brothers-the-boswell/31905%20Doggone%20I%27ve%20done%20it.mp3" },
	{ label: "Doggone, I've Done It (Again)",          mode: 'backup', keywords: ['doggone', 'done', 'again'],
	  url: 'https://archive.org/download/1932-USA-Archives-1932-00-00-Boswell-Sisters-Doggone-Ive-Done-It-Again/1932-USA-Archives-1932-00-00-Boswell-Sisters-Doggone-Ive-Done-It-Again.mp3' },
	{ label: 'Hand Me Down My Walking Cane',           mode: 'backup', keywords: ['hand', 'walking', 'kane', 'cane'],
	  url: 'https://archive.org/download/1932-USA-Archives-1932-00-00-Boswell-Sisters-Hand-Me-Down-My-Walking-Kane/1932-USA-Archives-1932-00-00-Boswell-Sisters-Hand-Me-Down-My-Walking-Kane.mp3' },
	{ label: 'Old Yazoo',                              mode: 'backup', keywords: ['yazoo'],
	  url: 'https://archive.org/download/1932-USA-Archives-1932-00-00-Boswell-Sisters-Old-Yazoo/1932-USA-Archives-1932-00-00-Boswell-Sisters-Old-Yazoo.mp3' },
	{ label: 'Sophisticated Lady',                     mode: 'backup', keywords: ['sophisticated', 'lady'],
	  url: 'https://archive.org/download/1933-USA-Archives-1933-00-00-The-Boswell-Sisters-Sophisticated-Lady/1933-USA-Archives-1933-00-00-The-Boswell-Sisters-Sophisticated-Lady.mp3' },
	{ label: 'Fare Thee Well',                         mode: 'backup', keywords: ['fare', 'thee', 'well'],
	  url: "https://archive.org/download/78_fare-thee-well-with-instr-accomp-the-boswell-sisters-wrubel/31907%20Fare%20thee%20well.mp3" },
	{ label: "Gee, But I'd Like to Make You Happy",    mode: 'backup', keywords: ['gee', 'happy', 'like-to-make'],
	  url: "https://archive.org/download/78_gee-but-id-like-to-make-you-happy_the-three-boswell-sisters-shay-ward-montgomery_gbia3029179a/GEE%2C%20BUT%20I%27D%20LIKE%20TO%20MAKE%20YOU%20HAPPY%20-%20THE%20THREE%20BOSWELL%20SISTERS.mp3" },
	{ label: 'Top Hat, White Tie and Tails',           mode: 'backup', keywords: ['top-hat', 'white-tie', 'tails'],
	  url: "https://archive.org/download/78_top-hat-white-tie-and-tails-with-orch-accomp-the-boswell/29063%20Top%20hat%2C%20white%20tie%20and%20tails.mp3" },
	{ label: "It Don't Mean a Thing (If It Ain't Got That Swing)", mode: 'backup', keywords: ['dontmeanathing', "it-don", 'swing', 'mean-a-thing', 'itdontmeanathing', 'itdon', 'meanathing'],
	  url: 'https://archive.org/download/78itdontmeanathingifitaintgotthatswingtheboswellsistersthedorseycleaningbypoofyhairproductions/78ItDontMeanAThingIfItAintGotThatSwingTheBoswellSistersTheDorseyCleaningByPoofyHairProductions.mp3' },
];

// --- Helpers -----------------------------------------------------------------

function slugify(s) {
	return String(s)
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 100);
}

async function tryFetch(url, dest, attempts = 3) {
	for (let i = 1; i <= attempts; i++) {
		try {
			console.log(`    attempt ${i}/${attempts}…`);
			const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(60000) });
			if (!res.ok) {
				console.log(`      HTTP ${res.status}`);
				if (res.status === 503 && i < attempts) {
					await new Promise(r => setTimeout(r, i * 15000));
					continue;
				}
				return { ok: false, status: res.status };
			}
			const buf = Buffer.from(await res.arrayBuffer());
			if (buf.length < 2000) {
				console.log(`      only ${buf.length} B — probably an HTML error page`);
				return { ok: false, status: 'tiny' };
			}
			writeFileSync(dest, buf);
			return { ok: true, bytes: buf.length };
		} catch (err) {
			console.log(`      ${err.message}`);
			if (i < attempts) await new Promise(r => setTimeout(r, i * 15000));
		}
	}
	return { ok: false, status: 'timeout' };
}

// Build a one-time index of every audio file under the dreamhost backup.
function buildBackupIndex() {
	console.log('scanning backup for audio files…');
	const out = execSync(
		`find ${BACKUP_ROOT} -type f \\( -iname "*.mp3" -o -iname "*.m4a" -o -iname "*.wav" -o -iname "*.ogg" -o -iname "*.flac" \\)`,
		{ encoding: 'utf8', maxBuffer: 50 * 1024 * 1024, shell: '/bin/bash' }
	);
	const files = out.split('\n').map((p) => p.trim()).filter(Boolean);
	console.log(`  found ${files.length} audio files`);
	// Precompute a lower-case flat key for each path for keyword matching.
	return files.map((path) => {
		const name = basename(path).toLowerCase();
		const flat = name.replace(/[^a-z0-9]+/g, '-');
		return { path, name, flat };
	});
}

function findInBackup(keywords, index) {
	// Reject keywords shorter than 5 chars — short words like "well" false-
	// match inside unrelated names ("Boswell") and have been painful.
	const needles = keywords
		.map((k) => k.toLowerCase().replace(/[^a-z0-9]+/g, '-'))
		.filter((n) => n && n.replace(/-/g, '').length >= 5);
	if (!needles.length) return null;
	let best = null;
	let bestScore = 0;
	for (const f of index) {
		let score = 0;
		for (const n of needles) {
			if (f.flat.includes(n) || f.name.includes(n)) score++;
		}
		if (score > bestScore) {
			bestScore = score;
			best = { ...f, score };
		}
	}
	// Require at least two keyword matches (defeats single-word false positives)
	// OR a single very-specific match (>= 10 chars, so a long compound keyword
	// matching uniquely counts). File size > 100KB avoids test stubs.
	if (!best) return null;
	const matchedNeedles = needles.filter((n) => best.flat.includes(n) || best.name.includes(n));
	const hasLongNeedle = matchedNeedles.some((n) => n.replace(/-/g, '').length >= 10);
	if (bestScore < 2 && !hasLongNeedle) return null;
	if (statSync(best.path).size <= 100 * 1024) return null;
	return best;
}

function importToMediaLibrary(localPath, title) {
	// Copy into the theme's tmp dir so the container sees it.
	const dest = resolve(tmpDir, slugify(title) + '.mp3');
	copyFileSync(localPath, dest);
	const containerPath = `${containerTmp}/${basename(dest)}`;
	const idOut = execFileSync('npx', [
		'wp-env', 'run', 'cli', '--env-cwd=/var/www/html', 'wp',
		'media', 'import', containerPath,
		`--title=${title}`,
		'--porcelain',
	], { encoding: 'utf8', maxBuffer: 100 * 1024 * 1024 }).trim();
	const id = parseInt(idOut.split(/\s+/).filter((s) => /^\d+$/.test(s)).pop() || '0', 10);
	if (!id) throw new Error(`wp media import returned no id: ${idOut}`);
	const attFile = wp(['post', 'meta', 'get', String(id), '_wp_attached_file']).trim().split(/\s+/).pop();
	return { id, url: `/wp-content/uploads/${attFile}`, bytes: statSync(localPath).size };
}

function searchReplace(oldUrl, newUrl) {
	const out = wp([
		'search-replace',
		oldUrl,
		newUrl,
		'wp_posts',
		'--all-tables-with-prefix',
		'--report-changed-only',
	]);
	return (out.match(/Success: Made (\d+) replacements/) || [])[1] || '0';
}

// --- Main --------------------------------------------------------------------

const index = buildBackupIndex();

const recoveredByRetry  = [];
const recoveredByBackup = [];
const stillMissing      = [];

// Idempotency: check whether the archive.org URL is still present anywhere
// in wp_posts. If search-replace has already run it, skip.
function stillInDb(url) {
	const q = `SELECT COUNT(*) FROM wp_posts WHERE post_content LIKE '%${url.replace(/'/g, "''")}%'`;
	const out = wp(['db', 'query', q, '--skip-column-names']);
	const n = parseInt(out.trim().split(/\s+/).find((x) => /^\d+$/.test(x)) || '0', 10);
	return n > 0;
}

for (const t of MISSING) {
	console.log(`\n${t.label} [${t.mode}]`);
	if (!stillInDb(t.url)) {
		console.log('  already recovered in DB, skipping');
		continue;
	}
	if (t.mode === 'retry') {
		const dest = resolve(tmpDir, slugify(t.label) + '.mp3');
		const result = await tryFetch(t.url, dest, 3);
		if (!result.ok) {
			stillMissing.push({ ...t, reason: `retry: ${result.status}` });
			continue;
		}
		const { id, url, bytes } = importToMediaLibrary(dest, t.label);
		const n = searchReplace(t.url, url);
		recoveredByRetry.push({ ...t, newUrl: url, bytes, attachmentId: id, replacements: n });
		console.log(`  recovered ${bytes} B → attachment ${id}, ${n} replacements`);
	} else {
		const match = findInBackup(t.keywords, index);
		if (!match) {
			stillMissing.push({ ...t, reason: 'no backup match' });
			console.log('  no backup match');
			continue;
		}
		console.log(`  backup match: ${match.path} (score=${match.score})`);
		const { id, url, bytes } = importToMediaLibrary(match.path, t.label);
		const n = searchReplace(t.url, url);
		recoveredByBackup.push({ ...t, backupPath: match.path, newUrl: url, bytes, attachmentId: id, replacements: n });
		console.log(`  recovered ${bytes} B → attachment ${id}, ${n} replacements`);
	}
}

console.log('\n=== SUMMARY ===');
console.log(`Recovered by retry:  ${recoveredByRetry.length}`);
for (const r of recoveredByRetry) {
	console.log(`  ${(r.bytes / 1024).toFixed(1).padStart(8)} KB  ${r.label}`);
}
console.log(`Recovered by backup: ${recoveredByBackup.length}`);
for (const r of recoveredByBackup) {
	console.log(`  ${(r.bytes / 1024).toFixed(1).padStart(8)} KB  ${r.label}`);
	console.log(`                     ← ${r.backupPath}`);
}
console.log(`\nStill missing: ${stillMissing.length}`);
for (const m of stillMissing) {
	console.log(`  (${m.reason}) ${m.label}`);
	console.log(`                  URL: ${m.url}`);
}
