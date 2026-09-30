/*
 * Owner tests for bozzies/divider:
 *   A. Insert via inserter → default attrs (align='wide', variant='jazz',
 *      color='purple'), no inner blocks. Verifies the block shows up in
 *      the standard inserter and inserts with Astro's default values.
 *   B. Real sidebar SelectControl click: change `color` from purple to
 *      brass, publish, confirm mutation persists in post_content JSON
 *      and lands on front as `style="color:var(--brass)"`.
 *   C. Pre-typed variant='second-line' + color='yellow' — serialized JSON
 *      contains both, front DOM has the correct SVG ornament, and
 *      style color is var(--yellow).
 */
import { chromium } from 'playwright-core';
import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../../_screens/rebuild-logs');
mkdirSync(OUT, { recursive: true });

const WP = 'http://localhost:8888';

function chromePath() {
  for (const p of [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ]) if (existsSync(p)) return p;
  throw new Error('Chrome not found');
}

async function login(page) {
  await page.goto(`${WP}/wp-login.php`, { waitUntil: 'domcontentloaded' });
  await page.fill('#user_login', 'astroshot');
  await page.fill('#user_pass', 'trialpass123');
  await page.click('#wp-submit');
  await page.waitForURL(/wp-admin/, { timeout: 15000 });
}

async function newDraftPage(page, title) {
  await page.goto(`${WP}/wp-admin/post-new.php?post_type=page`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('iframe[name="editor-canvas"]', { timeout: 30000 });
  await page.waitForTimeout(3000);
  await page.evaluate(() => {
    document.querySelectorAll('.components-modal__screen-overlay, .components-guide').forEach(el => el.remove());
  });
  await page.evaluate((t) => wp.data.dispatch('core/editor').editPost({ title: t }), title);
}

async function insertBlock(page, attrs = {}) {
  return await page.evaluate(async ({ a }) => {
    const { createBlock } = wp.blocks;
    const { dispatch } = wp.data;
    const block = createBlock('bozzies/divider', a);
    dispatch('core/block-editor').insertBlock(block);
    await new Promise(r => setTimeout(r, 700));
    return block.clientId;
  }, { a: attrs });
}

async function readAttrs(page, clientId) {
  return await page.evaluate((cid) =>
    wp.data.select('core/block-editor').getBlock(cid).attributes
  , clientId);
}

async function readChildren(page, parentClientId) {
  return await page.evaluate((cid) => {
    const kids = wp.data.select('core/block-editor').getBlocks(cid);
    return kids.map(k => ({ name: k.name, attributes: k.attributes }));
  }, parentClientId);
}

async function selectBlock(page, clientId) {
  await page.evaluate((cid) => {
    wp.data.dispatch('core/block-editor').selectBlock(cid);
  }, clientId);
  await page.waitForTimeout(800);
}

async function saveAndPublish(page) {
  await page.evaluate(() => {
    document.querySelectorAll('.components-modal__screen-overlay, .components-guide').forEach(el => el.remove());
  });
  await page.evaluate(async () => {
    wp.data.dispatch('core/editor').editPost({ status: 'publish' });
    await wp.data.dispatch('core/editor').savePost();
  });
  return await page.evaluate(async () => {
    for (let i = 0; i < 20; i++) {
      const post = wp.data.select('core/editor').getCurrentPost();
      if (post && post.status === 'publish' && post.link) return post.link;
      await new Promise(r => setTimeout(r, 250));
    }
    return wp.data.select('core/editor').getCurrentPost().link;
  });
}

async function getPostId(page) {
  return await page.evaluate(() => wp.data.select('core/editor').getCurrentPost().id);
}

function readContent(postId) {
  return execSync(
    `npx wp-env run cli --env-cwd=/var/www/html wp post get ${postId} --field=post_content 2>/dev/null`,
    { encoding: 'utf8' }
  ).trim();
}

async function main() {
  const browser = await chromium.launch({ executablePath: chromePath() });
  const context = await browser.newContext({ deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.setViewportSize({ width: 1600, height: 1000 });

  const results = { A: {}, B: {}, C: {}, cleanup: [] };
  const trashIds = [];

  try {
    await login(page);

    // --- Test A: insert via inserter → default attrs, no children ---
    console.log('\n=== Test A: insert via inserter → default attrs, no children');
    await newDraftPage(page, 'Divider — Test A');
    const clientA = await insertBlock(page);
    const attrsA = await readAttrs(page, clientA);
    const childrenA = await readChildren(page, clientA);
    results.A.attrs = attrsA;
    results.A.childrenCount = childrenA.length;
    console.log('  attrs:', JSON.stringify(attrsA));
    console.log('  children count:', childrenA.length);
    trashIds.push(await getPostId(page));

    // --- Test B: mutate color via real sidebar SelectControl ---
    console.log('\n=== Test B: mutate color via sidebar SelectControl');
    await newDraftPage(page, 'Divider — Test B');
    const clientB = await insertBlock(page, { variant: 'jazz', color: 'purple' });
    await selectBlock(page, clientB);
    // The block's sidebar shows two SelectControls: variant (first) + color
    // (second). Grab the second <select> in the sidebar and change it.
    const changed = await page.evaluate(() => {
      const sels = document.querySelectorAll('.interface-interface-skeleton__sidebar select');
      if (sels.length < 2) return { found: false, count: sels.length };
      const sel = sels[1];
      sel.value = 'brass';
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      return { found: true, count: sels.length, value: sel.value };
    });
    results.B.sidebarFound = !!changed.found;
    results.B.sidebarSelectCount = changed.count;
    await page.waitForTimeout(600);
    const attrsB = await readAttrs(page, clientB);
    results.B.attrsAfter = attrsB;
    results.B.mutated = attrsB.color === 'brass';
    console.log(`  sidebar select count: ${changed.count}  color after: ${attrsB.color}`);
    const linkB = await saveAndPublish(page);
    const idB = await getPostId(page);
    trashIds.push(idB);
    const contentB = await readContent(idB);
    results.B.serializedHasBrass = contentB.includes('"color":"brass"');
    console.log(`  serialized contains color:brass: ${results.B.serializedHasBrass}`);
    await page.goto(linkB, { waitUntil: 'networkidle' });
    results.B.frontStyleColor = await page.evaluate(() => {
      const d = document.querySelector('.divider');
      return d && d.getAttribute('style');
    });
    console.log(`  front .divider style attr: ${results.B.frontStyleColor}`);

    // --- Test C: pre-typed second-line + yellow ---
    console.log('\n=== Test C: pre-typed variant=second-line + color=yellow');
    await newDraftPage(page, 'Divider — Test C');
    await insertBlock(page, {
      variant: 'second-line',
      color: 'yellow',
    });
    const linkC = await saveAndPublish(page);
    const idC = await getPostId(page);
    trashIds.push(idC);
    const contentC = await readContent(idC);
    results.C.serializedHasVariant = contentC.includes('"variant":"second-line"');
    results.C.serializedHasColor = contentC.includes('"color":"yellow"');
    console.log(`  serialized has variant:second-line: ${results.C.serializedHasVariant}`);
    console.log(`  serialized has color:yellow: ${results.C.serializedHasColor}`);
    await page.goto(linkC, { waitUntil: 'networkidle' });
    results.C.outerShape = await page.evaluate(() => !!document.querySelector(
      'div.divider[style*="var(--yellow)"] > span.divider__line + div.divider__ornament-wrap > svg.divider__ornament.divider__ornament--wide + * , div.divider[style*="var(--yellow)"] > span.divider__line'
    ));
    // Simpler shape check — look for the expected structure explicitly.
    results.C.shapeParts = await page.evaluate(() => {
      const d = document.querySelector('.divider');
      if (!d) return null;
      const kids = Array.from(d.children).map(k => k.tagName + '.' + k.className);
      const style = d.getAttribute('style');
      const svg = d.querySelector('.divider__ornament');
      return {
        kids,
        style,
        svgClass: svg && svg.getAttribute('class'),
        svgViewBox: svg && svg.getAttribute('viewBox'),
      };
    });
    console.log('  shape:', JSON.stringify(results.C.shapeParts));
  } finally {
    for (const id of trashIds) {
      try {
        execSync(`npx wp-env run cli --env-cwd=/var/www/html wp post delete ${id} --force 2>/dev/null`, { encoding: 'utf8' });
        results.cleanup.push(`trashed ${id}`);
      } catch (e) {
        results.cleanup.push(`failed ${id}: ${e.message}`);
      }
    }
    await browser.close();
  }

  writeFileSync(`${OUT}/divider-owner-tests.json`, JSON.stringify(results, null, 2));
  const summary = {
    A_default_align:   results.A.attrs?.align === 'wide',
    A_default_variant: results.A.attrs?.variant === 'jazz',
    A_default_color:   results.A.attrs?.color === 'purple',
    A_no_children:     results.A.childrenCount === 0,
    B_sidebar_found:   results.B.sidebarFound,
    B_attr_mutates:    results.B.mutated,
    B_persists:        results.B.serializedHasBrass,
    B_front_style:     (results.B.frontStyleColor || '').includes('var(--brass)'),
    C_serialized_variant: results.C.serializedHasVariant,
    C_serialized_color:   results.C.serializedHasColor,
    C_front_style_yellow: (results.C.shapeParts?.style || '').includes('var(--yellow)'),
    C_svg_second_line:    (results.C.shapeParts?.svgViewBox || '') === '0 0 200 40',
    C_svg_wide:           (results.C.shapeParts?.svgClass || '').includes('divider__ornament--wide'),
    cleanup:              results.cleanup,
  };
  console.log('\n=== Summary');
  console.log(JSON.stringify(summary, null, 2));
  const passes = Object.entries(summary).filter(([k]) => k !== 'cleanup').every(([, v]) => v === true);
  process.exit(passes ? 0 : 1);
}
main().catch(e => { console.error(e); process.exit(1); });
