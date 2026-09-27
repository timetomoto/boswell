import { chromium } from 'playwright-core';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto('http://localhost:8888/sisters/', { waitUntil: 'networkidle' });
await page.evaluate(() => {
  const link = document.querySelector('.wp-block-group.is-style-card-plain a.wp-block-button__link');
  link?.focus();
});
const info = await page.evaluate(() => {
  const card = document.querySelector('.wp-block-group.is-style-card-plain');
  const cs = getComputedStyle(card);
  return { outline: cs.outline, outlineWidth: cs.outlineWidth, outlineStyle: cs.outlineStyle, outlineColor: cs.outlineColor, outlineOffset: cs.outlineOffset };
});
console.log('Card focus-within outline:', JSON.stringify(info, null, 2));
await browser.close();
