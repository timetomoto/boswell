import { chromium } from 'playwright-core';
const routes = process.argv.slice(2);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext({ deviceScaleFactor: 1 });
const page = await ctx.newPage();
for (const r of routes) {
  const [name, wpPath, astroPath] = r.split('|');
  for (const vw of [1440, 390]) {
    await page.setViewportSize({ width: vw, height: 900 });
    for (const [label, url] of [['wp', `http://localhost:8888${wpPath}`], ['astro', `https://boswell-poc.vercel.app${astroPath}`]]) {
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
      } catch (e) { console.log(`WARN ${label} ${url}: ${e.message}`); }
      await page.evaluate(() => window.scrollTo(0, 0));
      await new Promise(r => setTimeout(r, 400));
      const out = `_screens/task-10/${name}-${label}-${vw}.png`;
      await page.screenshot({ path: out, fullPage: true });
      console.log(`wrote ${out}`);
    }
  }
}
await browser.close();
