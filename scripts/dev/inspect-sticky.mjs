import { chromium } from 'playwright-core';
const url = process.argv[2];
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
const info = await page.evaluate(() => {
  const col = document.querySelector('.bozzies-bio-body > .wp-block-columns > .wp-block-column:first-child');
  if (!col) return { error: 'column not found' };
  const cs = getComputedStyle(col);
  const result = {
    position: cs.position, top: cs.top,
    display: cs.display, flexBasis: cs.flexBasis,
    minHeight: cs.minHeight, height: cs.height, alignSelf: cs.alignSelf,
    ancestorsWithOverflow: [],
  };
  let cur = col.parentElement;
  while (cur && cur !== document.documentElement) {
    const c = getComputedStyle(cur);
    if (c.overflow !== 'visible' || c.overflowY !== 'visible' || c.overflowX !== 'visible') {
      result.ancestorsWithOverflow.push({
        tag: cur.tagName, cls: (cur.className || '').toString().slice(0, 80),
        overflow: c.overflow, overflowX: c.overflowX, overflowY: c.overflowY,
      });
    }
    cur = cur.parentElement;
  }
  return result;
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
