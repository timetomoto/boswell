#!/usr/bin/env node
// scripts/dev/patch-preview-edits.mjs
//
// Patches the five block edit.js files so when `attributes.isPreview === true`
// they short-circuit the normal edit UI and render a static <img> thumbnail
// from `window.__BOZZIES_PREVIEW_BASE__`. Idempotent: looks for a marker
// comment and skips if already patched.

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PATCHES = [
	{ dir: 'playlist-player', file: 'playlist-player.png', destructureFind: /const\s*{\s*tracks\s*=\s*\[\]\s*}\s*=\s*attributes\s*;/ },
	{ dir: 'quotes-carousel', file: 'quotes-carousel.png', destructureFind: /const\s*{\s*quotes\s*=\s*\[\]\s*,?\s*autoPlayMs[^}]*}\s*=\s*attributes\s*;?/ },
	{ dir: 'discography',    file: 'discography.png',    destructureFind: /const\s*{[^}]*scopes[^}]*}\s*=\s*attributes\s*;/ },
	{ dir: 'lesson-player',  file: 'lesson-player.png',  destructureFind: /const\s*{[^}]*}\s*=\s*attributes\s*;/ },
	{ dir: 'timeline',       file: 'timeline.png',       destructureFind: /const\s*{[^}]*entries[^}]*}\s*=\s*attributes\s*;/ },
];

const PREVIEW_BLOCK = (file) => `
			// Inserter preview thumbnail — rendered when the block's example
			// in block.json sets isPreview:true. Avoids the JS/audio UI the
			// real edit view uses, which doesn't read well in the small preview.
			if ( attributes.isPreview ) {
				const base = ( typeof window !== 'undefined' && window.__BOZZIES_PREVIEW_BASE__ ) || '/wp-content/themes/bozzies/assets/img/block-previews/';
				return (
					<div { ...useBlockProps() }>
						<img
							src={ base + '${file}' }
							alt=""
							style={ { display: 'block', width: '100%', height: 'auto', borderRadius: 4 } }
						/>
					</div>
				);
			}
`;

for (const { dir, file, destructureFind } of PATCHES) {
	const path = resolve('theme/bozzies/blocks', dir, 'src', 'index.js');
	let src = readFileSync(path, 'utf8');

	if (src.includes('__BOZZIES_PREVIEW_BASE__')) {
		console.log(`  ${dir}  (already patched, skip)`);
		continue;
	}

	// Insert the preview block immediately after the `edit: ( { attributes, setAttributes } ) => {` line.
	const editOpenRe = /(edit:\s*\(\s*{\s*attributes[^}]*}\s*\)\s*=>\s*{)/;
	if (!editOpenRe.test(src)) {
		console.log(`  ${dir}  (edit signature not matched — SKIP)`);
		continue;
	}
	src = src.replace(editOpenRe, `$1${PREVIEW_BLOCK(file)}`);

	writeFileSync(path, src);
	console.log(`  ${dir}  (patched)`);
}
