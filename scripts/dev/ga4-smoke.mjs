#!/usr/bin/env node
// scripts/dev/ga4-smoke.mjs
//
// Verify the consent-gated Google Analytics 4 flow on the live site. Loads
// the home page in a fresh Chromium context, logs every request that
// touches googletagmanager.com or google-analytics.com, clicks either
// Accept or Decline on the cookie banner (or neither — `none` mode),
// navigates to a second page, and reports what GA requests fired at each
// step.
//
// Usage:
//   node scripts/dev/ga4-smoke.mjs [--action=accept|decline|none]
//                                   [--site=https://bozzies.org]
//
// A passing accept run reports:
//   - no GA requests before Accept
//   - gtag.js request to googletagmanager.com after Accept
//   - at least one /g/collect request to google-analytics.com with the
//     G-K0G0LKX17Z measurement id after Accept, and one on the second
//     page load

import { chromium } from 'playwright';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SITE = (process.argv.find(a => a.startsWith('--site=')) || '--site=https://bozzies.org').split('=')[1];
const ACTION = (process.argv.find(a => a.startsWith('--action=')) || '--action=accept').split('=')[1];
const MEASUREMENT_ID = 'G-K0G0LKX17Z';

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

const ga = []; // {url, host, phase, status}
let phase = 'before';

page.on('request', req => {
	const u = req.url();
	if (u.includes('googletagmanager.com') || u.includes('google-analytics.com') || u.includes('analytics.google.com')) {
		ga.push({ phase, host: new URL(u).host, path: new URL(u).pathname + (new URL(u).search || ''), method: req.method() });
	}
});
page.on('pageerror', e => console.error('[pageerror]', e.message));
page.on('console', msg => { if (msg.type() === 'error') console.error('[console]', msg.text()); });

console.log(`SITE=${SITE} ACTION=${ACTION} MEASUREMENT_ID=${MEASUREMENT_ID}`);
console.log('--- load home (phase: before) ---');
await page.goto(SITE + '/', { waitUntil: 'networkidle' });

const bannerVisible = await page.locator('#bozzies-consent').isVisible().catch(() => false);
const cookieConfig = await page.evaluate(() => window.__BOZZIES_CONSENT__ || null);
console.log('banner visible   :', bannerVisible);
console.log('consent config   :', JSON.stringify(cookieConfig));
console.log('cookies before   :', (await context.cookies()).map(c => c.name).join(',') || '(none)');

if (ACTION === 'accept' || ACTION === 'decline') {
	phase = ACTION === 'accept' ? 'after-accept' : 'after-decline';
	console.log(`--- click ${ACTION} (phase: ${phase}) ---`);
	const sel = ACTION === 'accept' ? '#bozzies-consent-accept' : '#bozzies-consent-decline';
	await page.locator(sel).click();
	// Wait a beat for gtag.js to inject + the first collect to fly
	await page.waitForTimeout(2000);
	await page.waitForLoadState('networkidle').catch(() => {});
}

console.log('cookies after    :', (await context.cookies()).map(c => `${c.name}=${c.value}`).join(',') || '(none)');

console.log('--- navigate to second page (same phase) ---');
await page.goto(SITE + '/sisters/', { waitUntil: 'networkidle' });
await page.waitForTimeout(4000);

console.log();
console.log('=== GA/GTM request log ===');
if (!ga.length) {
	console.log('(none)');
} else {
	for (const r of ga) {
		console.log(`  [${r.phase}] ${r.method} ${r.host}${r.path.slice(0, 180)}`);
	}
}

const beforeCount = ga.filter(r => r.phase === 'before').length;
const afterCount  = ga.filter(r => r.phase !== 'before').length;
const gtagJs      = ga.find(r => r.host === 'www.googletagmanager.com' && r.path.includes('gtag/js'));
const collectHits = ga.filter(r => (r.host === 'www.google-analytics.com' || r.host === 'region1.google-analytics.com' || r.host === 'analytics.google.com') && r.path.includes('/collect'));
const idMatch     = collectHits.find(r => r.path.includes(MEASUREMENT_ID.replace('G-', '')) || r.path.includes('tid=' + MEASUREMENT_ID) || r.path.includes(MEASUREMENT_ID));

console.log();
console.log('=== summary ===');
console.log('requests before action :', beforeCount);
console.log('requests after action  :', afterCount);
console.log('gtag.js loaded         :', gtagJs ? 'yes' : 'no');
console.log('collect requests       :', collectHits.length);
console.log(`measurement id ${MEASUREMENT_ID} seen on collect :`, idMatch ? 'yes' : 'no');

await browser.close();

// Exit non-zero if the result contradicts the chosen action.
const expectation = {
	accept: beforeCount === 0 && gtagJs && collectHits.length > 0 && idMatch,
	decline: beforeCount === 0 && !gtagJs && collectHits.length === 0,
	none: beforeCount === 0 && !gtagJs && collectHits.length === 0,
}[ACTION];
if (!expectation) {
	console.error('\nFAIL: result does not match expectation for action=' + ACTION);
	process.exit(1);
}
console.log('\nOK');
