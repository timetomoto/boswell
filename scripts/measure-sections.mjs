import { chromium } from 'playwright-core';

const targets = [
  { key: 'sample', wpSel: '.wp-block-bozzies-section.has-backdrop-staves', astroSel: '.sample-section' },
  { key: 'donate', wpSel: '.wp-block-bozzies-section.has-backdrop-diamond-grid', astroSel: '.donate-teaser' },
];
const sites = [
  { name: 'WP',    url: 'http://localhost:8888/' },
  { name: 'ASTRO', url: 'https://boswell-poc.vercel.app/' },
];

const b = await chromium.launch({ channel: 'chrome', headless: true });
for (const vw of [1440, 390]) {
  console.log('\n############ vw=' + vw + ' ############');
  for (const t of targets) {
    console.log('\n=== ' + t.key + ' (vw=' + vw + ') ===');
    const data = {};
    for (const site of sites) {
      const c = await b.newContext({ viewport: { width: vw, height: 900 }, reducedMotion: 'reduce' });
      const p = await c.newPage();
      await p.goto(site.url, { waitUntil: 'networkidle', timeout: 60000 });
      const sel = site.name === 'WP' ? t.wpSel : t.astroSel;
      const info = await p.evaluate((sel) => {
        const sec = document.querySelector(sel);
        if (!sec) return null;
        const secR = sec.getBoundingClientRect();
        const cs = getComputedStyle(sec);
        const secTop = secR.top + window.scrollY;
        const rows = [];
        const push = (label, el) => {
          if (!el) return;
          const r = el.getBoundingClientRect();
          const s = getComputedStyle(el);
          rows.push({
            label,
            top: Math.round(r.top + window.scrollY - secTop),
            bottom: Math.round(r.bottom + window.scrollY - secTop),
            h: Math.round(r.height),
            fs: s.fontSize,
            lh: s.lineHeight,
            mt: s.marginTop,
            mb: s.marginBottom,
            pt: s.paddingTop,
            pb: s.paddingBottom,
          });
        };
        push('eyebrow', sec.querySelector('.is-style-eyebrow, .eyebrow'));
        push('h2', sec.querySelector('h2'));
        const paras = sec.querySelectorAll('p:not(.is-style-eyebrow):not(.eyebrow):not(.eyebrow--purple)');
        paras.forEach((p, i) => push('p' + (i+1), p));
        push('buttons', sec.querySelector('.wp-block-buttons, .sample__cta, .btn'));
        push('button', sec.querySelector('.wp-block-button__link, .sample__cta, .btn'));
        return {
          section: { h: Math.round(secR.height), pt: cs.paddingTop, pb: cs.paddingBottom, mt: cs.marginTop, mb: cs.marginBottom },
          rows,
        };
      }, sel);
      data[site.name] = info;
      await c.close();
    }
    if (!data.WP || !data.ASTRO) { console.log('missing:', !data.WP ? 'WP' : 'ASTRO'); continue; }
    // Print section-level line
    console.log('section  h  pt  pb');
    console.log('  WP    ' + data.WP.section.h + '  ' + data.WP.section.pt + '  ' + data.WP.section.pb);
    console.log('  Astro ' + data.ASTRO.section.h + '  ' + data.ASTRO.section.pt + '  ' + data.ASTRO.section.pb);
    console.log('  Δh    ' + (data.WP.section.h - data.ASTRO.section.h) + 'px');
    console.log('');
    console.log('label     WP.top  As.top  Δtop   WP.h  As.h   Δh   WP.fs      As.fs      Δfs    WP.lh      As.lh');
    const merge = new Map();
    for (const r of data.WP.rows)    merge.set(r.label, { wp: r });
    for (const r of data.ASTRO.rows) merge.set(r.label, Object.assign(merge.get(r.label) || {}, { as: r }));
    for (const [label, {wp, as}] of merge) {
      const nb = (x) => x == null ? '-' : x;
      const num = v => v === '-' ? '-' : parseFloat(v);
      const dTop = wp && as ? (wp.top - as.top) : '-';
      const dH   = wp && as ? (wp.h - as.h) : '-';
      const dFs  = wp && as ? (num(wp.fs) - num(as.fs)).toFixed(2) : '-';
      const pad = (v, w) => String(v).padEnd(w);
      console.log(
        pad(label, 9) +
        pad(nb(wp && wp.top), 8) +
        pad(nb(as && as.top), 8) +
        pad(dTop, 6) +
        pad(nb(wp && wp.h), 6) +
        pad(nb(as && as.h), 6) +
        pad(dH, 5) +
        pad(nb(wp && wp.fs), 11) +
        pad(nb(as && as.fs), 11) +
        pad(dFs, 7) +
        pad(nb(wp && wp.lh), 11) +
        pad(nb(as && as.lh), 11)
      );
    }
  }
}
await b.close();
