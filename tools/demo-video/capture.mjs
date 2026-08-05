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
    `,
  });
  await page.evaluate(() => {
    document.querySelectorAll('div, section, aside').forEach((el) => {
      const style = window.getComputedStyle(el);
      // Only consider floating banner-sized elements, never page wrappers
      if (style.position !== 'fixed' && style.position !== 'sticky') return;
      const rect = el.getBoundingClientRect();
      if (rect.height > window.innerHeight * 0.4) return;
      const text = el.textContent || '';
      if (text.toLowerCase().includes('cookie') && el.querySelector('button')) {
        el.style.display = 'none';
      }
    });
  });
}

async function settle(page, extra = 1500) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(extra);
}

// Hide full-screen modal overlays (signup prompts, gates) that block content.
async function stripOverlays(page) {
  await page.evaluate(() => {
    document.querySelectorAll('div').forEach((el) => {
      const s = window.getComputedStyle(el);
      if (s.position !== 'fixed') return;
      const z = parseInt(s.zIndex || '0', 10);
      const rect = el.getBoundingClientRect();
      if (z >= 40 && rect.width > window.innerWidth * 0.5 && rect.height > window.innerHeight * 0.5) {
        el.style.display = 'none';
      }
    });
  });
  await page.waitForTimeout(400);
}

async function dismissOnboarding(page) {
  const skip = page.locator('button:has-text("Skip")').first();
  if (await skip.isVisible({ timeout: 4000 }).catch(() => false)) {
    await skip.click();
    await page.waitForTimeout(1200);
  }
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

  // Drive the system-installed Google Chrome; the Playwright-managed browser
  // build in the local cache mismatches the installed Playwright version and
  // produces black screenshots.
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
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
  // The search page opens a "How would you like to search" modal.
  // Pick "Enter Address or search", then type the demo address.
  try {
    const enterAddress = page.locator('text=Enter Address or search').first();
    if (await enterAddress.isVisible({ timeout: 3000 }).catch(() => false)) {
      await enterAddress.click();
      await page.waitForTimeout(1000);
    }
    const input = page
      .locator('div.fixed input, [role="dialog"] input, input[placeholder*="address" i], input[type="search"]')
      .last();
    if (await input.isVisible({ timeout: 3000 }).catch(() => false)) {
      await input.pressSequentially(DEMO_ADDRESS, { delay: 30, timeout: 10000 });
      await page.waitForTimeout(1800);
    }
  } catch {
    console.log('  WARN could not type demo address; capturing as-is');
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
  await page.waitForSelector('text=Investment Overview', { timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(4000);
  await dismissOnboarding(page);
  await hideChrome(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(800);
  await shot(page, 'verdict.png');

  // The Investment Overview (deal gap numbers) sits below the street view photo.
  // Scroll it to a fixed offset from the top so the video crop is deterministic.
  const overview = page.locator('text=Investment Overview').first();
  if (await overview.isVisible().catch(() => false)) {
    await overview.evaluate((el) => {
      const y = el.getBoundingClientRect().top + window.scrollY;
      window.scrollTo(0, Math.max(0, y - 110));
    });
    await page.waitForTimeout(1200);
    await shot(page, 'verdict-metrics.png');
  }

  // Third shot: the "ways to make this work" section with the 4 option cards.
  const ways = page.locator('text=WAYS TO MAKE THIS WORK').first();
  if (await ways.isVisible().catch(() => false)) {
    await ways.evaluate((el) => {
      const y = el.getBoundingClientRect().top + window.scrollY;
      window.scrollTo(0, Math.max(0, y - 130));
    });
    await page.waitForTimeout(1200);
    await shot(page, 'verdict-options.png');
  }

  // 4. Strategy
  console.log('[4/5] strategy');
  await page.goto(`${BASE_URL}/strategy?address=${encodeURIComponent(DEMO_ADDRESS)}`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForSelector('text=Options that close the gap', { timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(3000);
  await dismissOnboarding(page);
  await stripOverlays(page);
  await hideChrome(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(800);
  await shot(page, 'strategy.png');

  // 5. Cash buyer directory (public)
  console.log('[5/5] directory');
  await page.goto(`${BASE_URL}/directory`, { waitUntil: 'domcontentloaded' });
  await settle(page, 2500);
  await stripOverlays(page);
  // Hide the inline sign-in gate card so the crop has a clean lower edge
  // (the blurred teaser cards behind it stay visible).
  await page.evaluate(() => {
    const marker = 'Sign in to browse verified cash buyers';
    const matches = Array.from(document.querySelectorAll('div, section')).filter(
      (el) => (el.textContent || '').includes(marker) && el.offsetHeight < window.innerHeight * 0.9,
    );
    const deepest = matches[matches.length - 1];
    if (deepest) deepest.style.display = 'none';
  });
  await page.waitForTimeout(400);
  await hideChrome(page);
  await shot(page, 'directory.png');

  await browser.close();
  console.log(`done → ${OUT_DIR}`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
