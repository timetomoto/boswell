// scripts/import/alt-audit.mjs
// Fetch every image on every imported page and compare its alt text to the
// same image on the equivalent Astro page. Prints a summary and any
// mismatches. Excludes site-chrome logos/decoration.

import { execSync } from 'node:child_process';

const WP_HOST = 'http://localhost:8888';
const ASTRO_HOST = 'https://boswell-poc.vercel.app';

// Article discovery: pull every /press/{category}/{slug}/ URL out of the
// press hub and the category archives; combine with the static page list.
function discoverArticles() {
  const hub = execSync(`curl -sS "${WP_HOST}/press/"`, { encoding: 'utf8', maxBuffer: 32*1024*1024 });
  const found = new Set();
  for (const m of hub.matchAll(/href="[^"]*(\/press\/[^"\/]+\/[^"\/]+\/)"/g)) {
    if (!m[1].endsWith('/press/')) found.add(m[1]);
  }
  return [...found].sort();
}
const STATIC_PAGES = [
  '/', '/about/', '/sisters/',
  '/sisters/connee/', '/sisters/martha/', '/sisters/vet/',
  '/sisters/bio-resources/', '/sisters/career-timeline/',
  '/media/', '/media/charts/', '/media/reviews/', '/media/discography/',
  ['/media/lessons/lesson-1/', '/media/lessons/1/'],
  ['/media/lessons/lesson-2/', '/media/lessons/2/'],
  ['/media/lessons/lesson-3/', '/media/lessons/3/'],
  ['/media/lessons/lesson-4/', '/media/lessons/4/'],
  ['/media/lessons/lesson-5/', '/media/lessons/5/'],
  '/press/', '/press/vintage/', '/press/feature/', '/press/video/', '/press/essay/', '/press/in-their-own-words/',
];
const PAGES = [...STATIC_PAGES, ...discoverArticles()];

function fetch(url) {
  try { return execSync(`curl -sS "${url}"`, { encoding: 'utf8', maxBuffer: 32*1024*1024 }); }
  catch { return ''; }
}

// Extract [{ basename, alt }] from an HTML page. Skips 0×0 pixel-tracker
// images and inline-SVG. Matches images by their filename basename so the
// URL prefix differences (localhost:8888/wp-content/uploads vs /uploads/)
// don't matter.
function imgs(html) {
  const list = [];
  const re = /<img\b[^>]*>/g;
  let m;
  while ((m = re.exec(html))) {
    const tag = m[0];
    const src = (tag.match(/\bsrc="([^"]+)"/) || [])[1] || '';
    const alt = (tag.match(/\balt="([^"]*)"/) || [])[1] ?? null;
    const width = parseInt((tag.match(/\bwidth="(\d+)"/) || [])[1], 10);
    if (!src) continue;
    if (/^data:image\/gif;base64,/.test(src) && width === 1) continue;
    const basename = decodeURIComponent(src.split('/').pop().split('?')[0].split('#')[0])
      // Strip WP's -NNNxNNN size suffix so wide.jpg and wide-150x150.jpg map together.
      .replace(/-\d+x\d+(?=\.[^.]+$)/, '');
    list.push({ basename, alt });
  }
  return list;
}

// Only compare images inside the <main> content area, not the site chrome
// header/footer logos.
function mainOnly(html) {
  const start = html.search(/<main\b/i);
  if (start === -1) return html;
  const end = html.indexOf('</main>', start);
  return end === -1 ? html.slice(start) : html.slice(start, end + 7);
}

const stats = { checked: 0, matched: 0, mismatched: 0, wpOnly: 0, astroOnly: 0 };
const details = [];

for (const entry of PAGES) {
  const [wpPath, astroPath] = Array.isArray(entry) ? entry : [entry, entry];
  const wp = imgs(mainOnly(fetch(`${WP_HOST}${wpPath}`)));
  const astro = imgs(mainOnly(fetch(`${ASTRO_HOST}${astroPath}`)));

  const astroByName = new Map(astro.map(i => [i.basename, i.alt]));
  const wpByName    = new Map(wp.map(i => [i.basename, i.alt]));

  const allNames = new Set([...astroByName.keys(), ...wpByName.keys()]);
  for (const name of allNames) {
    if (astroByName.has(name) && wpByName.has(name)) {
      const a = (astroByName.get(name) || '').trim();
      const w = (wpByName.get(name) || '').trim();
      stats.checked++;
      if (a === w) stats.matched++;
      else { stats.mismatched++; details.push({ page: wpPath, file: name, astro: a, wp: w, kind: 'diff' }); }
    } else if (astroByName.has(name)) {
      stats.astroOnly++;
      details.push({ page: wpPath, file: name, kind: 'astro-only', alt: astroByName.get(name) });
    } else {
      stats.wpOnly++;
      details.push({ page: wpPath, file: name, kind: 'wp-only', alt: wpByName.get(name) });
    }
  }
}

console.log('Alt-text audit:');
console.log(`  images shared with Astro (checked): ${stats.checked}`);
console.log(`  matching alt: ${stats.matched}`);
console.log(`  mismatched alt: ${stats.mismatched}`);
console.log(`  wp-only images: ${stats.wpOnly}`);
console.log(`  astro-only images: ${stats.astroOnly}`);
if (details.length) {
  console.log('\nDetails:');
  for (const d of details.slice(0, 60)) console.log(' ', JSON.stringify(d));
}
