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
 *   node scripts/screenshots/capture-mac.mjs --only 06-comps.png,07-dealmaker.png
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
// This property has complete comps and rehab data, which the Austin addresses
// currently do not — several panels render "Unavailable" without it.
const DEMO_ADDRESS = getArg('address') ?? '6778 Columbia Avenue, Lake Worth, FL 33467'
const ONLY = getArg('only')?.split(',').map((s) => s.trim())

const OUT_DIR = path.resolve(
  __dirname,
  '../../frontend/public/app-store/connect/assets/mac-desktop',
)

const VIEWPORT = { width: 1440, height: 900 }
const DEVICE_SCALE = 2

const MAP_AUSTIN = '/map-search?lat=30.2672&lng=-97.7431&zoom=12&label=Austin%2C%20TX'

/**
 * The onboarding walkthrough and the cookie banner both dim or cover the UI.
 * Both must go before any capture, and the walkthrough can re-arm on route
 * changes, so this runs on every page rather than once at login.
 */
async function dismissOverlays(page) {
  for (const label of ['Essential only', 'Accept all']) {
    const btn = page.locator(`button:has-text("${label}")`).first()
    if (await btn.isVisible({ timeout: 800 }).catch(() => false)) {
      await btn.click().catch(() => {})
      await page.waitForTimeout(250)
      break
    }
  }

  for (let i = 0; i < 4; i++) {
    const skip = page
      .locator('[role="dialog"] button:has-text("Skip"), button:has-text("Skip")')
      .first()
    if (await skip.isVisible({ timeout: 600 }).catch(() => false)) {
      await skip.click().catch(() => {})
      await page.waitForTimeout(350)
      continue
    }
    break
  }

  await page.keyboard.press('Escape').catch(() => {})
  await page.addStyleTag({
    content: `
      [class*="cookie-banner"], [class*="CookieBanner"],
      [class*="cookie-consent"], [class*="CookieConsent"],
      [id*="cookie-banner"], [id*="cookie-consent"],
      [class*="consent-banner"],
      iframe[title*="Intercom"], .intercom-lightweight-app, [id*="intercom"] {
        display: none !important;
      }
    `,
  })
  await page.waitForTimeout(200)
}

/**
 * Scroll a labelled section to the top of the viewport.
 *
 * scrollIntoViewIfNeeded() is a no-op whenever Playwright considers the element
 * already reachable, which silently leaves the capture at the top of the page.
 * Driving scrollIntoView() on the node itself also handles inner scrollers.
 */
async function scrollToAnchor(page, selector, offset = -120) {
  const handle = await page.locator(selector).first().elementHandle().catch(() => null)
  if (!handle) {
    console.log(`   ⚠ anchor ${selector} not found`)
    return false
  }
  // Absolute scrollTo, not scrollIntoView + scrollBy: on pages that scroll an
  // inner container, scrollIntoView moves that container while the follow-up
  // scrollBy silently applies to the window, so the offset never lands.
  await handle.evaluate((el, off) => {
    const top = el.getBoundingClientRect().top + window.scrollY + off
    window.scrollTo({ top: Math.max(0, top), behavior: 'instant' })
  }, offset)
  await page.waitForTimeout(1000)
  const scrolled = await page.evaluate(() => Math.round(window.scrollY))
  console.log(`   ↧ ${selector} → scrollY=${scrolled}`)
  return true
}

async function waitQuiet(page, ms = 1500) {
  await page.waitForLoadState('networkidle').catch(() => {})
  await page.waitForTimeout(ms)
}

async function clickFirst(page, selectors, timeout = 2500) {
  for (const sel of selectors) {
    const loc = page.locator(sel).first()
    if (await loc.isVisible({ timeout }).catch(() => false)) {
      await loc.click().catch(() => {})
      return true
    }
  }
  return false
}

const wanted = (...names) => !ONLY || names.some((n) => ONLY.includes(n))

async function save(page, filename) {
  if (!wanted(filename)) return
  await dismissOverlays(page)
  const filepath = path.join(OUT_DIR, filename)
  await page.screenshot({ path: filepath, fullPage: false, type: 'png' })
  const kb = (fs.statSync(filepath).size / 1024).toFixed(0)
  console.log(`   ✓ ${filename} (${kb} KB)`)
}

async function login(page) {
  console.log('   → Logging in…')
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' })
  await waitQuiet(page, 1000)
  await dismissOverlays(page)

  const email = page.locator('input[type="email"], input[name="email"]').first()
  if (!(await email.isVisible({ timeout: 8000 }).catch(() => false))) {
    console.log('   ✗ Email field not found')
    return false
  }

  await email.fill(DEMO_EMAIL)
  await page.locator('input[type="password"], input[name="password"]').first().fill(DEMO_PASSWORD)

  // Scope to the credentials form: a bare :has-text("Sign In") also matches
  // the "Sign in with Apple" SSO button, which navigates to appleid.apple.com.
  const form = page.locator('form').filter({ has: page.locator('input[type="password"]') }).first()
  await form.locator('button[type="submit"]').first().click()

  await Promise.race([
    page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 25000 }),
    page.waitForSelector('text=Invalid', { timeout: 12000 }),
  ]).catch(() => {})

  if (page.url().includes('/login')) {
    console.log('   ✗ Login failed')
    return false
  }
  console.log(`   ✓ Logged in → ${new URL(page.url()).pathname}`)
  await waitQuiet(page, 1200)
  await dismissOverlays(page)
  return true
}

/**
 * Async panels render skeleton rows before real data arrives, and a slow
 * upstream can land on "Unable to Load Property". Both produce a screenshot
 * that looks broken, so wait the placeholders out and retry the error state.
 */
async function settleData(page, loadingTexts, timeout = 180000) {
  const start = Date.now()
  const deadline = start + timeout
  let reloaded = false
  while (Date.now() < deadline) {
    // Comps occasionally stall behind a slow provider; one reload past the
    // halfway mark is cheaper than shipping a skeleton screenshot.
    if (!reloaded && Date.now() - start > timeout / 2) {
      reloaded = true
      console.log('   ↻ reloading (data still pending)')
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(5000)
      await dismissOverlays(page)
    }
    const failed = await page
      .locator('text=Unable to Load Property')
      .first()
      .isVisible({ timeout: 500 })
      .catch(() => false)
    if (failed) {
      console.log('   ↻ retrying (property load failed)')
      const retry = page.locator('button:has-text("Retry")').first()
      if (await retry.isVisible({ timeout: 1000 }).catch(() => false)) {
        await retry.click().catch(() => {})
      } else {
        await page.reload({ waitUntil: 'domcontentloaded' })
      }
      await page.waitForTimeout(6000)
      continue
    }

    let stillLoading = false
    for (const text of loadingTexts) {
      if (
        await page
          .locator(`text=${text}`)
          .first()
          .isVisible({ timeout: 400 })
          .catch(() => false)
      ) {
        stillLoading = true
        break
      }
    }
    if (!stillLoading) return true
    await page.waitForTimeout(1500)
  }
  return false
}

async function openAnalysis(page, route, waitTexts, loadingTexts = [], timeout = 60000) {
  const url = `${BASE_URL}${route}?address=${encodeURIComponent(DEMO_ADDRESS)}`
  console.log(`   → ${url}`)
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  let found = false
  for (const text of waitTexts) {
    found = await page
      .waitForSelector(`text=${text}`, { timeout: found ? 4000 : timeout })
      .then(() => true)
      .catch(() => false)
    if (found) break
  }
  const settled = await settleData(page, ['Unable to Load Property', ...loadingTexts])
  await waitQuiet(page, 2500)
  await dismissOverlays(page)
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(500)
  console.log(
    settled && found ? '   ✓ data loaded' : `   ⚠ found=${found} settled=${settled}`,
  )
  return found && settled
}

async function openMap(page, pathAndQuery) {
  console.log(`   → ${pathAndQuery}`)
  await page.goto(`${BASE_URL}${pathAndQuery}`, { waitUntil: 'domcontentloaded' })
  await waitQuiet(page, 4000)
  await dismissOverlays(page)
  await page
    .waitForSelector('canvas, [class*="mapbox"], [class*="MapSearch"]', { timeout: 20000 })
    .catch(() => {})
  await page.waitForTimeout(3000)
}

async function captureHeroAndVerdict(page) {
  console.log('\n   [01 + 03] Discovery verdict (desktop)')
  await openAnalysis(page, '/discovery', ['Target Buy', 'Deal Gap'])

  // Anchor on the verdict rather than the top of the page: a listing with a
  // large photo gallery pushes the valuation cards below the fold, and a hero
  // of listing photos says "portal", not "analysis tool".
  await scrollToAnchor(page, 'text=Investment Overview', -85)
  await save(page, '01-hero.png')

  // 01 and 03 must not be the same frame; 03 carries the ways to close the gap.
  await scrollToAnchor(page, 'text=WAYS TO MAKE THIS WORK', -230)
  await save(page, '03-verdict.png')
}

async function captureSearchMap(page) {
  console.log('\n   [02] Color-coded map')
  await openMap(page, MAP_AUSTIN)
  await save(page, '02-search.png')
}

async function capturePillsList(page) {
  console.log('\n   [04] Scored opportunity list')
  await openMap(page, MAP_AUSTIN)
  const switched = await clickFirst(
    page,
    [
      'button[aria-label="List and download view"]',
      'button[aria-label*="List" i]',
      'button:has-text("List")',
    ],
    4000,
  )
  if (switched) await page.waitForTimeout(2500)
  await save(page, '04-pills.png')
}

async function captureCoverage(page) {
  console.log('\n   [05] Distressed coverage')
  await openMap(page, MAP_AUSTIN)
  for (const label of ['Foreclosure', 'Auction', 'Pre-Foreclosure']) {
    await clickFirst(page, [`button:has-text("${label}")`], 1500)
    await page.waitForTimeout(400)
  }
  await page.waitForTimeout(3500)
  await save(page, '05-coverage.png')
}

/** Select a strategy pill inside Deal Maker (Long-term, BRRRR, Wholesale, …). */
async function selectStrategy(page, label) {
  const pill = page.locator(`button:has-text("${label}")`).first()
  if (await pill.isVisible({ timeout: 4000 }).catch(() => false)) {
    await pill.click().catch(() => {})
    await page.waitForTimeout(3000)
    return true
  }
  console.log(`   ⚠ strategy pill "${label}" not found`)
  return false
}

async function captureBrrrr(page) {
  console.log('\n   [09] Deal Maker — BRRRR')
  await openAnalysis(page, '/deal-maker', ['Cash Flow', 'Purchase', 'ARV'], ['Loading'])
  await selectStrategy(page, 'BRRRR')
  await save(page, '09-brrrr.png')
}

async function captureWholesale(page) {
  console.log('\n   [10] Deal Maker — Wholesale')
  await openAnalysis(page, '/deal-maker', ['Cash Flow', 'Purchase', 'ARV'], ['Loading'])
  await selectStrategy(page, 'Wholesale')
  await save(page, '10-wholesale.png')
}

async function captureEstimator(page) {
  console.log('\n   [11] Rehab Estimator')
  await openAnalysis(page, '/rehab', ['Rehab Estimator', 'Cost Breakdown', 'Quick Estimate'], [])
  // The itemised Cost Breakdown is the payoff; the panels above it are setup.
  // Anchored on the section's own checkbox hint. The prose above it both names
  // "Cost Breakdown" in a <strong> and contains "in your estimate", so those
  // match first and land the capture on the verification list instead.
  await scrollToAnchor(page, 'text=Uncheck to remove', -170)
  await save(page, '11-estimator.png')
}

async function captureStrategyWorkbench(page) {
  console.log('\n   [12] Strategy Workbench')
  await openAnalysis(page, '/strategy', ['Strategy Workbench', 'PICK AN OPTION', 'Cap Rate'], [])
  await page.evaluate(() => window.scrollBy(0, 230))
  await page.waitForTimeout(900)
  await save(page, '12-strategy.png')
}

async function captureDirectory(page, route, filename, waitText, label, scrollY = 0) {
  console.log(`\n   [${label}] ${route}`)
  await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' })
  const ok = await page
    .waitForSelector(`text=${waitText}`, { timeout: 45000 })
    .then(() => true)
    .catch(() => false)
  await waitQuiet(page, 2500)
  await dismissOverlays(page)
  // Scroll past the page's own hero copy so the listing cards — the reason to
  // subscribe — land inside the cropped band instead of below it.
  await page.evaluate((y) => window.scrollTo(0, y), scrollY)
  await page.waitForTimeout(900)
  console.log(ok ? '   ✓ loaded' : '   ⚠ marker not found')
  await save(page, filename)
}

async function captureDashboard(page) {
  console.log('\n   [15] Dashboard pipeline')
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' })
  await page
    .waitForSelector('text=PIPELINE', { timeout: 45000 })
    .catch(() => {})
  await waitQuiet(page, 3000)
  await dismissOverlays(page)
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(600)
  await save(page, '15-dashboard.png')
}

async function captureComps(page) {
  console.log('\n   [06] Comps / Price Intel')
  // Reached via the in-app tab rather than a direct /price-intel URL: the tab
  // carries the analysis context, and deep-linking cold leaves the valuation
  // panels waiting on data that never arrives.
  await openAnalysis(page, '/discovery', ['Target Buy', 'Deal Gap'])
  const tab = page.locator('a:has-text("Comps"), button:has-text("Comps")').first()
  if (await tab.isVisible({ timeout: 3000 }).catch(() => false)) {
    await tab.click().catch(() => {})
    await page.waitForTimeout(4000)
  }
  await settleData(page, ['Loading comps', 'Loading comparable sales'], 90000)
  await dismissOverlays(page)
  const consensus = page.locator('text=Market Consensus').first()
  if (!(await consensus.isVisible({ timeout: 2000 }).catch(() => false))) {
    console.log('   ✗ Market Consensus absent — keeping previous plate')
    return
  }
  await consensus.scrollIntoViewIfNeeded()
  await page.evaluate(() => window.scrollBy(0, -150))
  await page.waitForTimeout(1500)
  await save(page, '06-comps.png')
}

async function captureDealMaker(page) {
  console.log('\n   [07] Deal Maker')
  await openAnalysis(
    page,
    '/deal-maker',
    ['Cash Flow', 'Purchase', 'Rehab', 'ARV'],
    ['Loading'],
  )
  await save(page, '07-dealmaker.png')
}

async function captureHeatmap(page) {
  console.log('\n   [08] Neighborhood density')
  await openMap(page, '/map-search?lat=30.2672&lng=-97.7431&zoom=11&label=Austin%2C%20TX')
  await save(page, '08-heatmap.png')
}

async function main() {
  console.log('\nDealGapIQ Mac desktop screenshot capture')
  console.log(`   Output:   ${OUT_DIR}`)
  console.log(`   Base URL: ${BASE_URL}`)
  console.log(`   Address:  ${DEMO_ADDRESS}`)
  console.log(`   Plates:   ${VIEWPORT.width * DEVICE_SCALE}×${VIEWPORT.height * DEVICE_SCALE}`)

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
    screen: VIEWPORT,
  })
  const page = await context.newPage()

  if (!(await login(page))) {
    console.log('\n   ⚠ Continuing without auth — gated screens may show paywalls.')
  }

  if (wanted('01-hero.png', '03-verdict.png')) await captureHeroAndVerdict(page)
  if (wanted('02-search.png')) await captureSearchMap(page)
  if (wanted('04-pills.png')) await capturePillsList(page)
  if (wanted('05-coverage.png')) await captureCoverage(page)
  if (wanted('06-comps.png')) await captureComps(page)
  if (wanted('07-dealmaker.png')) await captureDealMaker(page)
  if (wanted('08-heatmap.png')) await captureHeatmap(page)
  if (wanted('09-brrrr.png')) await captureBrrrr(page)
  if (wanted('10-wholesale.png')) await captureWholesale(page)
  if (wanted('11-estimator.png')) await captureEstimator(page)
  if (wanted('12-strategy.png')) await captureStrategyWorkbench(page)
  if (wanted('13-lenders.png')) {
    await captureDirectory(page, '/lenders', '13-lenders.png', 'Lender Directory', '13', 300)
  }
  if (wanted('14-buyers.png')) {
    await captureDirectory(page, '/directory', '14-buyers.png', 'Cash Buyer', '14', 300)
  }
  if (wanted('15-dashboard.png')) await captureDashboard(page)

  await browser.close()

  const files = fs.readdirSync(OUT_DIR).filter((f) => f.endsWith('.png'))
  console.log(`\nSaved ${files.length} desktop plates to:\n   ${OUT_DIR}\n`)
  console.log('Next: python3 frontend/public/app-store/connect/apply_mac_screenshot_brand.py')
}

main().catch((err) => {
  console.error('\nFatal error:', err)
  process.exit(1)
})
