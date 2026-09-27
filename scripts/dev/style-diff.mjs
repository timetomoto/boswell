#!/usr/bin/env node
/**
 * Computed-style comparison between a WP page and its Astro (Vercel) twin.
 *
 * Walks both pages, picks a curated set of "landmark" elements (hero section,
 * hero overlay, eyebrows, h1..h3, body p, lede p, cards, card links, buttons,
 * pull quotes, list rows, section wrappers), and reads a fixed set of
 * computed properties (font, color, box, background, border, layout). Pairs
 * elements by role + text-hash and reports every property mismatch.
 *
 * Usage:
 *   node scripts/dev/style-diff.mjs <wpUrl> <astroUrl> [--vw=1440] [--json]
 *
 * Emits a TSV mismatch table to stdout; use --json for a full JSON report.
 * Also reports heading line-counts (how many rows each h1/h2/h3 wraps to)
 * on both sides so wrap regressions are visible.
 */
import { chromium } from 'playwright-core';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const positional = args.filter(a => !a.startsWith('--'));
const flags = Object.fromEntries(args.filter(a => a.startsWith('--'))
  .map(a => { const [k, v = 'true'] = a.slice(2).split('='); return [k, v]; }));

const [wpUrl, astroUrl] = positional;
if (!wpUrl || !astroUrl) {
  console.error('usage: style-diff.mjs <wpUrl> <astroUrl> [--vw=1440] [--json]');
  process.exit(2);
}
const vw = Number(flags.vw || 1440);
const vh = Number(flags.vh || 900);
const asJson = flags.json === 'true';

const outDir = fileURLToPath(new URL('../../_screens/style-diff/', import.meta.url));
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

// Landmark roles: each role has one or more CSS selectors and a max sample
// count. Role name is used to pair elements across the two sites.
const LANDMARKS = [
  { role: 'hero-section',   sel: ['.wp-block-bozzies-section.is-hero-photo', '.page-hero.ground-purple', '.bio-hero.ground-purple', 'section.hero'], max: 1 },
  { role: 'hero-overlay',   sel: ['.wp-block-bozzies-section__overlay', '.hero__overlay', '.page-hero .hero-overlay'], max: 1 },
  { role: 'hero-title',     sel: ['section.wp-block-bozzies-section.is-hero-photo h1', '.page-hero h1', '.bio-hero h1', 'section.hero h1'], max: 1 },
  { role: 'hero-subtitle',  sel: ['section.wp-block-bozzies-section.is-hero-photo .bozzies-hero-subtitle', '.page-hero__subtitle', '.hero__subtitle'], max: 1 },
  { role: 'h1',             sel: ['h1'], max: 3 },
  { role: 'h2',             sel: ['h2'], max: 8 },
  { role: 'h3',             sel: ['h3'], max: 12 },
  { role: 'eyebrow',        sel: ['.is-style-eyebrow', '.eyebrow', '.eyebrow--purple'], max: 8 },
  { role: 'lede',           sel: ['.is-style-lede', '.has-lead-font-size'], max: 5 },
  { role: 'body-p',         sel: ['p:not(.is-style-eyebrow):not(.is-style-lede):not(.has-lead-font-size):not(.wp-block-site-title):not(.wp-element-button)'], max: 8 },
  { role: 'card',           sel: ['.wp-block-group.is-style-card', '.wp-block-group.is-style-card-plain', '.sister-card', '.subpage-card', '.music-teaser'], max: 6 },
  { role: 'card-link',      sel: ['.wp-block-group.is-style-card a.wp-block-button__link', '.wp-block-group.is-style-card-plain a.wp-block-button__link', '.sister-card__link', '.subpage-card', '.music-teaser'], max: 6 },
  { role: 'button-primary', sel: ['.wp-block-button__link', '.btn--purple', '.btn'], max: 6 },
  { role: 'pullquote',      sel: ['.wp-block-pullquote blockquote', '.pull-quote__quote', 'blockquote.pull-quote'], max: 3 },
  { role: 'pullquote-cite', sel: ['.wp-block-pullquote cite', '.pull-quote__attr'], max: 3 },
  { role: 'lesson-row',     sel: ['.bozzies-lesson-row', '.lesson-card', '.lesson-card__link'], max: 6 },
  { role: 'section-paper',  sel: ['.wp-block-bozzies-section.ground-paper', 'section.section.ground-paper', '.ground-paper'], max: 4 },
  { role: 'section-purple', sel: ['.wp-block-bozzies-section.ground-purple', 'section.section.ground-purple', '.ground-purple'], max: 2 },
  { role: 'section-gold',   sel: ['.wp-block-bozzies-section.ground-gold', 'section.section.ground-gold', '.ground-gold'], max: 2 },
];

// Properties we care about. Split into groups for readable output.
const PROPS = [
  'display', 'position',
  'width', 'height', 'padding', 'margin',
  'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing',
  'text-transform', 'text-align', 'font-style',
  'color', 'background-color', 'background-image',
  'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
  'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
  'align-items', 'justify-content', 'flex-direction',
];

// Load a page, gather landmarks + computed styles + heading line counts.
async function collect(page, url) {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 });
  await page.addStyleTag({ content: '*,*::before,*::after{animation-duration:0s!important;transition-duration:0s!important}' });
  await page.waitForTimeout(200);

  return await page.evaluate(({ LANDMARKS, PROPS }) => {
    const results = [];

    const normText = (s) => (s || '').replace(/\s+/g, ' ').trim().slice(0, 60).toLowerCase();
    const parseFamily = (s) => (s || '').split(',')[0].replace(/["']/g, '').trim();

    for (const { role, sel, max } of LANDMARKS) {
      const els = [];
      for (const s of sel) {
        for (const el of document.querySelectorAll(s)) els.push(el);
      }
      const seen = new Set();
      let count = 0;
      for (const el of els) {
        if (seen.has(el)) continue;
        seen.add(el);
        if (count >= max) break;
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        if (r.width === 0 || r.height === 0 || cs.display === 'none' || cs.visibility === 'hidden') continue;
        const text = normText(el.innerText || el.textContent);

        // Line count for headings — helps detect wrap regressions.
        let lineCount = null;
        if (/^h[1-3]$/.test(el.tagName.toLowerCase())) {
          const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2;
          lineCount = Math.max(1, Math.round(r.height / lh));
        }

        const styles = {};
        for (const p of PROPS) {
          styles[p] = cs.getPropertyValue(p);
        }
        // Reduce font-family to first family for cross-site fairness.
        styles['font-family'] = parseFamily(styles['font-family']);
        // Round pixel-ish values to 0.5px so sub-pixel jitter doesn't show up.
        for (const k of Object.keys(styles)) {
          const v = styles[k];
          if (typeof v === 'string' && v.endsWith('px')) {
            const n = parseFloat(v);
            styles[k] = Number.isFinite(n) ? `${Math.round(n * 2) / 2}px` : v;
          }
        }

        // Pair key: role + text hash (or role + child index if no text).
        const key = text ? `${role}|${text}` : `${role}|#${count}`;
        results.push({
          role, key, text, tag: el.tagName.toLowerCase(),
          rect: { w: Math.round(r.width), h: Math.round(r.height) },
          lineCount, styles,
        });
        count++;
      }
    }
    return results;
  }, { LANDMARKS, PROPS });
}

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: 1 });
const page = await ctx.newPage();

const wpRows = await collect(page, wpUrl);
const astroRows = await collect(page, astroUrl);
await browser.close();

// Pair by key.
const wpMap = new Map();
for (const r of wpRows) if (!wpMap.has(r.key)) wpMap.set(r.key, r);
const astroMap = new Map();
for (const r of astroRows) if (!astroMap.has(r.key)) astroMap.set(r.key, r);

// Also allow role-only pairing when text differs on both sides but role+index matches.
function fallbackPair(rows, other) {
  // Group by role, then pair by ordinal index for rows the strict-key
  // pass didn't consume.
  const byRole = new Map();
  for (const r of rows) {
    if (!byRole.has(r.role)) byRole.set(r.role, []);
    byRole.get(r.role).push(r);
  }
  return byRole;
}
const wpByRole = fallbackPair(wpRows);
const astroByRole = fallbackPair(astroRows);

const mismatches = [];
const paired = [];

for (const [key, wpRow] of wpMap) {
  const astroRow = astroMap.get(key);
  if (astroRow) {
    paired.push({ wp: wpRow, astro: astroRow, pairing: 'text' });
  }
}
// Fallback: pair by role + ordinal if not text-paired.
const alreadyWp = new Set(paired.map(p => p.wp));
const alreadyAstro = new Set(paired.map(p => p.astro));
for (const role of wpByRole.keys()) {
  const wpList = (wpByRole.get(role) || []).filter(r => !alreadyWp.has(r));
  const asList = (astroByRole.get(role) || []).filter(r => !alreadyAstro.has(r));
  const n = Math.min(wpList.length, asList.length);
  for (let i = 0; i < n; i++) {
    paired.push({ wp: wpList[i], astro: asList[i], pairing: 'role-index' });
  }
}

for (const { wp: w, astro: a, pairing } of paired) {
  for (const p of PROPS) {
    const wv = w.styles[p];
    const av = a.styles[p];
    if (wv !== av) {
      mismatches.push({
        role: w.role, key: w.key, pairing,
        text: (w.text || a.text || '').slice(0, 40),
        prop: p, wp: wv, astro: av,
      });
    }
  }
}

// Line-count report for headings.
const wrapReport = [];
for (const { wp: w, astro: a } of paired) {
  if (w.lineCount && a.lineCount && w.lineCount !== a.lineCount) {
    wrapReport.push({ role: w.role, text: w.text.slice(0, 60), wpLines: w.lineCount, astroLines: a.lineCount });
  }
}

const summary = {
  viewport: vw,
  wpUrl, astroUrl,
  wpRows: wpRows.length, astroRows: astroRows.length,
  paired: paired.length,
  mismatches: mismatches.length,
  wrapMismatches: wrapReport.length,
};

if (asJson) {
  console.log(JSON.stringify({ summary, mismatches, wrapReport }, null, 2));
} else {
  console.log(['role', 'text', 'prop', 'wp', 'astro'].join('\t'));
  for (const m of mismatches) {
    console.log([m.role, m.text || '—', m.prop, m.wp, m.astro].join('\t'));
  }
  if (wrapReport.length) {
    console.error(`\n[wrap] ${wrapReport.length} headings wrap differently:`);
    for (const w of wrapReport) console.error(`  ${w.role} "${w.text}": wp=${w.wpLines} astro=${w.astroLines}`);
  }
  console.error(`\n[style-diff] vw=${vw} paired=${paired.length} mismatches=${mismatches.length} wrap-diffs=${wrapReport.length}`);
}
