import { chromium } from 'playwright-core';
import { PNG } from 'pngjs';
import { readFileSync, writeFileSync } from 'node:fs';

const targets = [
  { key: 'sample', wpSel: '.wp-block-bozzies-section.has-backdrop-staves', astroSel: '.sample-section' },
  { key: 'donate', wpSel: '.wp-block-bozzies-section.has-backdrop-diamond-grid', astroSel: '.donate-teaser' },
];

const b = await chromium.launch({ channel: 'chrome', headless: true });
for (const vw of [1440, 390]) {
  for (const t of targets) {
    const shots = {};
    for (const [name, url] of [['wp', 'http://localhost:8888/'], ['astro', 'https://boswell-poc.vercel.app/']]) {
      const c = await b.newContext({ viewport: { width: vw, height: 900 }, reducedMotion: 'reduce' });
      const p = await c.newPage();
      await p.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
      const sel = name === 'wp' ? t.wpSel : t.astroSel;
      const el = await p.$(sel);
      await el.scrollIntoViewIfNeeded();
      await p.waitForTimeout(200);
      const buf = await el.screenshot({ type: 'png' });
      shots[name] = PNG.sync.read(buf);
      await c.close();
    }
    // Side by side
    const H = Math.max(shots.wp.height, shots.astro.height);
    const W = shots.wp.width + shots.astro.width + 8;
    const out = new PNG({ width: W, height: H });
    // Fill white
    for (let i = 0; i < W * H * 4; i += 4) { out.data[i] = 255; out.data[i+1] = 255; out.data[i+2] = 255; out.data[i+3] = 255; }
    // WP on left
    for (let y = 0; y < shots.wp.height; y++) {
      const srcRow = y * shots.wp.width * 4;
      const dstRow = y * W * 4;
      shots.wp.data.copy(out.data, dstRow, srcRow, srcRow + shots.wp.width * 4);
    }
    // Astro on right
    for (let y = 0; y < shots.astro.height; y++) {
      const srcRow = y * shots.astro.width * 4;
      const dstRow = y * W * 4 + (shots.wp.width + 8) * 4;
      shots.astro.data.copy(out.data, dstRow, srcRow, srcRow + shots.astro.width * 4);
    }
    const path = '_screens/task-7g/side-' + t.key + '-' + vw + '.png';
    writeFileSync(path, PNG.sync.write(out));
    console.log('wrote', path, 'wpH=', shots.wp.height, 'astroH=', shots.astro.height);
  }
}
await b.close();
