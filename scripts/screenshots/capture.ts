/**
 * App Store / Play Store Screenshot Automation
 *
 * Captures the 5 required screens at exact device pixel dimensions:
 *   1. Login        — branded sign-in screen
 *   2. Search       — search with address entered
 *   3. Verdict      — deal score, signals, price cards
 *   4. Strategy     — strategy detail with metrics
 *   5. Deal Vault   — saved properties list
 *
 * Usage:
 *   npx tsx scripts/screenshots/capture.ts
 *   npx tsx scripts/screenshots/capture.ts --base-url http://localhost:3000
 *   npx tsx scripts/screenshots/capture.ts --device ipad
 *   npx tsx scripts/screenshots/capture.ts --device android
 */

import { chromium, type Page, type BrowserContext } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const BASE_URL = process.argv.includes('--base-url')
  ? process.argv[process.argv.indexOf('--base-url') + 1]
  : 'https://dealgapiq.com';

const DEMO_EMAIL = 'review@dealgapiq.com';
const DEMO_PASSWORD = 'AppReview2026!';

const DEMO_ADDRESS = '123 Main St, Austin, TX 78701';

const DEVICE_PROFILES = {
  'iphone-6.7': {
    label: 'iPhone 6.7"',
    folder: 'iphone-6.7',
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: 3,
    outputSize: '1290x2796',
  },
  'iphone-6.5': {
    label: 'iPhone 6.5"',
    folder: 'iphone-6.5',
    viewport: { width: 414, height: 896 },
    deviceScaleFactor: 3,
    outputSize: '1242x2688',
  },
  ipad: {
    label: 'iPad Pro 12.9"',
    folder: 'ipad-12.9',
    viewport: { width: 1024, height: 1366 },
    deviceScaleFactor: 2,
    outputSize: '2048x2732',
  },
  android: {
    label: 'Android Phone',
    folder: 'android-phone',
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 3,
    outputSize: '1236x2745',
  },
} as const;

type DeviceKey = keyof typeof DEVICE_PROFILES;

const selectedDevice: DeviceKey = (() => {
  const idx = process.argv.indexOf('--device');
  if (idx !== -1) {
    const val = process.argv[idx + 1] as DeviceKey;
    if (val in DEVICE_PROFILES) return val;
    console.error(`Unknown device "${val}". Options: ${Object.keys(DEVICE_PROFILES).join(', ')}`);
    process.exit(1);
  }
  return 'iphone-6.7';
})();

const device = DEVICE_PROFILES[selectedDevice];

const OUT_DIR = path.resolve(__dirname, 'output', device.folder);

// ---------------------------------------------------------------------------
// Screenshot definitions
// ---------------------------------------------------------------------------

interface Screenshot {
  name: string;
  filename: string;
  capture: (page: Page) => Promise<void>;
}

const SCREENSHOTS: Screenshot[] = [
  {
    name: '1. Login Screen',
    filename: '01_login.png',
    async capture(page) {
      await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);
    },
  },
  {
    name: '2. Search with Address',
    filename: '02_search.png',
    async capture(page) {
      await page.goto(`${BASE_URL}/search`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);

      // Type the demo address into the search input
      const searchInput = page.locator('input[placeholder*="address"], input[placeholder*="Address"], input[type="search"]').first();
      if (await searchInput.isVisible()) {
        await searchInput.click();
        await searchInput.fill(DEMO_ADDRESS);
        await page.waitForTimeout(800);
      }
    },
  },
  {
    name: '3. IQ Verdict',
    filename: '03_verdict.png',
    async capture(page) {
      await login(page);
      await searchProperty(page);

      await page.goto(`${BASE_URL}/verdict`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);

      // Scroll to show score + price cards in one frame
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(500);
    },
  },
  {
    name: '4. Strategy Detail',
    filename: '04_strategy.png',
    async capture(page) {
      await page.goto(`${BASE_URL}/strategy`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);

      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(500);
    },
  },
  {
    name: '5. Deal Vault (Saved Properties)',
    filename: '05_deal_vault.png',
    async capture(page) {
      await page.goto(`${BASE_URL}/saved-properties`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);

      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(500);
    },
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let isLoggedIn = false;

async function login(page: Page) {
  if (isLoggedIn) return;

  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Try email/password fields
  const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
  const passwordInput = page.locator('input[type="password"], input[name="password"]').first();

  if (await emailInput.isVisible()) {
    await emailInput.fill(DEMO_EMAIL);
    await passwordInput.fill(DEMO_PASSWORD);

    const submitBtn = page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Log In")').first();
    await submitBtn.click();

    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
    await page.waitForTimeout(1500);
  }

  isLoggedIn = true;
}

async function searchProperty(page: Page) {
  // Navigate to search and trigger an analysis
  await page.goto(`${BASE_URL}/search`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const searchInput = page.locator('input[placeholder*="address"], input[placeholder*="Address"], input[type="search"]').first();
  if (await searchInput.isVisible()) {
    await searchInput.click();
    await searchInput.fill(DEMO_ADDRESS);
    await page.waitForTimeout(1000);

    // Select autocomplete suggestion if visible
    const suggestion = page.locator('[class*="suggestion"], [class*="autocomplete"] li, [role="option"]').first();
    if (await suggestion.isVisible({ timeout: 2000 }).catch(() => false)) {
      await suggestion.click();
      await page.waitForTimeout(500);
    }

    // Click analyze button
    const analyzeBtn = page.locator('button:has-text("Analyze"), button:has-text("Search"), button[type="submit"]').first();
    if (await analyzeBtn.isVisible()) {
      await analyzeBtn.click();
      await page.waitForTimeout(5000);
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`\n📱 DealGapIQ App Store Screenshot Capture`);
  console.log(`   Device:  ${device.label} (${device.outputSize})`);
  console.log(`   Output:  ${OUT_DIR}`);
  console.log(`   Base:    ${BASE_URL}\n`);

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-web-security'],
  });

  const context = await browser.newContext({
    viewport: device.viewport,
    deviceScaleFactor: device.deviceScaleFactor,
    isMobile: selectedDevice !== 'ipad',
    hasTouch: true,
    colorScheme: 'dark',
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });

  const page = await context.newPage();

  // Inject iOS-style status bar overlay (carrier, time, battery)
  await page.addStyleTag({
    content: `
      body::before {
        content: '';
        display: block;
        height: 54px; /* iPhone dynamic island safe area */
        width: 100%;
        position: fixed;
        top: 0;
        left: 0;
        z-index: 99999;
        pointer-events: none;
      }
    `,
  });

  for (const screenshot of SCREENSHOTS) {
    console.log(`   Capturing: ${screenshot.name}...`);

    try {
      await screenshot.capture(page);

      const filepath = path.join(OUT_DIR, screenshot.filename);
      await page.screenshot({
        path: filepath,
        fullPage: false,
        type: 'png',
      });

      const stats = fs.statSync(filepath);
      console.log(`   ✓ Saved ${screenshot.filename} (${(stats.size / 1024).toFixed(0)} KB)\n`);
    } catch (err) {
      console.error(`   ✗ Failed: ${screenshot.name}`, err);
    }
  }

  await browser.close();

  console.log(`\n✅ Done! Screenshots saved to:\n   ${OUT_DIR}\n`);
  console.log(`📋 App Store Connect upload specs:`);
  console.log(`   Device:     ${device.label}`);
  console.log(`   Dimensions: ${device.outputSize} px`);
  console.log(`   Format:     PNG (no alpha)`);
  console.log(`   Count:      ${SCREENSHOTS.length} screenshots\n`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
