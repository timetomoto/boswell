import { chromium } from 'playwright-core';
const url = process.argv[2];
const vw = +(process.argv[3] || 1440);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: vw, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
const info = await page.evaluate(() => {
  const q = s => document.querySelector(s);
  const header = q('header');
  const main = q('main');
  const footer = q('footer');
  const postContent = q('.wp-block-post-content');
  const firstMainChild = postContent?.firstElementChild;
  const lastMainChild = postContent?.lastElementChild;
  const rect = el => el ? { y: Math.round(el.getBoundingClientRect().top), bot: Math.round(el.getBoundingClientRect().bottom), cls: (typeof el.className === 'string' ? el.className : '').slice(0,60) } : null;
  return {
    header: rect(header),
    main: rect(main),
    postContent: rect(postContent),
    firstChild: rect(firstMainChild),
    lastChild: rect(lastMainChild),
    footer: rect(footer),
  };
});
await browser.close();
console.log(JSON.stringify(info, null, 2));
