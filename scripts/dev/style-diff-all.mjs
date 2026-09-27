#!/usr/bin/env node
// Run style-diff.mjs for every page, at 1440 and 390. Emit a compact summary
// table (page, vw, paired, mismatches, wrap-diffs). Saves detail JSON per page
// under _screens/style-diff/<label>-<vw>.json.
import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const outDir = fileURLToPath(new URL('../../_screens/style-diff/', import.meta.url));
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const WP = 'http://localhost:8888';
const ASTRO = 'https://boswell-poc.vercel.app';

// label | wpPath | astroPath (astroPath = wpPath when omitted)
const PAGES = [
  ['home',                '/',                                    '/'],
  ['sisters',             '/sisters/',                            '/sisters/'],
  ['connee',              '/sisters/connee/',                     '/sisters/connee/'],
  ['martha',              '/sisters/martha/',                     '/sisters/martha/'],
  ['vet',                 '/sisters/vet/',                        '/sisters/vet/'],
  ['bio-resources',       '/sisters/bio-resources/',              '/sisters/bio-resources/'],
  ['career-timeline',     '/sisters/career-timeline/',            '/sisters/career-timeline/'],
  ['about',               '/about/',                              '/about/'],
  ['media',               '/media/',                              '/media/'],
  ['charts',              '/media/charts/',                       '/media/charts/'],
  ['reviews',             '/media/reviews/',                      '/media/reviews/'],
  ['discography',         '/media/discography/',                  '/media/discography/'],
  ['lessons',             '/media/lessons/',                      '/media/'],
  ['lesson-1',            '/media/lessons/lesson-1/',             '/media/lessons/1/'],
  ['press',               '/press/',                              '/press/'],
  ['press-vintage',       '/press/vintage/',                      '/press/vintage/'],
  ['press-feature',       '/press/feature/',                      '/press/feature/'],
  ['press-video',         '/press/video/',                        '/press/video/'],
  ['press-essay',         '/press/essay/',                        '/press/essay/'],
  ['press-itow',          '/press/in-their-own-words/',           '/press/in-their-own-words/'],
  ['art-vintage',         '/press/vintage/02-cats-hepped/',       '/press/vintage/02-cats-hepped/'],
  ['art-andrews',         '/press/feature/andrews-sisters/',      '/press/feature/andrews-sisters/'],
  ['art-video',           '/press/video/alexanders-ragtime-band/','/press/video/alexanders-ragtime-band/'],
];

const rows = [];
for (const [label, wp, astro] of PAGES) {
  for (const vw of [1440, 390]) {
    const cmd = `node scripts/dev/style-diff.mjs "${WP}${wp}" "${ASTRO}${astro}" --vw=${vw} --json`;
    let json;
    try {
      const out = execSync(cmd, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
      json = JSON.parse(out);
    } catch (e) {
      console.error(`FAIL ${label} @ ${vw}: ${e.message.slice(0, 80)}`);
      rows.push({ label, vw, paired: 0, mismatches: -1, wrap: 0, error: true });
      continue;
    }
    writeFileSync(`${outDir}${label}-${vw}.json`, JSON.stringify(json, null, 2));
    const s = json.summary;
    rows.push({ label, vw, paired: s.paired, mismatches: s.mismatches, wrap: s.wrapMismatches });
    console.error(`  ${label.padEnd(20)} vw=${vw}  paired=${s.paired.toString().padStart(3)}  mism=${s.mismatches.toString().padStart(4)}  wrap=${s.wrapMismatches}`);
  }
}

console.log('\npage\tvw\tpaired\tmismatches\twrap');
for (const r of rows) console.log([r.label, r.vw, r.paired, r.mismatches, r.wrap].join('\t'));
writeFileSync(`${outDir}summary.json`, JSON.stringify(rows, null, 2));
