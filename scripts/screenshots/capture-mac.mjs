/**
 * Capture real desktop UI plates for Mac App Store screenshots.
 *
 * Viewport is a 16" MacBook landscape (1440×900 @ 2x). Output goes to
 * frontend/public/app-store/connect/assets/mac-desktop/ and is composited
 * by apply_mac_screenshot_brand.py into 2880×1800 listing frames.
 *
 * Usage:
 *   node scripts/screenshots/capture-mac.mjs
 *   node scripts/screenshots/capture-mac.mjs --base-url http://localhost:3000
 *   node scripts/screenshots/capture-mac.mjs --headed
 */

import { chromium } from 'playwright'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const args = process.argv.slice(2)
const getArg = (name) => {
  const idx = args.indexOf(`--${name}`)
  return idx !== -1 ? args[idx + 1] : undefined
}
const hasFlag = (name) => args.includes(`--${name}`)

const BASE_URL = getArg('base-url') ?? 'https://dealgapiq.com'
const HEADED = hasFlag('headed')
const DEMO_EMAIL = getArg('email') ?? 'review@dealgapiq.com'
const DEMO_PASSWORD = getArg('password') ?? 'Review$1234'
const DEMO_ADDRESS = getArg('address') ?? '3789 Moon Bay Circle, Wellington, FL 33414'

const OUT_DIR = path.resolve(
  __dirname,
  '../../frontend/public/app-store/connect/assets/mac-desktop',
)

const VIEWPORT = { width: 1440, height: 900 }
const DEVICE_SCALE = 2

const MAP_WELLINGTON =
  '/map-search?lat=26.658&lng=-80.241&zoom=12&label=Wellington%2C%20FL'
const MAP_AUSTIN = '/map-search?lat=30.2672&lng=-97.7431&zoom=12&label=Austin%2C%20TX'

async function hideChrome(page) {
  await page.evaluate(() => {
    document.querySelectorAll('div, section, aside').forEach((el) => {
      const text = el.textContent || ''
      if (
        text.includes('We use essential cookies') ||
        (text.toLowerCase().includes('cookie') && el.querySelector('button'))
      ) {
        const rect = el.getBoundingClientRect()
        if (rect.width > window.innerWidth * 0.8 && rect.bottom > window.innerHeight * 0.7) {
          el.style.display = 'none'
        }
      }
    })
  })
  await page.addStyleTag({
    content: `
      [class*="cookie-banner"], [class*="CookieBanner"],
      [class*="cookie-consent"], [class*="CookieConsent"],
      [id*="cookie-banner"], [id*="cookie-consent"],
      [class*="consent-banner"],
      iframe[title*="Intercom"], .intercom-lightweight-app,
      [id*="intercom"] {
        display: none !important;
      }
    `,
  })
}

async function waitQuiet(page, ms = 1500) {
  await page.waitForLoadState('networkidle').catch(() => {})
  await page.waitForTimeout(ms)
}

async function clickFirst(page, selectors, timeout = 2500) {
  for (const sel of selectors) {
    const loc = page.locator(sel).first()
    if (await loc.isVisible({ timeout }).catch(() => false)) {
      await loc.click()
      return true
    }
  }
  return false
}

async function visibleAny(page, texts, timeout = 4000) {
  for (const text of texts) {
    if (await page.locator(`text=${text}`).first().isVisible({ timeout }).catch(() => false)) {
      return true
    }
  }
  return false
}

async function save(page, filename) {
  const filepath = path.join(OUT_DIR, filename)
  await page.screenshot({ path: filepath, fullPage: false, type: 'png' })
  const kb = (fs.statSync(filepath).size / 1024).toFixed(0)
  console.log(`   ✓ ${filename} (${kb} KB)`)
}

async function login(page) {
  console.log('   → Logging in…')
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' })
  await waitQuiet(page, 800)

  const email = page
    .locator('input[type="email"], input[name="email"], input[placeholder*="email" i]')
    .first()
  const password = page.locator('input[type="password"], input[name="password"]').first()
  if (!(await email.isVisible({ timeout: 8000 }).catch(() => false))) {
    console.log('   ✗ Email field not found')
    return false
  }

  await email.fill(DEMO_EMAIL)
  await password.fill(DEMO_PASSWORD)
  await page
    .locator('button:has-text("Sign In"), button:has-text("Log In"), button[type="submit"]')
    .first()
    .click()

  try {
    await Promise.race([
      page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20000 }),
      page.waitForSelector('text=Invalid', { timeout: 12000 }),
    ])
  } catch {
    /* fall through */
  }

  if (page.url().includes('/login')) {
    console.log('   ✗ Login failed')
    return false
  }
  console.log(`   ✓ Logged in → ${new URL(page.url()).pathname}`)
  await page.waitForTimeout(800)
  return true
}

async function openDiscovery(page) {
  const url = `${BASE_URL}/discovery?address=${encodeURIComponent(DEMO_ADDRESS)}`
  console.log(`   → ${url}`)
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  try {
    await page.waitForSelector('text=Target Buy', { timeout: 50000 })
  } catch {
    await page.waitForSelector('text=Deal Gap', { timeout: 8000 }).catch(() => {})
  }
  await waitQuiet(page, 2000)
  await hideChrome(page)
  const ok = await visibleAny(page, ['Target Buy', 'Income Value', 'Deal Gap'], 2000)
  console.log(ok ? '   ✓ Discovery loaded' : '   ⚠ Discovery loaded without verdict cards')
  return ok
}

async function openMap(page, pathAndQuery) {
  await page.goto(`${BASE_URL}${pathAndQuery}`, { waitUntil: 'domcontentloaded' })
  await waitQuiet(page, 4000)
  await hideChrome(page)
  await page
    .waitForSelector('canvas, [class*="mapbox"], [class*="MapSearch"], text=Active', {
      timeout: 20000,
    })
    .catch(() => {})
  await page.waitForTimeout(2500)
}

async function captureHeroAndVerdict(page) {
  console.log('\n   [01 + 03] Discovery verdict (desktop)')
  await openDiscovery(page)
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(400)

  const cards = page.locator('text=Investment Overview').first()
  if (await cards.isVisible({ timeout: 2000 }).catch(() => false)) {
    await cards.scrollIntoViewIfNeeded()
    await page.evaluate(() => window.scrollBy(0, -80))
    await page.waitForTimeout(400)
  }
  await save(page, '01-hero.png')
  await save(page, '03-verdict.png')
}

async function captureSearchMap(page) {
  console.log('\n   [02] Color-coded map')
  await openMap(page, MAP_WELLINGTON)
  if (!(await page.locator('canvas').first().isVisible({ timeout: 3000 }).catch(() => false))) {
    await openMap(page, MAP_AUSTIN)
  }
  await clickFirst(page, ['button:has-text("Accept")', 'button:has-text("Got it")'], 1500)
  await page.waitForTimeout(1500)
  await save(page, '02-search.png')
}

async function capturePillsList(page) {
  console.log('\n   [04] Opportunity list (desktop DEAL / MAYBE / PASS equivalent)')
  await openMap(page, MAP_AUSTIN)
  const switched = await clickFirst(
    page,
    ['button[aria-label="List and download view"]', 'button:has-text("List Download")'],
    4000,
  )
  if (switched) {
    await page.waitForTimeout(2000)
  }
  await save(page, '04-pills.png')
}

async function captureCoverage(page) {
  console.log('\n   [05] Distressed coverage (foreclosure / auction)')
  await openMap(page, MAP_AUSTIN)
  for (const label of ['Foreclosure', 'Auction', 'Pre-Foreclosure']) {
    await clickFirst(page, [`button:has-text("${label}")`], 2000)
    await page.waitForTimeout(300)
  }
  await page.waitForTimeout(3500)
  await save(page, '05-coverage.png')
}

async function captureComps(page) {
  console.log('\n   [06] Comps / Price Intel')
  const url = `${BASE_URL}/price-intel?address=${encodeURIComponent(DEMO_ADDRESS)}`
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page
    .waitForSelector('text=Comp, text=Sale, text=Subject, text=Comparable', { timeout: 40000 })
    .catch(() => {})
  await waitQuiet(page, 2500)
  await hideChrome(page)
  await page.evaluate(() => window.scrollTo(0, 0))
  await save(page, '06-comps.png')
}

async function captureDealMaker(page) {
  console.log('\n   [07] Deal Maker')
  const url = `${BASE_URL}/deal-maker?address=${encodeURIComponent(DEMO_ADDRESS)}`
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page
    .waitForSelector('text=Purchase, text=Cash Flow, text=Rehab, text=ARV, text=Cap Rate', {
      timeout: 45000,
    })
    .catch(() => {})
  await waitQuiet(page, 2500)
  await hideChrome(page)
  await page.evaluate(() => window.scrollTo(0, 0))
  await save(page, '07-dealmaker.png')
}

async function captureHeatmap(page) {
  console.log('\n   [08] Neighborhood map density')
  await openMap(page, '/map-search?lat=30.2672&lng=-97.7431&zoom=11&label=Austin%2C%20TX')
  await page.waitForTimeout(2000)
  await save(page, '08-heatmap.png')
}

async function main() {
  console.log('\nDealGapIQ Mac desktop screenshot capture')
  console.log(`   Output:   ${OUT_DIR}`)
  console.log(`   Base URL: ${BASE_URL}`)
  console.log(`   Address:  ${DEMO_ADDRESS}`)

  fs.mkdirSync(OUT_DIR, { recursive: true })

  const browser = await chromium.launch({
    headless: !HEADED,
    channel: 'chrome',
    args: ['--disable-web-security'],
  })
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: DEVICE_SCALE,
    isMobile: false,
    hasTouch: false,
    colorScheme: 'dark',
    screen: { width: VIEWPORT.width, height: VIEWPORT.height },
  })
  const page = await context.newPage()

  const loggedIn = await login(page)
  if (!loggedIn) {
    console.log('\n   ⚠ Continuing without auth — comps / Deal Maker may gate.')
  }

  await captureHeroAndVerdict(page)
  await captureSearchMap(page)
  await capturePillsList(page)
  await captureCoverage(page)
  await captureComps(page)
  await captureDealMaker(page)
  await captureHeatmap(page)

  await browser.close()

  const files = fs.readdirSync(OUT_DIR).filter((f) => f.endsWith('.png'))
  console.log(`\nSaved ${files.length} desktop plates to:\n   ${OUT_DIR}\n`)
  console.log('Next: python3 frontend/public/app-store/connect/apply_mac_screenshot_brand.py')
}

main().catch((err) => {
  console.error('\nFatal error:', err)
  process.exit(1)
})
