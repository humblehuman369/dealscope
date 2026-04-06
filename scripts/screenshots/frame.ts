/**
 * App Store Marketing Screenshot Framer
 *
 * Takes raw screenshots from capture.ts and adds:
 *   - Background gradient matching the DealGapIQ brand
 *   - Marketing headline text above each screenshot
 *   - Rounded corners and drop shadow on the screenshot
 *
 * Usage:
 *   npx tsx scripts/screenshots/frame.ts
 *   npx tsx scripts/screenshots/frame.ts --device ipad
 *
 * Requires: sharp (npm i -D sharp)
 */

import sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DEVICE_PROFILES = {
  'iphone-6.7': {
    folder: 'iphone-6.7',
    canvasWidth: 1290,
    canvasHeight: 2796,
    screenshotScale: 0.72,
    headlineSize: 80,
    sublineSize: 42,
    headlineY: 180,
    sublineY: 290,
    screenshotY: 440,
    cornerRadius: 60,
  },
  'iphone-6.5': {
    folder: 'iphone-6.5',
    canvasWidth: 1242,
    canvasHeight: 2688,
    screenshotScale: 0.72,
    headlineSize: 76,
    sublineSize: 40,
    headlineY: 170,
    sublineY: 275,
    screenshotY: 420,
    cornerRadius: 56,
  },
  ipad: {
    folder: 'ipad-12.9',
    canvasWidth: 2048,
    canvasHeight: 2732,
    screenshotScale: 0.82,
    headlineSize: 100,
    sublineSize: 50,
    headlineY: 140,
    sublineY: 270,
    screenshotY: 380,
    cornerRadius: 40,
  },
  android: {
    folder: 'android-phone',
    canvasWidth: 1236,
    canvasHeight: 2745,
    screenshotScale: 0.72,
    headlineSize: 78,
    sublineSize: 42,
    headlineY: 180,
    sublineY: 285,
    screenshotY: 430,
    cornerRadius: 56,
  },
} as const;

type DeviceKey = keyof typeof DEVICE_PROFILES;

const selectedDevice: DeviceKey = (() => {
  const idx = process.argv.indexOf('--device');
  if (idx !== -1) return (process.argv[idx + 1] as DeviceKey) || 'iphone-6.7';
  return 'iphone-6.7';
})();

const profile = DEVICE_PROFILES[selectedDevice];

const INPUT_DIR = path.resolve(__dirname, 'output', profile.folder);
const OUTPUT_DIR = path.resolve(__dirname, 'output', `${profile.folder}-framed`);

// DealGapIQ brand colors
const BRAND = {
  bgGradientStart: '#000000',
  bgGradientEnd: '#0C1220',
  accentBlue: '#0EA5E9',
  textWhite: '#F1F5F9',
  textSecondary: '#94A3B8',
};

// Marketing copy for each screenshot
const FRAME_CONFIG = [
  {
    input: '01_login.png',
    output: '01_login_framed.png',
    headline: 'Know Before You Buy',
    subline: 'Real estate investment analysis in seconds',
  },
  {
    input: '02_search.png',
    output: '02_search_framed.png',
    headline: 'Search Any Property',
    subline: 'Enter an address. Get an instant verdict.',
  },
  {
    input: '03_verdict.png',
    output: '03_verdict_framed.png',
    headline: 'See the Deal Gap',
    subline: 'Target Buy, Income Value, and Market Price — instantly',
  },
  {
    input: '04_verdict_insights.png',
    output: '04_verdict_insights_framed.png',
    headline: 'Know What It Takes',
    subline: 'Key insights and probability of landing the deal',
  },
  {
    input: '05_strategy.png',
    output: '05_strategy_framed.png',
    headline: '6 Strategies Ranked',
    subline: 'See which approach works best for every property',
  },
  {
    input: '06_strategy_detail.png',
    output: '06_strategy_detail_framed.png',
    headline: 'See the Numbers',
    subline: 'Cash flow, cap rate, DSCR — every metric that matters',
  },
  {
    input: '07_deal_maker.png',
    output: '07_deal_maker_framed.png',
    headline: 'Make It Your Deal',
    subline: 'Adjust any assumption. Watch the score update live.',
  },
  {
    input: '08_deal_vault.png',
    output: '08_deal_vault_framed.png',
    headline: 'Save & Track Deals',
    subline: 'Build your pipeline. Revisit analyses anytime.',
  },
  {
    input: '09_search_history.png',
    output: '09_search_history_framed.png',
    headline: 'Your Pipeline',
    subline: 'Every property you\'ve analyzed, one tap away.',
  },
  {
    input: '10_profile.png',
    output: '10_profile_framed.png',
    headline: 'Pro Investor Tools',
    subline: 'Unlimited analyses, full breakdowns, saved deals.',
  },
];

// ---------------------------------------------------------------------------
// SVG generators
// ---------------------------------------------------------------------------

function createBackgroundSvg(width: number, height: number): Buffer {
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${BRAND.bgGradientStart}" />
          <stop offset="60%" stop-color="${BRAND.bgGradientEnd}" />
          <stop offset="100%" stop-color="${BRAND.bgGradientStart}" />
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="25%" r="60%">
          <stop offset="0%" stop-color="${BRAND.accentBlue}" stop-opacity="0.08" />
          <stop offset="100%" stop-color="${BRAND.accentBlue}" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#bg)" />
      <rect width="${width}" height="${height}" fill="url(#glow)" />
    </svg>`;
  return Buffer.from(svg);
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function createTextSvg(
  width: number,
  headline: string,
  subline: string,
  headlineY: number,
  sublineY: number,
  headlineSize: number,
  sublineSize: number,
): Buffer {
  const h = escapeXml(headline);
  const s = escapeXml(subline);
  const svg = `
    <svg width="${width}" height="${sublineY + sublineSize + 40}" xmlns="http://www.w3.org/2000/svg">
      <text
        x="${width / 2}" y="${headlineY}"
        text-anchor="middle"
        font-family="SF Pro Display, -apple-system, system-ui, Helvetica Neue, Arial, sans-serif"
        font-size="${headlineSize}" font-weight="700"
        fill="${BRAND.textWhite}"
        letter-spacing="-1"
      >${h}</text>
      <text
        x="${width / 2}" y="${sublineY}"
        text-anchor="middle"
        font-family="SF Pro Text, -apple-system, system-ui, Helvetica Neue, Arial, sans-serif"
        font-size="${sublineSize}" font-weight="400"
        fill="${BRAND.textSecondary}"
      >${s}</text>
    </svg>`;
  return Buffer.from(svg);
}

function createRoundedMask(width: number, height: number, radius: number): Buffer {
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" rx="${radius}" ry="${radius}" fill="white" />
    </svg>`;
  return Buffer.from(svg);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`\n🖼️  DealGapIQ Screenshot Framer`);
  console.log(`   Input:   ${INPUT_DIR}`);
  console.log(`   Output:  ${OUTPUT_DIR}`);
  console.log(`   Canvas:  ${profile.canvasWidth}x${profile.canvasHeight}\n`);

  if (!fs.existsSync(INPUT_DIR)) {
    console.error(`   ✗ Input directory not found. Run capture.ts first.\n`);
    process.exit(1);
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const background = createBackgroundSvg(profile.canvasWidth, profile.canvasHeight);

  for (const config of FRAME_CONFIG) {
    const inputPath = path.join(INPUT_DIR, config.input);

    if (!fs.existsSync(inputPath)) {
      console.log(`   ⏭  Skipping ${config.input} (not found)`);
      continue;
    }

    console.log(`   Framing: ${config.input} → ${config.output}`);

    const rawScreenshot = sharp(inputPath);
    const metadata = await rawScreenshot.metadata();
    if (!metadata.width || !metadata.height) continue;

    // Scale the screenshot to fit within the canvas
    const scaledWidth = Math.round(profile.canvasWidth * profile.screenshotScale);
    const scaledHeight = Math.round(
      (metadata.height / metadata.width) * scaledWidth,
    );
    const screenshotX = Math.round((profile.canvasWidth - scaledWidth) / 2);

    // Apply rounded corners to the screenshot
    const mask = createRoundedMask(scaledWidth, scaledHeight, profile.cornerRadius);
    const roundedScreenshot = await sharp(inputPath)
      .resize(scaledWidth, scaledHeight, { fit: 'cover' })
      .composite([{ input: mask, blend: 'dest-in' }])
      .png()
      .toBuffer();

    // Create text overlay
    const textOverlay = createTextSvg(
      profile.canvasWidth,
      config.headline,
      config.subline,
      profile.headlineY,
      profile.sublineY,
      profile.headlineSize,
      profile.sublineSize,
    );

    // Compose: background + text + rounded screenshot
    const outputPath = path.join(OUTPUT_DIR, config.output);
    await sharp(background)
      .resize(profile.canvasWidth, profile.canvasHeight)
      .composite([
        { input: textOverlay, top: 0, left: 0 },
        { input: roundedScreenshot, top: profile.screenshotY, left: screenshotX },
      ])
      .png({ compressionLevel: 6 })
      .toFile(outputPath);

    const stats = fs.statSync(outputPath);
    console.log(`   ✓ ${config.output} (${(stats.size / 1024).toFixed(0)} KB)\n`);
  }

  console.log(`✅ Framed screenshots saved to:\n   ${OUTPUT_DIR}\n`);
  console.log(`📋 Upload to App Store Connect → Media Manager:`);
  console.log(`   1. Select your app → App Store tab`);
  console.log(`   2. Scroll to "Screenshots" section`);
  console.log(`   3. Choose "${DEVICE_PROFILES[selectedDevice].folder}" display size`);
  console.log(`   4. Drag & drop the framed PNGs\n`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
