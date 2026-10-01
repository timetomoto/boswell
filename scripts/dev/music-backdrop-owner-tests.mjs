/*
 * Owner tests for bozzies/section music-backdrop enum extension:
 *   A. Insert via inserter → default backdrop='none', no .music-backdrop child.
 *   B. Mutate `backdrop` via sidebar SelectControl (Inspector → Backdrop pattern
 *      panel), publish, confirm the mutation persists in post_content JSON and
 *      the front section renders `.music-backdrop svg pattern#staves`.
 *   C. Insert with pre-typed backdrop='vinyl' + a core/heading child →
 *      confirm serialized JSON contains "backdrop":"vinyl", and the rendered
 *      front DOM has `section.wp-block-bozzies-section > div.music-backdrop >
 *      svg > defs > pattern#vinyl`.
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

async function insertBlock(page, attrs = {}, innerAttrs = null) {
  return await page.evaluate(async ({ a, inner }) => {
    const { createBlock } = wp.blocks;
    const { dispatch } = wp.data;
    let children = [];
    if (inner) {
      children = [ createBlock(inner.name, inner.attrs || {}) ];
    }
    const block = createBlock('bozzies/section', a, children);
    dispatch('core/block-editor').insertBlock(block);
    await new Promise(r => setTimeout(r, 700));
    return block.clientId;
  }, { a: attrs, inner: innerAttrs });
}

async function readAttrs(page, clientId) {
  return await page.evaluate((cid) =>
    wp.data.select('core/block-editor').getBlock(cid).attributes
  , clientId);
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

    // --- Test A ---
    console.log('\n=== Test A: insert via inserter → default backdrop=none, no .music-backdrop child');
    await newDraftPage(page, 'Music backdrop — Test A');
    const clientA = await insertBlock(page);
    const attrsA = await readAttrs(page, clientA);
    results.A.attrs_backdrop = attrsA.backdrop;
    results.A.attrs_backdropColor = attrsA.backdropColor;
    console.log('  attrs.backdrop:', attrsA.backdrop);
    console.log('  attrs.backdropColor:', JSON.stringify(attrsA.backdropColor));
    // Confirm editor iframe does NOT show a .music-backdrop child inside our block
    results.A.editorHasBackdrop = await page.evaluate((cid) => {
      const frame = document.querySelector('iframe[name="editor-canvas"]');
      if (!frame) return null;
      const doc = frame.contentDocument;
      const sel = doc.querySelector(`[data-block="${cid}"] .music-backdrop`);
      return !!sel;
    }, clientA);
    console.log('  editor has .music-backdrop:', results.A.editorHasBackdrop);
    trashIds.push(await getPostId(page));

    // --- Test B: real sidebar SelectControl click ---
    console.log('\n=== Test B: mutate backdrop via sidebar SelectControl → staves');
    await newDraftPage(page, 'Music backdrop — Test B');
    const clientB = await insertBlock(page, {}, {
      name: 'core/heading',
      attrs: { level: 2, content: 'PRESERVE ME' },
    });
    await selectBlock(page, clientB);
    // Ensure the block inspector (right sidebar) is open.
    await page.evaluate(async () => {
      const dispatch = wp.data.dispatch;
      if (dispatch('core/edit-post') && dispatch('core/edit-post').openGeneralSidebar) {
        dispatch('core/edit-post').openGeneralSidebar('edit-post/block');
      } else if (dispatch('core/editor') && dispatch('core/editor').openGeneralSidebar) {
        dispatch('core/editor').openGeneralSidebar('edit-post/block');
      }
      await new Promise(r => setTimeout(r, 800));
    });
    // Open the "Backdrop pattern" panel and set the first SelectControl to 'staves'.
    const changed = await page.evaluate(async () => {
      // Try multiple sidebar selectors in case the class name varies by WP version.
      const roots = [
        '.interface-interface-skeleton__sidebar',
        '.editor-sidebar',
        '.block-editor-block-inspector',
      ];
      let sidebar = null;
      for (const s of roots) { sidebar = document.querySelector(s); if (sidebar) break; }
      if (!sidebar) return { found: false, reason: 'no sidebar' };
      const panels = Array.from(sidebar.querySelectorAll('.components-panel__body'));
      const bd = panels.find(p => /Backdrop pattern/i.test(p.textContent));
      if (!bd) return { found: false, reason: 'no panel', panels: panels.map(p => p.textContent.slice(0, 40)) };
      const btn = bd.querySelector('button.components-panel__body-toggle');
      if (btn && !bd.classList.contains('is-opened')) btn.click();
      await new Promise(r => setTimeout(r, 400));
      const sels = bd.querySelectorAll('select');
      if (!sels.length) return { found: false, reason: 'no selects', opened: bd.classList.contains('is-opened') };
      const sel = sels[0];
      sel.focus();
      sel.value = 'staves';
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      return { found: true, selCount: sels.length, value: sel.value };
    });
    results.B.sidebarFound = !!changed.found;
    results.B.selCount = changed.selCount;
    await page.waitForTimeout(600);
    const attrsB = await readAttrs(page, clientB);
    results.B.attrs_backdrop = attrsB.backdrop;
    results.B.mutated = attrsB.backdrop === 'staves';
    console.log(`  sidebar found: ${changed.found}  selCount: ${changed.selCount}  backdrop after: ${attrsB.backdrop}`);
    const linkB = await saveAndPublish(page);
    const idB = await getPostId(page);
    trashIds.push(idB);
    const contentB = await readContent(idB);
    results.B.serializedHasStaves = contentB.includes('"backdrop":"staves"');
    results.B.contentPreservesHeading = contentB.includes('PRESERVE ME');
    console.log(`  serialized backdrop:staves: ${results.B.serializedHasStaves}`);
    console.log(`  heading preserved:          ${results.B.contentPreservesHeading}`);
    // Use page-landing template so the block's post_content is what renders.
    await page.goto(linkB, { waitUntil: 'networkidle' });
    results.B.frontHasBackdropStaves = await page.evaluate(() => {
      // Look inside the section that carries our block wrapper.
      const s = document.querySelector('section.wp-block-bozzies-section');
      if (!s) return { hasSection: false };
      const mb = s.querySelector('.music-backdrop svg pattern#staves');
      const heading = s.querySelector('h2');
      return {
        hasSection: true,
        hasBackdrop: !!mb,
        headingText: heading && heading.textContent.trim(),
      };
    });
    console.log(`  front:`, JSON.stringify(results.B.frontHasBackdropStaves));

    // --- Test C: pre-typed content with backdrop=vinyl ---
    console.log('\n=== Test C: pre-typed backdrop=vinyl + heading child');
    await newDraftPage(page, 'Music backdrop — Test C');
    await insertBlock(page, { backdrop: 'vinyl' }, {
      name: 'core/heading',
      attrs: { level: 2, content: 'TEST C content' },
    });
    const linkC = await saveAndPublish(page);
    const idC = await getPostId(page);
    trashIds.push(idC);
    const contentC = await readContent(idC);
    results.C.serializedHasVinyl = contentC.includes('"backdrop":"vinyl"');
    results.C.serializedHasHeading = contentC.includes('TEST C content');
    console.log(`  serialized backdrop:vinyl: ${results.C.serializedHasVinyl}`);
    console.log(`  serialized heading:        ${results.C.serializedHasHeading}`);
    await page.goto(linkC, { waitUntil: 'networkidle' });
    results.C.frontShape = await page.evaluate(() => {
      const s = document.querySelector('section.wp-block-bozzies-section');
      if (!s) return { hasSection: false };
      // Two direct children: .music-backdrop, then .wp-block-bozzies-section__inner
      const kids = Array.from(s.children).map(c => c.className);
      const mb = s.querySelector('.music-backdrop svg pattern#vinyl');
      const heading = s.querySelector('h2');
      return {
        hasSection: true,
        childClasses: kids,
        hasVinylPattern: !!mb,
        headingText: heading && heading.textContent.trim(),
      };
    });
    console.log(`  front shape:`, JSON.stringify(results.C.frontShape));
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

  writeFileSync(`${OUT}/music-backdrop-owner-tests.json`, JSON.stringify(results, null, 2));
  const summary = {
    A_default_backdrop_none:  results.A.attrs_backdrop === 'none',
    A_default_color_empty:    results.A.attrs_backdropColor === '',
    A_editor_no_backdrop:     results.A.editorHasBackdrop === false,
    B_sidebar_found:          results.B.sidebarFound,
    B_attr_mutates:           results.B.mutated,
    B_persists:               results.B.serializedHasStaves,
    B_heading_preserved:      results.B.contentPreservesHeading,
    B_front_backdrop_staves:  results.B.frontHasBackdropStaves?.hasBackdrop === true,
    B_front_heading:          results.B.frontHasBackdropStaves?.headingText === 'PRESERVE ME',
    C_serialized_vinyl:       results.C.serializedHasVinyl,
    C_serialized_heading:     results.C.serializedHasHeading,
    C_front_has_section:      results.C.frontShape?.hasSection === true,
    C_front_vinyl:            results.C.frontShape?.hasVinylPattern === true,
    C_front_heading_text:     results.C.frontShape?.headingText === 'TEST C content',
    cleanup:                  results.cleanup,
  };
  console.log('\n=== Summary');
  console.log(JSON.stringify(summary, null, 2));
  const passes = Object.entries(summary).filter(([k]) => k !== 'cleanup').every(([, v]) => v === true);
  process.exit(passes ? 0 : 1);
}
main().catch(e => { console.error(e); process.exit(1); });
