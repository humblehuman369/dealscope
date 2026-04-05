/**
 * Debug the login flow — captures screenshots at each step to diagnose failures.
 */

import { chromium } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';

const BASE_URL = process.argv[3] ?? 'https://dealgapiq.com';
const EMAIL = 'review@dealgapiq.com';
const PASSWORD = 'Review$123';

const OUT = path.resolve(__dirname, 'output', 'debug');
fs.mkdirSync(OUT, { recursive: true });

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    colorScheme: 'dark',
  });
  const page = await context.newPage();

  console.log('1. Navigate to login...');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(OUT, '01_before_fill.png') });

  console.log('2. Finding form fields...');
  const allInputs = await page.locator('input').all();
  for (const inp of allInputs) {
    const type = await inp.getAttribute('type');
    const name = await inp.getAttribute('name');
    const placeholder = await inp.getAttribute('placeholder');
    const visible = await inp.isVisible();
    console.log(`   input: type=${type} name=${name} placeholder="${placeholder}" visible=${visible}`);
  }

  const emailInput = page.locator('input[type="email"], input[placeholder*="example" i]').first();
  const passwordInput = page.locator('input[type="password"]').first();

  if (!await emailInput.isVisible()) {
    console.log('   ✗ Email input not visible');
    await browser.close();
    return;
  }

  console.log('3. Filling credentials...');
  await emailInput.fill(EMAIL);
  await passwordInput.fill(PASSWORD);
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, '02_filled.png') });

  console.log('4. Looking for submit button...');
  const buttons = await page.locator('button').all();
  for (const btn of buttons) {
    const text = await btn.textContent();
    const type = await btn.getAttribute('type');
    const visible = await btn.isVisible();
    console.log(`   button: text="${text?.trim()}" type=${type} visible=${visible}`);
  }

  const submitBtn = page.locator('button:has-text("Sign In")').first();
  console.log('5. Clicking Sign In...');
  await submitBtn.click();

  console.log('6. Waiting 8s for response...');
  await page.waitForTimeout(8000);
  await page.screenshot({ path: path.join(OUT, '03_after_click.png') });

  const currentUrl = page.url();
  console.log(`   Current URL: ${currentUrl}`);

  // Check for error messages
  const errorText = await page.locator('[class*="error"], [role="alert"], .text-red, text=Invalid, text=incorrect, text=failed').allTextContents();
  if (errorText.length > 0) {
    console.log(`   Error messages: ${errorText.join(' | ')}`);
  }

  const pageText = await page.locator('body').textContent();
  if (pageText?.includes('Invalid') || pageText?.includes('incorrect') || pageText?.includes('failed')) {
    const snippet = pageText.match(/(Invalid|incorrect|failed).{0,100}/i)?.[0];
    console.log(`   Found error text: "${snippet}"`);
  }

  console.log(`\nDebug screenshots saved to: ${OUT}`);
  await browser.close();
}

main().catch(console.error);
