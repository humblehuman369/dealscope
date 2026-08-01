/**
 * Record live sales-demo scenes against production.
 *
 *   node scripts/walkthrough-video/record.mjs
 *   node scripts/walkthrough-video/record.mjs --base-url https://dealgapiq.com --headed
 *   node scripts/walkthrough-video/record.mjs --scene 03-verdict
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { loadWalkthroughEnv, loadScenes, SCENES_DIR } from './loadEnv.mjs';

loadWalkthroughEnv();

const args = process.argv.slice(2);
const getArg = (name) => {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? args[idx + 1] : undefined;
};
const hasFlag = (name) => args.includes(`--${name}`);

const BASE_URL = getArg('base-url') ?? 'https://dealgapiq.com';
const HEADED = hasFlag('headed');
const SCENE_FILTER = getArg('scene');
const DEMO_EMAIL = getArg('email') ?? process.env.DEMO_EMAIL ?? 'review@dealgapiq.com';
const DEMO_PASSWORD = getArg('password') ?? process.env.DEMO_PASSWORD ?? 'Review$1234';
const DEMO_ADDRESS = getArg('address') ?? '4407 Deer Creek Blvd, Austin, TX 78757';
const VIEWPORT = { width: 1920, height: 1080 };

async function dismissChrome(page) {
  try {
    const accept = page.locator('button:has-text("Accept all"), button:has-text("Accept")').first();
    if (await accept.isVisible({ timeout: 2500 }).catch(() => false)) {
      await accept.click();
      await page.waitForTimeout(400);
    }
  } catch {
    // ignore
  }
  await page
    .addStyleTag({
      content: `[class*="cookie"], [id*="cookie"], [class*="consent"] { display: none !important; }`,
    })
    .catch(() => {});
}

async function login(page) {
  console.log('   → Logging in...');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await dismissChrome(page);

  const email = page.locator('input[type="email"], input[name="email"]').first();
  const password = page.locator('input[type="password"]').first();
  if (!(await email.isVisible({ timeout: 8000 }).catch(() => false))) {
    console.log('   ✗ Email input not found');
    return false;
  }
  await email.fill(DEMO_EMAIL);
  await password.fill(DEMO_PASSWORD);
  await page.locator('button:has-text("Sign In"), button:has-text("Log In"), button[type="submit"]').first().click();
  try {
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20000 });
    console.log(`   ✓ Logged in → ${new URL(page.url()).pathname}`);
    return true;
  } catch {
    if (!page.url().includes('/login')) return true;
    console.log('   ✗ Login failed');
    return false;
  }
}

async function waitForVerdict(page) {
  const encoded = encodeURIComponent(DEMO_ADDRESS);
  await page.goto(`${BASE_URL}/discovery?address=${encoded}`, { waitUntil: 'domcontentloaded' });
  console.log('   → Waiting for Verdict...');
  try {
    await page.waitForSelector('text=Deal Gap', { timeout: 60000 });
  } catch {
    await page.waitForSelector('text=Target Buy', { timeout: 10000 }).catch(() => {});
  }
  await page.waitForTimeout(1500);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function recordScene(browser, storageStatePath, scene, action, targetSec) {
  const sceneDir = path.join(SCENES_DIR, `_rec_${scene.id}`);
  fs.rmSync(sceneDir, { recursive: true, force: true });
  fs.mkdirSync(sceneDir, { recursive: true });

  const context = await browser.newContext({
    viewport: VIEWPORT,
    colorScheme: 'dark',
    recordVideo: { dir: sceneDir, size: VIEWPORT },
    storageState: storageStatePath,
  });
  const page = await context.newPage();
  const started = Date.now();
  try {
    await action(page);
    const elapsed = (Date.now() - started) / 1000;
    if (elapsed < targetSec) await sleep((targetSec - elapsed) * 1000);
  } finally {
    await page.close();
    await context.close();
  }

  const webm = fs.readdirSync(sceneDir).find((f) => f.endsWith('.webm'));
  if (!webm) throw new Error(`No webm recorded for ${scene.id}`);
  const src = path.join(sceneDir, webm);
  const dest = path.join(SCENES_DIR, `${scene.id}.mp4`);
  execSync(`ffmpeg -y -i "${src}" -c:v libx264 -pix_fmt yuv420p -an "${dest}"`, { stdio: 'pipe' });
  fs.rmSync(sceneDir, { recursive: true, force: true });
  console.log(`   ✓ ${scene.id}.mp4`);
}

async function sceneHook(page) {
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await dismissChrome(page);
  await sleep(2000);
  const mapBtn = page.locator('a:has-text("Map"), button:has-text("Map"), a[href*="map-search"]').first();
  if (await mapBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await mapBtn.hover().catch(() => {});
    await sleep(1500);
  }
  const scanBtn = page.locator('button:has-text("Scan"), a:has-text("Scan")').first();
  if (await scanBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
    await scanBtn.hover().catch(() => {});
    await sleep(1500);
  }
  const search = page.locator('input[placeholder*="address" i], input[placeholder*="search" i]').first();
  if (await search.isVisible({ timeout: 2000 }).catch(() => false)) {
    await search.click();
    await sleep(800);
    await search.fill(DEMO_ADDRESS.slice(0, 12));
    await sleep(1200);
  } else {
    const trigger = page.locator('button:has-text("Property Search"), button:has-text("Enter Address")').first();
    if (await trigger.isVisible({ timeout: 2000 }).catch(() => false)) {
      await trigger.click();
      await sleep(1000);
    }
  }
  await sleep(3000);
}

async function sceneAnalyze(page) {
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await dismissChrome(page);
  await sleep(800);
  const search = page.locator('input[placeholder*="address" i], input[placeholder*="search" i]').first();
  if (await search.isVisible({ timeout: 2500 }).catch(() => false)) {
    await search.fill(DEMO_ADDRESS);
    await sleep(1000);
    await search.press('Enter').catch(() => {});
    await sleep(2000);
  }
  const encoded = encodeURIComponent(DEMO_ADDRESS);
  try {
    await page.goto(`${BASE_URL}/analyzing?address=${encoded}`, { waitUntil: 'domcontentloaded' });
  } catch {
    await page.goto(`${BASE_URL}/discovery?address=${encoded}`, { waitUntil: 'domcontentloaded' });
  }
  await sleep(4000);
  await page.goto(`${BASE_URL}/discovery?address=${encoded}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('text=Deal Gap', { timeout: 60000 }).catch(() => {});
  await sleep(2000);
}

async function sceneVerdict(page) {
  await waitForVerdict(page);
  await dismissChrome(page);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await sleep(2000);
  await page.evaluate(() => window.scrollBy({ top: 280, behavior: 'smooth' }));
  await sleep(2500);
  await page.evaluate(() => window.scrollBy({ top: 220, behavior: 'smooth' }));
  await sleep(2500);
}

async function sceneTrustStrategies(page) {
  await waitForVerdict(page);
  await dismissChrome(page);
  const iq = page.locator('button:has-text("IQ"), [aria-label*="estimate" i]').first();
  if (await iq.isVisible({ timeout: 3000 }).catch(() => false)) {
    await iq.click().catch(() => {});
    await sleep(2000);
    await page.keyboard.press('Escape').catch(() => {});
  }
  const strat = page.locator('text=Wholesale').first();
  if (await strat.isVisible({ timeout: 3000 }).catch(() => false)) {
    await strat.scrollIntoViewIfNeeded().catch(() => {});
  } else {
    await page.evaluate(() => window.scrollBy({ top: 900, behavior: 'smooth' }));
  }
  await sleep(4000);
  await page.evaluate(() => window.scrollBy({ top: 400, behavior: 'smooth' }));
  await sleep(3000);
}

async function sceneFourPaths(page) {
  await waitForVerdict(page);
  await dismissChrome(page);
  const paths = page.locator('text=Four Paths, text=Blended Plan').first();
  if (await paths.isVisible({ timeout: 5000 }).catch(() => false)) {
    await paths.scrollIntoViewIfNeeded();
  } else {
    await page.evaluate(() => window.scrollBy({ top: 1400, behavior: 'smooth' }));
  }
  await sleep(3000);
  const card = page.locator('button:has-text("Blended"), button:has-text("Path")').first();
  if (await card.isVisible({ timeout: 3000 }).catch(() => false)) {
    await card.click().catch(() => {});
  }
  await sleep(5000);
  await page.evaluate(() => window.scrollBy({ top: 300, behavior: 'smooth' }));
  await sleep(3000);
}

async function scenePitch(page) {
  await waitForVerdict(page);
  await dismissChrome(page);
  await page.evaluate(() => window.scrollBy({ top: 1600, behavior: 'smooth' }));
  await sleep(1500);
  const pitch = page
    .locator('button:has-text("Pitch"), button:has-text("Script"), button:has-text("View Script")')
    .first();
  if (await pitch.isVisible({ timeout: 5000 }).catch(() => false)) {
    await pitch.click();
    await sleep(5000);
    await page.keyboard.press('Escape').catch(() => {});
  } else {
    await page.evaluate(() => window.scrollBy({ top: 400, behavior: 'smooth' }));
    await sleep(6000);
  }
  await sleep(2000);
}

async function sceneDealMaker(page) {
  const encoded = encodeURIComponent(DEMO_ADDRESS);
  const urls = [
    `${BASE_URL}/deal-maker/${encoded}`,
    `${BASE_URL}/deal-maker?address=${encoded}`,
    `${BASE_URL}/strategy?address=${encoded}`,
  ];
  for (const url of urls) {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await sleep(2000);
    const slider = page.locator('input[type="range"]').first();
    if (await slider.isVisible({ timeout: 8000 }).catch(() => false)) {
      await dismissChrome(page);
      const box = await slider.boundingBox();
      if (box) {
        await page.mouse.click(box.x + box.width * 0.4, box.y + box.height / 2);
        await sleep(1200);
        await page.mouse.click(box.x + box.width * 0.55, box.y + box.height / 2);
        await sleep(1200);
        await page.mouse.click(box.x + box.width * 0.35, box.y + box.height / 2);
      }
      await sleep(4000);
      return;
    }
  }
  await sleep(5000);
}

async function sceneClose(page) {
  await page.goto(`${BASE_URL}/map-search`, { waitUntil: 'domcontentloaded' });
  await dismissChrome(page);
  await sleep(4000);
  await page.mouse.wheel(0, 200);
  await sleep(2000);
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await sleep(4000);
}

const ACTIONS = {
  '01-hook': sceneHook,
  '02-analyze': sceneAnalyze,
  '03-verdict': sceneVerdict,
  '04-trust-strategies': sceneTrustStrategies,
  '05-four-paths': sceneFourPaths,
  '06-pitch': scenePitch,
  '07-deal-maker': sceneDealMaker,
  '08-close': sceneClose,
};

async function main() {
  fs.mkdirSync(SCENES_DIR, { recursive: true });
  const scenes = loadScenes().filter((s) => !SCENE_FILTER || s.id === SCENE_FILTER);

  console.log(`\n🎬 DealGapIQ Sales Demo Recorder`);
  console.log(`   Base URL: ${BASE_URL}`);
  console.log(`   Address:  ${DEMO_ADDRESS}`);
  console.log(`   Scenes:   ${scenes.map((s) => s.id).join(', ')}\n`);

  const browser = await chromium.launch({
    headless: !HEADED,
    args: ['--disable-web-security'],
  });

  const warm = await browser.newContext({ viewport: VIEWPORT, colorScheme: 'dark' });
  const warmPage = await warm.newPage();
  const ok = await login(warmPage);
  const statePath = path.join(SCENES_DIR, '_storage.json');
  if (ok) {
    await warm.storageState({ path: statePath });
    await waitForVerdict(warmPage);
  } else {
    console.log('   ⚠ Continuing without auth — some scenes may be gated');
  }
  await warm.close();

  for (const scene of scenes) {
    const action = ACTIONS[scene.id];
    if (!action) throw new Error(`No action for ${scene.id}`);
    console.log(`\n   [${scene.id}] ${scene.caption}`);
    let target = scene.minDurationSec;
    const wav = path.join(SCENES_DIR, `${scene.id}.wav`);
    if (fs.existsSync(wav)) {
      try {
        const dur = execSync(
          `ffprobe -v error -show_entries format=duration -of csv=p=0 "${wav}"`,
          { encoding: 'utf8' },
        ).trim();
        target = Math.max(scene.minDurationSec, Math.ceil(parseFloat(dur) + 1));
      } catch {
        // keep min
      }
    }
    await recordScene(browser, ok ? statePath : undefined, scene, action, target);
  }

  await browser.close();
  console.log(`\n✅ Scene videos in ${SCENES_DIR}\n`);
}

main().catch((err) => {
  console.error('\nFatal:', err);
  process.exit(1);
});
