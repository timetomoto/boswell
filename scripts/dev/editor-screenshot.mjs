/*
 * Screenshot the block editor with a hero-carrying page open, to prove the
 * ported Astro hero CSS also renders inside the editor iframe.
 */
import { chromium } from 'playwright-core';
import { mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../../_screens/astro-css-trial');
mkdirSync(OUT, { recursive: true });

function chromePath() {
  for (const p of [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ]) if (existsSync(p)) return p;
  throw new Error('Chrome not found');
}

async function loginAndCapture() {
  const browser = await chromium.launch({ executablePath: chromePath() });
  const page = await browser.newContext({ deviceScaleFactor: 1 }).then(c => c.newPage());
  await page.setViewportSize({ width: 1600, height: 1000 });

  // Log in as keith via the WP login form. wp-env's default admin password is
  // "password" — the account rules say never wipe wp-env (which would delete
  // keith), so this creds combo is stable across restarts.
  await page.goto('http://localhost:8888/wp-login.php', { waitUntil: 'networkidle' });
  await page.fill('#user_login', 'astroshot');
  await page.fill('#user_pass', 'trialpass123');
  await page.click('#wp-submit');
  await page.waitForURL(/wp-admin/, { timeout: 15000 });

  // Sisters page id is 7 (per CLAUDE.md).
  await page.goto('http://localhost:8888/wp-admin/post.php?post=7&action=edit', { waitUntil: 'domcontentloaded', timeout: 60000 });
  // Wait for the editor iframe and the hero to render.
  await page.waitForSelector('iframe[name="editor-canvas"]', { timeout: 30000 });
  await page.waitForTimeout(6000);
  // Dismiss the "Welcome to the editor" modal if it appears.
  await page.evaluate(() => {
    document.querySelectorAll('.components-modal__screen-overlay, .components-guide').forEach(el => el.remove());
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/editor-sisters.png`, fullPage: false });
  console.log(`saved ${OUT}/editor-sisters.png`);
  await browser.close();
}

loginAndCapture().catch(e => { console.error(e); process.exit(1); });
