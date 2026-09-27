#!/usr/bin/env node
// Tab through a page starting from the first focusable in <main> and report
// which elements receive focus. Also count links inside `.wp-block-group.is-
// style-card` (etc.) so we can confirm cards expose ONE link each.
import { chromium } from 'playwright-core';
const url = process.argv[2];
if (!url) { console.error('usage: keyboard-tab.mjs <url>'); process.exit(2); }

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });

// Count links per card.
const cardInfo = await page.evaluate(() => {
  const results = [];
  const cards = [
    ...document.querySelectorAll('.wp-block-group.is-style-card, .wp-block-group.is-style-card-plain'),
  ];
  for (const c of cards) {
    const links = c.querySelectorAll('a');
    const primary = c.querySelector('a.wp-block-button__link');
    const h = c.querySelector('h1,h2,h3,h4');
    results.push({
      title: (h?.innerText || '').trim().slice(0, 40),
      linkCount: links.length,
      primaryText: (primary?.innerText || '').trim().slice(0, 40),
      primaryComputedInset: primary ? getComputedStyle(primary, '::before').inset : null,
    });
  }
  return results;
});
console.log('=== Cards on page ===');
for (const c of cardInfo) console.log(JSON.stringify(c));

// Tab through and record focused elements.
console.log('\n=== Tab focus trace (starts from first focusable) ===');
await page.evaluate(() => document.querySelector('main a')?.focus());
for (let i = 0; i < 20; i++) {
  const focused = await page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    // Find nearest card ancestor for context.
    let card = null;
    let cur = el;
    while (cur && cur !== document.body) {
      if (cur.classList?.contains('is-style-card') || cur.classList?.contains('is-style-card-plain')) {
        card = cur.querySelector('h1,h2,h3,h4')?.innerText?.trim().slice(0, 30) || '(card)';
        break;
      }
      cur = cur.parentElement;
    }
    return {
      tag: el.tagName, text: (el.innerText || el.value || el.getAttribute('href') || '').trim().slice(0, 40),
      outline: cs.outline,
      insideCard: card,
      rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
    };
  });
  if (focused) console.log(`  #${i}: ${focused.tag}  card=${focused.insideCard || '—'}  text="${focused.text}"  outline=${focused.outline}`);
  await page.keyboard.press('Tab');
}

await browser.close();
