#!/usr/bin/env node
// scripts/import/kingepistle-pdf.mjs
//
// One-shot patcher that:
//   1. Imports the "Kingepistle1.pdf" the old site served from
//      /wp-content/uploads/2016/06/ (verbatim copy sitting in the
//      Dreamhost backup) into the WP media library.
//   2. Rewrites the "Click Here" anchor on the king-sisters article
//      (post 109) so it points at the new attachment URL instead of
//      the old bozzies.org/wp-content/uploads/2016/06/ URL that 404s
//      now.
//
// Idempotent on both halves: looks up the attachment by filename
// before copying, and only touches the link if the old URL still
// appears in post_content.

import { execSync } from 'node:child_process';
import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { wp } from './lib.mjs';

const BACKUP_PDF = resolve(
	process.env.HOME,
	'bozzies-dreamhost-backup/bozzies.org/backup2024/wp-content/uploads/2016/06/Kingepistle1.pdf'
);

// Staging dir inside the theme so the wp-env cli container can see the
// file via its /var/www/html/wp-content/themes/bozzies/ mount.
const STAGE_DIR  = resolve('theme/bozzies/.import-tmp/kingepistle');
const STAGE_FILE = resolve(STAGE_DIR, 'Kingepistle1.pdf');
const CONTAINER_PATH = 'wp-content/themes/bozzies/.import-tmp/kingepistle/Kingepistle1.pdf';

if ( ! existsSync( BACKUP_PDF ) ) {
	console.error(`not found in backup: ${BACKUP_PDF}`);
	process.exit(1);
}
mkdirSync(STAGE_DIR, { recursive: true });
if ( ! existsSync( STAGE_FILE ) ) {
	copyFileSync(BACKUP_PDF, STAGE_FILE);
}

// Idempotent import — look up by attached filename first.
const existing = wp([
	'db', 'query',
	"SELECT post_id FROM wp_postmeta WHERE meta_key='_wp_attached_file' AND meta_value LIKE '%/Kingepistle1.pdf' LIMIT 1",
	'--skip-column-names',
]).trim();
const existingId = parseInt((existing.split(/\s+/).find((x) => /^\d+$/.test(x)) || '0'), 10);

let attId;
if (existingId) {
	console.log(`already in media library at id=${existingId}`);
	attId = existingId;
} else {
	const porc = execSync(
		`npx wp-env run cli --env-cwd=/var/www/html wp media import ${CONTAINER_PATH} --title="King epistle" --porcelain 2>&1`,
		{ encoding: 'utf8', shell: '/bin/bash' }
	).trim();
	attId = parseInt((porc.split(/\s+/).find((x) => /^\d+$/.test(x)) || '0'), 10);
	if (!attId) {
		console.error('wp media import did not return an id:\n' + porc);
		process.exit(1);
	}
	console.log(`imported Kingepistle1.pdf as attachment id=${attId}`);
}

const file = wp(['post', 'meta', 'get', String(attId), '_wp_attached_file']).trim().split(/\s+/).pop();
const newUrl = `/wp-content/uploads/${file}`;

const oldUrl = 'http://bozzies.org/wp-content/uploads/2016/06/Kingepistle1.pdf';
const content = wp(['post', 'get', '109', '--field=post_content']);
if ( ! content.includes( oldUrl ) ) {
	console.log('post 109 already repointed; nothing to do.');
	process.exit(0);
}
const next = content.split(oldUrl).join(newUrl);
const php = `wp_update_post(['ID'=>109,'post_content'=>wp_slash('${next.replace(/\\/g,'\\\\').replace(/'/g,"\\'")}')]); echo 'OK';`;
wp(['eval', php]);
console.log(`post 109: ${oldUrl} → ${newUrl}`);
