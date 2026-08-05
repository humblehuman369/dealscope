/**
 * Captures desktop screenshots from the live site (dealgapiq.com) for the
 * 60-second demo video. Reuses the demo-account login flow from
 * scripts/screenshots/capture.ts.
 *
 * Usage (from repo root):
 *   node tools/demo-video/capture.mjs
 *   node tools/demo-video/capture.mjs --base-url http://localhost:3000
 */

import { chromium } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const getArg = (name) => {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? args[idx + 1] : undefined;
};

const BASE_URL = getArg('base-url') ?? 'https://dealgapiq.com';
const DEMO_EMAIL = getArg('email') ?? 'review@dealgapiq.com';
const DEMO_PASSWORD = getArg('password') ?? 'Review$1234';
const DEMO_ADDRESS = getArg('address') ?? '4407 Deer Creek Blvd, Austin, TX 78757';

const OUT_DIR = path.resolve(__dirname, 'shots');

async function hideChrome(page) {
  await page.addStyleTag({
    content: `
      [class*="cookie-banner"], [class*="CookieBanner"],
      [class*="cookie-consent"], [class*="CookieConsent"],
      [id*="cookie-banner"], [id*="cookie-consent"],
      [class*="consent-banner"] {
        display: none !important;
      }
      *, *::before, *::after { animation-play-state: paused !important; }
    `,
  });
  await page.evaluate(() => {
    document.querySelectorAll('div, section, aside').forEach((el) => {
      const text = el.textContent || '';
      if (text.includes('We use essential cookies') || (text.includes('cookie') && el.querySelector('button'))) {
        const rect = el.getBoundingClientRect();
        if (rect.width > window.innerWidth * 0.8 && rect.bottom > window.innerHeight * 0.7) {
          el.style.display = 'none';
        }
      }
    });
  });
}

async function settle(page, extra = 1500) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(extra);
}

async function shot(page, name) {
  const filepath = path.join(OUT_DIR, name);
  await page.screenshot({ path: filepath, fullPage: false, type: 'png' });
  const kb = (fs.statSync(filepath).size / 1024).toFixed(0);
  console.log(`  saved ${name} (${kb} KB)`);
}

async function login(page) {
  console.log('logging in with demo account...');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await settle(page);

  const email = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
  const password = page.locator('input[type="password"], input[name="password"]').first();
  if (!(await email.isVisible({ timeout: 5000 }).catch(() => false))) return false;

  await email.fill(DEMO_EMAIL);
  await password.fill(DEMO_PASSWORD);
  await page.locator('button:has-text("Sign In"), button:has-text("Log In"), button[type="submit"]').first().click();

  try {
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
    console.log('  logged in');
    return true;
  } catch {
    return !page.url().includes('/login');
  }
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
    deviceScaleFactor: 2,
    colorScheme: 'dark',
  });
  const page = await context.newPage();

  console.log(`capturing from ${BASE_URL}`);

  // 1. Homepage hero
  console.log('[1/5] homepage');
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await settle(page, 2500);
  await hideChrome(page);
  await shot(page, 'home.png');

  // 2. Search screen
  console.log('[2/5] search');
  await page.goto(`${BASE_URL}/search`, { waitUntil: 'domcontentloaded' });
  await settle(page, 2000);
  await hideChrome(page);
  const input = page
    .locator('input[placeholder*="address" i], input[placeholder*="search" i], input[type="search"]')
    .first();
  if (await input.isVisible({ timeout: 3000 }).catch(() => false)) {
    await input.click();
    await input.pressSequentially(DEMO_ADDRESS, { delay: 20 });
    await page.waitForTimeout(1500);
  }
  await shot(page, 'search.png');

  // 3 + 4 need auth
  const isLoggedIn = await login(page);
  if (!isLoggedIn) console.log('  WARN login failed; verdict/strategy may show gated state');

  // 3. Verdict (discovery)
  console.log('[3/5] verdict');
  await page.goto(`${BASE_URL}/discovery?address=${encodeURIComponent(DEMO_ADDRESS)}`, {
    waitUntil: 'domcontentloaded',
  });
  console.log('  waiting for analysis...');
  await page.waitForSelector('text=Deal Gap', { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(3000);
  await hideChrome(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(800);
  await shot(page, 'verdict.png');

  // 4. Strategy
  console.log('[4/5] strategy');
  await page.goto(`${BASE_URL}/strategy?address=${encodeURIComponent(DEMO_ADDRESS)}`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForSelector('text=Deal Gap', { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(3000);
  await hideChrome(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(800);
  await shot(page, 'strategy.png');

  // 5. Cash buyer directory (public)
  console.log('[5/5] directory');
  await page.goto(`${BASE_URL}/directory`, { waitUntil: 'domcontentloaded' });
  await settle(page, 2500);
  await hideChrome(page);
  await shot(page, 'directory.png');

  await browser.close();
  console.log(`done → ${OUT_DIR}`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
