/**
 * Local-only Phase 1 screenshot bootstrap.
 * Sets cookie consent, then PostHog overrideFeatureFlags({ 'workflow-v1': true })
 * via window.__WORKFLOW_V1_OVERRIDE__ (development init in lib/posthog.ts).
 * No production bypass.
 */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire('/tmp/p1-10-a11y/package.json')
const chromeLauncher = require('chrome-launcher')
const puppeteer = require('puppeteer-core')

const OUT = process.argv[2] || path.resolve('docs/redesign/rollout-screenshots')
fs.mkdirSync(OUT, { recursive: true })

const ADDRESS = '1766 Wandering Willow Way, Loxahatchee, FL 33470'
const BASE = process.env.SCREENSHOT_BASE || 'http://localhost:3010/discovery'
const qs = `address=${encodeURIComponent(ADDRESS)}`

const STATES = [
  { name: 'discovery', path: `${BASE}?${qs}` },
  { name: 'math', path: `${BASE}?${qs}&view=math` },
  { name: 'plan-option-3', path: `${BASE}?${qs}&view=plan`, after: 'option3' },
  { name: 'plan-blend', path: `${BASE}?${qs}&view=plan`, after: 'blend' },
  { name: 'plan-tune-open', path: `${BASE}?${qs}&view=plan`, after: 'tune-open' },
  { name: 'plan-tune-closed', path: `${BASE}?${qs}&view=plan`, after: 'tune-closed' },
  { name: 'work-empty', path: `${BASE}?${qs}&view=work` },
]
const VIEWPORTS = [
  { name: '1280', width: 1280, height: 900 },
  { name: '390', width: 390, height: 844 },
]
const THEMES = ['dark', 'light']

async function bootstrapV1(page, theme) {
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: theme }])
  await page.evaluateOnNewDocument((next) => {
    localStorage.setItem('cookie_consent', 'all')
    localStorage.setItem('dealgapiq-theme-preference', next)
    window.__WORKFLOW_V1_OVERRIDE__ = true
  }, theme)
}

async function waitForV1(page) {
  await page.waitForFunction(
    () => {
      const tabs = [...document.querySelectorAll('[role=tab]')].map((t) => t.textContent || '')
      const v1Tabs = tabs.some((t) => /Plan/.test(t)) && tabs.some((t) => /Math/.test(t))
      const text = document.body.innerText
      return (
        v1Tabs ||
        text.includes('Worth pursuing') ||
        text.includes('Four levers') ||
        text.includes('Tune the numbers')
      )
    },
    { timeout: 60000 },
  )
}

async function afterState(page, after) {
  if (!after || after === 'option3') return
  if (after === 'blend') {
    const buttons = await page.$$('button')
    for (const btn of buttons) {
      const text = await page.evaluate((el) => (el.textContent || '').trim(), btn)
      if (/^Blend\b/i.test(text)) {
        await btn.click()
        await new Promise((r) => setTimeout(r, 1500))
        return
      }
    }
    return
  }
  if (after === 'tune-open' || after === 'tune-closed') {
    const buttons = await page.$$('button')
    for (const btn of buttons) {
      const text = await page.evaluate((el) => el.textContent || '', btn)
      if (text.trim() === 'Tune the numbers') {
        await btn.click()
        await new Promise((r) => setTimeout(r, 800))
        break
      }
    }
    if (after === 'tune-closed') {
      const again = await page.$$('button')
      for (const btn of again) {
        const text = await page.evaluate((el) => el.textContent || '', btn)
        if (text.trim() === 'Done' || text.trim() === 'Close') {
          await btn.click()
          await new Promise((r) => setTimeout(r, 500))
          break
        }
      }
    }
  }
}

const chrome = await chromeLauncher.launch({
  chromeFlags: ['--headless=new', '--disable-gpu', '--no-sandbox'],
})
const browser = await puppeteer.connect({
  browserURL: `http://127.0.0.1:${chrome.port}`,
  defaultViewport: null,
})

try {
  for (const theme of THEMES) {
    for (const viewport of VIEWPORTS) {
      for (const state of STATES) {
        const page = await browser.newPage()
        await page.setViewport({ width: viewport.width, height: viewport.height, deviceScaleFactor: 1 })
        await bootstrapV1(page, theme)
        await page.goto(state.path, { waitUntil: 'networkidle2', timeout: 90000 })
        await waitForV1(page).catch(() => {})
        await afterState(page, state.after)
        await new Promise((r) => setTimeout(r, 800))
        const file = path.join(OUT, `${state.name}-${theme}-${viewport.name}.png`)
        await page.screenshot({ path: file, fullPage: true })
        console.log('wrote', file)
        await page.close()
      }
    }
  }
} finally {
  await browser.disconnect()
  await chrome.kill()
}
