// scripts/import/crawl.mjs — BFS crawl of local WP for 404s / 500s.
import { execSync } from 'node:child_process';

const START = process.argv[2] || 'http://localhost:8888/';
const MAX = Number(process.argv[3] || 300);

const origin = new URL(START).origin;
const seen = new Set();
const queue = [START];
const bad = [];

function fetchHtml(u) {
  try { return execSync(`curl -sS "${u}"`, { encoding: 'utf8', maxBuffer: 32*1024*1024 }); }
  catch { return ''; }
}
function status(u) {
  try { return execSync(`curl -sS -o /dev/null -w "%{http_code}" "${u}"`, { encoding: 'utf8' }).trim(); }
  catch { return '000'; }
}

let n = 0;
while (queue.length && seen.size < MAX) {
  const u = queue.shift();
  const p = new URL(u).pathname;
  if (seen.has(p)) continue;
  seen.add(p);
  const code = status(u);
  n++;
  if (code !== '200') { bad.push({ path: p, code }); continue; }
  const html = fetchHtml(u);
  const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map(m => m[1]);
  for (const h of hrefs) {
    try {
      const uu = new URL(h, u);
      if (uu.origin !== origin) continue;
      if (uu.pathname.includes('/wp-admin/') || uu.pathname.includes('/wp-json/') || uu.pathname.includes('/feed/') || uu.pathname.includes('?')) continue;
      if (uu.pathname.match(/\.(jpg|png|gif|css|js|mp3|pdf|svg|xml|ico)$/i)) continue;
      if (!seen.has(uu.pathname)) queue.push(uu.href);
    } catch {}
  }
}
console.log(`checked ${n} pages, ${bad.length} not 200`);
if (bad.length) for (const b of bad.slice(0, 30)) console.log(`  ${b.code} ${b.path}`);
