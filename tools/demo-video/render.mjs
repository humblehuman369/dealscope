/**
 * Renders scene.html frame-by-frame via Playwright and encodes an MP4
 * with the system ffmpeg.
 *
 * Usage (from repo root):
 *   node tools/demo-video/render.mjs            # full 60s render
 *   node tools/demo-video/render.mjs --preview  # 1 frame per second contact sheet
 */

import { chromium } from 'playwright';
import { execFileSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const FPS = 30;
const DUR = 60;
const PREVIEW = process.argv.includes('--preview');

const FRAMES_DIR = path.join(__dirname, PREVIEW ? 'frames-preview' : 'frames');
const OUT_DIR = path.join(__dirname, 'out');

async function main() {
  fs.rmSync(FRAMES_DIR, { recursive: true, force: true });
  fs.mkdirSync(FRAMES_DIR, { recursive: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  await page.goto('file://' + path.join(__dirname, 'scene.html'));
  await page.evaluate(() => window.readyPromise);
  await page.waitForTimeout(300);

  const total = PREVIEW ? DUR : DUR * FPS;
  const step = PREVIEW ? 1 : 1 / FPS;

  console.log(`rendering ${total} frames at ${PREVIEW ? '1fps (preview)' : FPS + 'fps'}...`);
  const t0 = Date.now();
  for (let f = 0; f < total; f++) {
    await page.evaluate((t) => window.seek(t), f * step);
    await page.screenshot({
      path: path.join(FRAMES_DIR, `f${String(f).padStart(4, '0')}.jpg`),
      type: 'jpeg',
      quality: 90,
    });
    if (f % 150 === 0) console.log(`  frame ${f}/${total} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  }
  await browser.close();
  console.log(`frames done in ${((Date.now() - t0) / 1000).toFixed(0)}s`);

  if (PREVIEW) {
    console.log(`preview frames → ${FRAMES_DIR}`);
    return;
  }

  const outFile = path.join(OUT_DIR, 'what-is-dealgapiq-v4.mp4');
  console.log('encoding mp4...');
  execFileSync('ffmpeg', [
    '-y',
    '-framerate', String(FPS),
    '-i', path.join(FRAMES_DIR, 'f%04d.jpg'),
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-crf', '23',
    '-preset', 'slow',
    '-movflags', '+faststart',
    outFile,
  ], { stdio: 'inherit' });

  const mb = (fs.statSync(outFile).size / 1024 / 1024).toFixed(1);
  console.log(`done → ${outFile} (${mb} MB)`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
