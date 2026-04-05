/**
 * App Store / Play Store Screenshot Automation
 *
 * Captures the 5 required screens at exact device pixel dimensions:
 *   1. Login        — branded sign-in screen
 *   2. Search       — address input with demo address typed
 *   3. Verdict      — deal score, signals, price cards
 *   4. Strategy     — strategy detail with metrics
 *   5. Deal Vault   — saved properties list
 *
 * Usage:
 *   npx tsx scripts/screenshots/capture.ts
 *   npx tsx scripts/screenshots/capture.ts --base-url http://localhost:3000
 *   npx tsx scripts/screenshots/capture.ts --device ipad
 *   npx tsx scripts/screenshots/capture.ts --headed   (watch the browser)
 *
 * Prerequisites:
 *   - Demo account must exist: review@dealgapiq.com / AppReview2026!
 *   - Account should have Pro tier + saved properties for Deal Vault
 */

import { chromium, type Page } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const getArg = (name: string) => {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? args[idx + 1] : undefined;
};
const hasFlag = (name: string) => args.includes(`--${name}`);

const BASE_URL = getArg('base-url') ?? 'https://dealgapiq.com';
const HEADED = hasFlag('headed');

const DEMO_EMAIL = getArg('email') ?? 'review@dealgapiq.com';
const DEMO_PASSWORD = getArg('password') ?? 'Review$123';
const DEMO_ADDRESS = getArg('address') ?? '742 Evergreen Terrace, Springfield, IL';

// ---------------------------------------------------------------------------
// Device profiles
// ---------------------------------------------------------------------------

const DEVICE_PROFILES = {
  'iphone-6.7': {
    label: 'iPhone 6.7"',
    folder: 'iphone-6.7',
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: 3,
    outputSize: '1290x2796',
    isMobile: true,
  },
  'iphone-6.5': {
    label: 'iPhone 6.5"',
    folder: 'iphone-6.5',
    viewport: { width: 414, height: 896 },
    deviceScaleFactor: 3,
    outputSize: '1242x2688',
    isMobile: true,
  },
  ipad: {
    label: 'iPad Pro 12.9"',
    folder: 'ipad-12.9',
    viewport: { width: 1024, height: 1366 },
    deviceScaleFactor: 2,
    outputSize: '2048x2732',
    isMobile: false,
  },
  android: {
    label: 'Android Phone',
    folder: 'android-phone',
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 3,
    outputSize: '1236x2745',
    isMobile: true,
  },
} as const;

type DeviceKey = keyof typeof DEVICE_PROFILES;

const selectedDevice: DeviceKey = (() => {
  const val = getArg('device') as DeviceKey | undefined;
  if (val && val in DEVICE_PROFILES) return val;
  if (val) {
    console.error(`Unknown device "${val}". Options: ${Object.keys(DEVICE_PROFILES).join(', ')}`);
    process.exit(1);
  }
  return 'iphone-6.7';
})();

const device = DEVICE_PROFILES[selectedDevice];
const OUT_DIR = path.resolve(__dirname, 'output', device.folder);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function dismissCookieBanner(page: Page) {
  try {
    const acceptBtn = page.locator('button:has-text("Accept all")').first();
    if (await acceptBtn.isVisible({ timeout: 3000 })) {
      await acceptBtn.click();
      await page.waitForTimeout(500);
      return;
    }
    const acceptBtn2 = page.locator('button:has-text("Accept"), button:has-text("OK"), button:has-text("Got it")').first();
    if (await acceptBtn2.isVisible({ timeout: 1000 })) {
      await acceptBtn2.click();
      await page.waitForTimeout(500);
    }
  } catch {
    // Banner may not appear — that's fine
  }
}

async function hideAppChrome(page: Page) {
  await dismissCookieBanner(page);
  await page.evaluate(() => {
    // Remove cookie banners by content detection
    document.querySelectorAll('div, section, aside').forEach((el) => {
      const text = el.textContent || '';
      if (
        text.includes('We use essential cookies') ||
        text.includes('cookie') && el.querySelector('button')
      ) {
        const rect = (el as HTMLElement).getBoundingClientRect();
        // Only remove if it looks like a banner (full-width, at bottom)
        if (rect.width > window.innerWidth * 0.8 && rect.bottom > window.innerHeight * 0.7) {
          (el as HTMLElement).style.display = 'none';
        }
      }
    });
  });
  await page.addStyleTag({
    content: `
      /* Force-hide cookie banners and consent overlays */
      [class*="cookie-banner"], [class*="CookieBanner"],
      [class*="cookie-consent"], [class*="CookieConsent"],
      [id*="cookie-banner"], [id*="cookie-consent"],
      [class*="consent-banner"] {
        display: none !important;
      }
    `,
  });
}

async function waitForContent(page: Page, timeout = 5000) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(Math.min(timeout, 2000));
}

async function saveScreenshot(page: Page, filename: string) {
  const filepath = path.join(OUT_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: false, type: 'png' });
  const stats = fs.statSync(filepath);
  console.log(`   ✓ Saved ${filename} (${(stats.size / 1024).toFixed(0)} KB)`);
  return filepath;
}

// ---------------------------------------------------------------------------
// Screenshot flows
// ---------------------------------------------------------------------------

async function captureLogin(page: Page) {
  console.log('\n   [1/5] Login Screen');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await waitForContent(page);
  await hideAppChrome(page);

  // Hide the top app navigation bar for a cleaner screenshot
  await page.addStyleTag({
    content: `
      header, nav, [class*="AppHeader"], [class*="app-header"],
      [class*="toolbar"], [class*="Toolbar"] {
        display: none !important;
      }
    `,
  });

  await page.waitForTimeout(800);
  await saveScreenshot(page, '01_login.png');
}

async function captureSearch(page: Page) {
  console.log('\n   [2/5] Search Screen');
  await page.goto(`${BASE_URL}`, { waitUntil: 'domcontentloaded' });
  await waitForContent(page);
  await hideAppChrome(page);

  // The search page shows a "Property Search" button or modal
  // Try clicking the search trigger to open the search input
  const searchTrigger = page.locator(
    'button:has-text("Property Search"), [class*="search-trigger"], input[placeholder*="Search"], button:has-text("Enter Address")'
  ).first();
  if (await searchTrigger.isVisible({ timeout: 3000 }).catch(() => false)) {
    await searchTrigger.click();
    await page.waitForTimeout(1000);
  }

  // Look for the "Enter Address or search" option in the modal
  const enterAddress = page.locator('text=Enter Address').first();
  if (await enterAddress.isVisible({ timeout: 2000 }).catch(() => false)) {
    await enterAddress.click();
    await page.waitForTimeout(1000);
  }

  // Now find and fill the actual address input
  const searchInput = page.locator(
    'input[placeholder*="address" i], input[placeholder*="search" i], input[placeholder*="Enter" i], input[type="search"]'
  ).first();

  if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await searchInput.click();
    await page.waitForTimeout(300);
    await searchInput.fill(DEMO_ADDRESS);
    await page.waitForTimeout(1200);
  }

  await saveScreenshot(page, '02_search.png');
}

async function login(page: Page): Promise<boolean> {
  console.log('   → Logging in with demo account...');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await waitForContent(page);

  const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i], input[placeholder*="example" i]').first();
  const passwordInput = page.locator('input[type="password"], input[name="password"]').first();

  if (!await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    console.log('   ✗ Could not find email input');
    return false;
  }

  await emailInput.fill(DEMO_EMAIL);
  await passwordInput.fill(DEMO_PASSWORD);
  await page.waitForTimeout(500);

  const submitBtn = page.locator(
    'button:has-text("Sign In"), button:has-text("Log In"), button[type="submit"]'
  ).first();
  await submitBtn.click();

  // Wait for navigation away from login OR for an error
  try {
    await Promise.race([
      page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 }),
      page.waitForSelector('text=Invalid', { timeout: 10000 }),
      page.waitForSelector('text=incorrect', { timeout: 10000 }),
      page.waitForSelector('[class*="error"]', { timeout: 10000 }),
    ]);

    const url = page.url();
    if (url.includes('/login')) {
      console.log('   ✗ Login failed (stayed on login page). Check credentials.');
      return false;
    }

    console.log(`   ✓ Logged in → ${new URL(url).pathname}`);
    await page.waitForTimeout(1000);
    return true;
  } catch {
    const url = page.url();
    if (!url.includes('/login')) {
      console.log(`   ✓ Logged in → ${new URL(url).pathname}`);
      return true;
    }
    console.log('   ✗ Login timed out');
    return false;
  }
}

async function searchAndAnalyze(page: Page): Promise<boolean> {
  console.log('   → Searching property...');

  // Navigate to search
  await page.goto(`${BASE_URL}/search`, { waitUntil: 'domcontentloaded' });
  await waitForContent(page);

  // Handle the search modal flow
  const enterAddress = page.locator('text=Enter Address').first();
  if (await enterAddress.isVisible({ timeout: 3000 }).catch(() => false)) {
    await enterAddress.click();
    await page.waitForTimeout(1000);
  }

  const searchInput = page.locator(
    'input[placeholder*="address" i], input[placeholder*="search" i], input[placeholder*="Enter" i], input[type="search"]'
  ).first();

  if (!await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    console.log('   ✗ Could not find search input');
    return false;
  }

  await searchInput.fill(DEMO_ADDRESS);
  await page.waitForTimeout(1500);

  // Select autocomplete suggestion if one appears
  const suggestion = page.locator(
    '[class*="suggestion"], [class*="autocomplete"] li, [role="option"], [class*="pac-item"]'
  ).first();
  if (await suggestion.isVisible({ timeout: 3000 }).catch(() => false)) {
    await suggestion.click();
    await page.waitForTimeout(500);
  }

  // Click Analyze / Search button
  const analyzeBtn = page.locator(
    'button:has-text("Analyze"), button:has-text("Search"), button[type="submit"]'
  ).first();
  if (await analyzeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await analyzeBtn.click();
    // Wait for analysis to complete (URL should change to /verdict or /analyzing)
    try {
      await page.waitForURL(
        (url) => url.pathname.includes('/verdict') || url.pathname.includes('/analyzing'),
        { timeout: 20000 }
      );
      // If on analyzing page, wait for redirect to verdict
      if (page.url().includes('/analyzing')) {
        await page.waitForURL((url) => url.pathname.includes('/verdict'), { timeout: 30000 });
      }
      console.log(`   ✓ Analysis complete → ${new URL(page.url()).pathname}`);
      return true;
    } catch {
      console.log(`   ✗ Analysis did not complete. Current: ${page.url()}`);
      return false;
    }
  }

  return false;
}

async function captureVerdict(page: Page, isLoggedIn: boolean) {
  console.log('\n   [3/5] IQ Verdict');

  if (isLoggedIn) {
    const analyzed = await searchAndAnalyze(page);
    if (analyzed) {
      await hideAppChrome(page);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(1500);
      await saveScreenshot(page, '03_verdict.png');
      return;
    }
  }

  // Fallback: navigate directly and capture whatever is there
  await page.goto(`${BASE_URL}/verdict`, { waitUntil: 'domcontentloaded' });
  await waitForContent(page, 3000);
  await hideAppChrome(page);
  await saveScreenshot(page, '03_verdict.png');
}

async function captureStrategy(page: Page) {
  console.log('\n   [4/5] Strategy Detail');

  // If we're already on verdict, navigate to strategy
  await page.goto(`${BASE_URL}/strategy`, { waitUntil: 'domcontentloaded' });
  await waitForContent(page, 3000);
  await hideAppChrome(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1000);
  await saveScreenshot(page, '04_strategy.png');
}

async function captureDealVault(page: Page) {
  console.log('\n   [5/5] Deal Vault');

  await page.goto(`${BASE_URL}/saved-properties`, { waitUntil: 'domcontentloaded' });
  await waitForContent(page, 3000);
  await hideAppChrome(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1000);
  await saveScreenshot(page, '05_deal_vault.png');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`\n📱 DealGapIQ App Store Screenshot Capture`);
  console.log(`   Device:    ${device.label} (${device.outputSize})`);
  console.log(`   Output:    ${OUT_DIR}`);
  console.log(`   Base URL:  ${BASE_URL}`);
  console.log(`   Headed:    ${HEADED}`);
  console.log(`   Address:   ${DEMO_ADDRESS}`);

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({
    headless: !HEADED,
    args: ['--disable-web-security'],
  });

  const context = await browser.newContext({
    viewport: device.viewport,
    deviceScaleFactor: device.deviceScaleFactor,
    isMobile: device.isMobile,
    hasTouch: device.isMobile,
    colorScheme: 'dark',
    userAgent: device.isMobile
      ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
      : undefined,
  });

  const page = await context.newPage();

  // Capture public screens first
  await captureLogin(page);
  await captureSearch(page);

  // Attempt login for authenticated screens
  const isLoggedIn = await login(page);
  if (!isLoggedIn) {
    console.log('\n   ⚠  Demo account login failed.');
    console.log('   Screenshots 3-5 will show unauthenticated state.');
    console.log('   To fix: ensure the demo account exists (see mobile/STORE_REVIEW.md)\n');
  }

  await captureVerdict(page, isLoggedIn);
  await captureStrategy(page);
  await captureDealVault(page);

  await browser.close();

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`✅ Screenshots saved to:\n   ${OUT_DIR}\n`);
  console.log(`📋 App Store Connect upload specs:`);
  console.log(`   Device:     ${device.label}`);
  console.log(`   Dimensions: ${device.outputSize} px`);
  console.log(`   Format:     PNG (no alpha)`);

  const files = fs.readdirSync(OUT_DIR).filter((f) => f.endsWith('.png'));
  console.log(`   Files:      ${files.length} screenshots`);

  if (!isLoggedIn) {
    console.log(`\n⚠  Some screenshots show unauthenticated state.`);
    console.log(`   Create the demo account first:\n`);
    console.log(`   Email:    ${DEMO_EMAIL}`);
    console.log(`   Password: ${DEMO_PASSWORD}`);
    console.log(`   Tier:     Pro (set via admin panel)`);
    console.log(`   Then re-run: npm run screenshots\n`);
  }
}

main().catch((err) => {
  console.error('\nFatal error:', err);
  process.exit(1);
});
