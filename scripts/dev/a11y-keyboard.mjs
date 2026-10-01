#!/usr/bin/env node
// scripts/dev/a11y-keyboard.mjs
//
// Keyboard-navigation harness — for each representative page tab through
// the first 30 focusables and record each stop's bounding box, outline
// style, and whether the sticky site-nav intersects a mid-page focused
// element after scroll. Keeps a permanent machine-checked record of
// visible-focus (WCAG 2.4.7) + focus-not-hidden (WCAG 2.4.11) status.

import { chromium } from 'playwright';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

async function focusChain(page, limit = 30) {
	const chain = [];
	await page.evaluate(() => {
		document.body.setAttribute('tabindex', '-1');
		document.body.focus();
	});
	for (let i = 0; i < limit; i++) {
		await page.keyboard.press('Tab');
		const info = await page.evaluate(() => {
			const el = document.activeElement;
			if (!el || el === document.body) return null;
			const r = el.getBoundingClientRect();
			const cs = getComputedStyle(el);
			return {
				tag: el.tagName,
				cls: (el.className && el.className.toString ? el.className.toString() : el.className) || '',
				text: (el.innerText || el.getAttribute('aria-label') || el.value || '').trim().slice(0, 36),
				x: Math.round(r.left),
				y: Math.round(r.top),
				w: Math.round(r.width),
				h: Math.round(r.height),
				outlineW: cs.outlineWidth,
				outlineS: cs.outlineStyle,
				boxShadow: cs.boxShadow === 'none' ? '-' : 'shadow',
			};
		});
		if (!info) break;
		chain.push(info);
	}
	return chain;
}

const PAGES = [
	['home',          '/'],
	['sisters-hub',   '/sisters/'],
	['sister-bio',    '/sisters/connee/'],
	['career-tl',     '/sisters/career-timeline/'],
	['media-hub',     '/media/'],
	['lesson',        '/media/lessons/lesson-1/'],
	['charts',        '/media/charts/'],
	['discography',   '/media/discography/'],
	['press-hub',     '/press/'],
	['press-sub',     '/press/vintage/'],
	['video-article', '/media/video/alexanders-ragtime-band/'],
	['contact',       '/contact/'],
	['privacy',       '/privacy-policy/'],
	['404',           '/__nonexistent__/'],
];

const b = await chromium.launch({ executablePath: CHROME, headless: true });

const summary = {};

for (const vw of [1440, 390]) {
	const c = await b.newContext({ viewport: { width: vw, height: 900 } });
	const p = await c.newPage();
	for (const [key, path] of PAGES) {
		const slot = `${key}@${vw}`;
		try {
			await p.goto('http://localhost:8888' + path, { waitUntil: 'networkidle', timeout: 60000 });
			const chain = await focusChain(p, 30);
			const noFocus = chain.filter((e) => e.outlineS === 'none' && e.boxShadow === '-');
			// Mid-page focus-hidden check: scroll down then tab once.
			await p.evaluate(() => window.scrollTo(0, 1500));
			await p.keyboard.press('Tab');
			const hidden = await p.evaluate(() => {
				const nav = document.querySelector('.site-nav');
				const el = document.activeElement;
				if (!nav || !el) return null;
				const nR = nav.getBoundingClientRect();
				const eR = el.getBoundingClientRect();
				return { navBottom: Math.round(nR.bottom), elTop: Math.round(eR.top), hidden: eR.top >= 0 && eR.top < nR.bottom };
			});
			summary[slot] = {
				chainLen: chain.length,
				noVisibleFocus: noFocus.length,
				noFocusTargets: noFocus.slice(0, 5).map((e) => `${e.tag}.${e.cls.slice(0, 40)}`),
				focusHiddenUnderSticky: hidden?.hidden ?? null,
			};
		} catch (e) {
			summary[slot] = { error: String(e.message || e).slice(0, 200) };
		}
	}
	await c.close();
}
await b.close();

console.log('\n=== Keyboard summary ===');
console.log('slot                   chain  no-focus  hidden-under-sticky  no-focus samples');
let totalNoFocus = 0;
for (const slot of Object.keys(summary)) {
	const s = summary[slot];
	if (s.error) { console.log(slot.padEnd(22), 'ERROR', s.error); continue; }
	totalNoFocus += s.noVisibleFocus;
	const samples = s.noFocusTargets.join(', ');
	console.log(`${slot.padEnd(22)} ${String(s.chainLen).padStart(5)}  ${String(s.noVisibleFocus).padStart(8)}  ${(s.focusHiddenUnderSticky ? 'YES' : 'no').padStart(19)}  ${samples}`);
}
console.log(`\nTotal focusables with no visible focus marker: ${totalNoFocus}`);
process.exit(totalNoFocus === 0 ? 0 : 1);
