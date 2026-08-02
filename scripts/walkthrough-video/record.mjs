/**
 * Record live sales-demo scenes against production.
 * Uses interval screenshots + system ffmpeg (avoids Playwright recordVideo/ffmpeg-mac issues).
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
const CAPTURE_MS = 400;
const FPS = 1000 / CAPTURE_MS; // 2.5

async function dismissTour(page) {
  // Workbench tour welcome dialog (z-[10000]) intercepts all pointer events
  const dialog = page.locator('[role="dialog"][aria-labelledby*="workbench-tour"]');
  if (await dialog.isVisible({ timeout: 2500 }).catch(() => false)) {
    const skip = dialog.locator('button:has-text("Skip")').first();
    if (await skip.isVisible({ timeout: 1000 }).catch(() => false)) {
      await skip.click().catch(() => {});
    } else {
      await page.keyboard.press('Escape').catch(() => {});
    }
    await page.waitForTimeout(600);
  }
}

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
  await dismissTour(page);
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
  // Only the credentials form uses type="submit" — "Sign in with Apple" /
  // "Continue with Google" are type="button" and must not be matched
  await page.locator('button[type="submit"]').first().click();
  try {
    await page.waitForURL(
      (url) => url.hostname.endsWith('dealgapiq.com') && !url.pathname.includes('/login'),
      { timeout: 20000 },
    );
    // Let the /auth/authorize token exchange finish before trusting the session
    await page
      .waitForURL((url) => !url.pathname.startsWith('/auth'), { timeout: 15000 })
      .catch(() => {});
    await page.waitForTimeout(1500);
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

function resolveBrowserExecutable() {
  const candidates = [
    '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    path.join(
      process.env.HOME || '',
      'Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
    ),
  ];
  return candidates.find((p) => {
    if (!fs.existsSync(p)) return false;
    if (p.includes('Chrome for Testing')) {
      return fs.existsSync(
        path.join(path.dirname(p), '../Frameworks/Google Chrome for Testing Framework.framework'),
      );
    }
    return true;
  });
}

async function recordScene(browser, storageStatePath, scene, action, targetSec) {
  const framesDir = path.join(SCENES_DIR, `_frames_${scene.id}`);
  fs.rmSync(framesDir, { recursive: true, force: true });
  fs.mkdirSync(framesDir, { recursive: true });

  const context = await browser.newContext({
    viewport: VIEWPORT,
    colorScheme: 'dark',
    storageState: storageStatePath,
  });
  const page = await context.newPage();

  let capturing = true;
  let frame = 0;
  const captureLoop = (async () => {
    while (capturing) {
      try {
        if (!page.isClosed()) {
          const fp = path.join(framesDir, `f${String(frame).padStart(5, '0')}.jpg`);
          await page.screenshot({ path: fp, type: 'jpeg', quality: 78 });
          frame += 1;
        }
      } catch {
        // ignore navigation races
      }
      await sleep(CAPTURE_MS);
    }
  })();

  const started = Date.now();
  try {
    await action(page);
    const elapsed = (Date.now() - started) / 1000;
    if (elapsed < targetSec) await sleep((targetSec - elapsed) * 1000);
  } finally {
    capturing = false;
    await captureLoop;
    try {
      if (!page.isClosed()) {
        const fp = path.join(framesDir, `f${String(frame).padStart(5, '0')}.jpg`);
        await page.screenshot({ path: fp, type: 'jpeg', quality: 78 });
        frame += 1;
      }
    } catch {
      // ignore
    }
    await context.close();
  }

  const needed = Math.max(frame, Math.ceil(targetSec * FPS));
  if (frame === 0) throw new Error(`No frames captured for ${scene.id}`);
  const last = path.join(framesDir, `f${String(frame - 1).padStart(5, '0')}.jpg`);
  while (frame < needed) {
    fs.copyFileSync(last, path.join(framesDir, `f${String(frame).padStart(5, '0')}.jpg`));
    frame += 1;
  }

  const dest = path.join(SCENES_DIR, `${scene.id}.mp4`);
  execSync(
    [
      'ffmpeg -y',
      `-framerate ${FPS}`,
      `-i "${path.join(framesDir, 'f%05d.jpg')}"`,
      '-c:v libx264 -pix_fmt yuv420p -preset fast -crf 20',
      `"${dest}"`,
    ].join(' '),
    { stdio: 'pipe' },
  );
  fs.rmSync(framesDir, { recursive: true, force: true });
  console.log(`   ✓ ${scene.id}.mp4 (${frame} frames)`);
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

  const executablePath = resolveBrowserExecutable();
  if (!executablePath) {
    throw new Error(
      'No usable browser found. Install Brave/Chrome, or run: npx playwright install chromium',
    );
  }
  console.log(`   → Using browser: ${executablePath}`);

  const browser = await chromium.launch({
    headless: !HEADED,
    executablePath,
    args: ['--disable-web-security', '--autoplay-policy=no-user-gesture-required'],
  });

  const warm = await browser.newContext({ viewport: VIEWPORT, colorScheme: 'dark' });
  const warmPage = await warm.newPage();
  const ok = await login(warmPage);
  const statePath = path.join(SCENES_DIR, '_storage.json');
  if (ok) {
    // Save state only after an authenticated verdict has rendered, so scene
    // contexts inherit the full session (and the dismissed-tour flag)
    await waitForVerdict(warmPage);
    await dismissTour(warmPage);
    await warm.storageState({ path: statePath });
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
