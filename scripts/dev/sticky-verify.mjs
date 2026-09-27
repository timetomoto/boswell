import { chromium } from 'playwright-core';
const [url, out1, out2, y1, y2] = process.argv.slice(2);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
// Two scroll positions
await page.evaluate((y) => window.scrollTo(0, Number(y)), y1);
await new Promise(r => setTimeout(r, 300));
await page.screenshot({ path: out1, fullPage: false });
console.log(`wrote ${out1} at y=${y1}`);
await page.evaluate((y) => window.scrollTo(0, Number(y)), y2);
await new Promise(r => setTimeout(r, 300));
await page.screenshot({ path: out2, fullPage: false });
console.log(`wrote ${out2} at y=${y2}`);
await browser.close();
