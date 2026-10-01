#!/usr/bin/env node
// Text diff scoped to the .page-hero region only.
// Usage: node scripts/dev/page-hero-text-diff.mjs <urlA> <urlB> [<vw>]
import { chromium } from 'playwright-core';

const A = process.argv[2];
const B = process.argv[3];
const width = Number(process.argv[4] || 1440);
if (!A || !B) { console.error('usage: page-hero-text-diff.mjs <urlA> <urlB> [<vw>]'); process.exit(2); }

async function extract(url) {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 });
  const text = await page.evaluate(() => {
    const root = document.querySelector('.page-hero');
    if (!root) return [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => {
        if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        const el = n.parentElement;
        if (!el) return NodeFilter.FILTER_REJECT;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') return NodeFilter.FILTER_REJECT;
        if (el.closest('[aria-hidden="true"]')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    const out = []; let n;
    while ((n = walker.nextNode())) { const t = n.nodeValue.replace(/\s+/g, ' ').trim(); if (t) out.push(t); }
    return out;
  });
  await browser.close();
  return text;
}

const a = await extract(A); const b = await extract(B);
console.log(`--- ${A} (${a.length} strings)`);
console.log(`+++ ${B} (${b.length} strings)`);
const setA = new Map(); for (const s of a) setA.set(s, (setA.get(s) || 0) + 1);
const setB = new Map(); for (const s of b) setB.set(s, (setB.get(s) || 0) + 1);
const onlyA = []; for (const [s, c] of setA) { const bC = setB.get(s) || 0; for (let i=0;i<c-bC;i++) onlyA.push(s); }
const onlyB = []; for (const [s, c] of setB) { const aC = setA.get(s) || 0; for (let i=0;i<c-aC;i++) onlyB.push(s); }
console.log(`# Only in A: ${onlyA.length}`); for (const s of onlyA) console.log(`  - ${JSON.stringify(s)}`);
console.log(`# Only in B: ${onlyB.length}`); for (const s of onlyB) console.log(`  + ${JSON.stringify(s)}`);
