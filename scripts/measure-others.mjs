import { chromium } from 'playwright-core';
const targets = [
  { key: 'intro',    wp: 'section.wp-block-bozzies-section.ground-paper:not(.has-backdrop-vinyl):not(.has-backdrop-staves)', astro: '.intro-section' },
  { key: 'playlist', wp: '.wp-block-bozzies-section.has-backdrop-vinyl',  astro: '.playlist-section' },
  { key: 'voices',   wp: '.wp-block-bozzies-section.has-backdrop-notes',  astro: '.voices-section' },
];
const b = await chromium.launch({ channel: 'chrome', headless: true });
for (const vw of [1440, 390]) {
  console.log('\n### vw=' + vw + ' ###');
  for (const t of targets) {
    const data = {};
    for (const [name, url] of [['WP', 'http://localhost:8888/'], ['Astro', 'https://boswell-poc.vercel.app/']]) {
      const c = await b.newContext({ viewport: { width: vw, height: 900 }, reducedMotion: 'reduce' });
      const p = await c.newPage();
      await p.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
      const sel = name === 'WP' ? t.wp : t.astro;
      const info = await p.evaluate((sel) => {
        const sec = document.querySelector(sel);
        if (!sec) return null;
        const r = sec.getBoundingClientRect();
        const secTop = r.top + window.scrollY;
        const paras = Array.from(sec.querySelectorAll('p'));
        return {
          h: Math.round(r.height),
          paras: paras.map(p => {
            const rr = p.getBoundingClientRect();
            const cs = getComputedStyle(p);
            return { text: (p.innerText || '').trim().split('\n')[0].slice(0,25), top: Math.round(rr.top + window.scrollY - secTop), fs: cs.fontSize };
          }),
        };
      }, sel);
      data[name] = info;
      await c.close();
    }
    const w = data.WP, a = data.Astro;
    if (!w || !a) { console.log(t.key + ' missing'); continue; }
    console.log(t.key + ': WP.h=' + w.h + ' Astro.h=' + a.h + ' Δh=' + (w.h - a.h));
    for (let i = 0; i < Math.max(w.paras.length, a.paras.length); i++) {
      const wp = w.paras[i], as = a.paras[i];
      if (!wp || !as) continue;
      console.log('  p' + (i+1) + '  WP: t=' + wp.top + ' fs=' + wp.fs + '  vs Astro: t=' + as.top + ' fs=' + as.fs + '  Δt=' + (wp.top - as.top));
    }
  }
}
await b.close();
