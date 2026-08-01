/**
 * Mux scene videos + ElevenLabs WAVs + caption overlays → sales-demo.mp4
 *
 *   node scripts/walkthrough-video/assemble.mjs
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { loadScenes, SCENES_DIR, OUTPUT_DIR } from './loadEnv.mjs';

function probeDuration(file) {
  const out = execSync(
    `ffprobe -v error -show_entries format=duration -of csv=p=0 "${file}"`,
    { encoding: 'utf8' },
  ).trim();
  return parseFloat(out);
}

function buildSceneClip(sceneId, _caption, workDir, minDurationSec = 0) {
  const videoIn = path.join(SCENES_DIR, `${sceneId}.mp4`);
  const audioIn = path.join(SCENES_DIR, `${sceneId}.wav`);
  if (!fs.existsSync(videoIn)) throw new Error(`Missing video: ${videoIn}`);
  if (!fs.existsSync(audioIn)) throw new Error(`Missing audio: ${audioIn}`);

  const audioDur = probeDuration(audioIn);
  const videoDur = probeDuration(videoIn);
  // Pad to scene budget so the cut lands near ~6 min even when VO is brisk
  const target = Math.max(audioDur + 0.35, minDurationSec, 1);
  const out = path.join(workDir, `${sceneId}-mux.mp4`);
  const audioPad = Math.max(0, target - audioDur);

  // Note: Homebrew ffmpeg often lacks libfreetype drawtext — captions ride on VO.
  const filter = [
    `[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,`,
    `pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30,`,
    `tpad=stop_mode=clone:stop_duration=${Math.max(0, target - videoDur).toFixed(3)},`,
    `trim=duration=${target.toFixed(3)},setpts=PTS-STARTPTS`,
    `[v];`,
    `[1:a]apad=pad_dur=${audioPad.toFixed(3)},atrim=0:${target.toFixed(3)},asetpts=PTS-STARTPTS[a]`,
  ].join('');

  const cmd = [
    'ffmpeg -y',
    `-i "${videoIn}"`,
    `-i "${audioIn}"`,
    `-filter_complex "${filter}"`,
    '-map "[v]" -map "[a]"',
    `-t ${target.toFixed(3)}`,
    '-c:v libx264 -pix_fmt yuv420p -preset fast -crf 18',
    '-c:a aac -b:a 192k',
    `"${out}"`,
  ].join(' ');

  execSync(cmd, { stdio: 'pipe' });
  return out;
}

function main() {
  const scenes = loadScenes();
  const workDir = path.join(OUTPUT_DIR, '_assemble');
  fs.rmSync(workDir, { recursive: true, force: true });
  fs.mkdirSync(workDir, { recursive: true });

  console.log(`\n🎞  Assembling sales demo (${scenes.length} scenes)\n`);

  const muxed = [];
  for (const scene of scenes) {
    process.stdout.write(`   → ${scene.id} ... `);
    const clip = buildSceneClip(scene.id, scene.caption, workDir, scene.minDurationSec);
    muxed.push(clip);
    const dur = probeDuration(clip);
    console.log(`✓ ${dur.toFixed(1)}s`);
  }

  const listFile = path.join(workDir, 'concat.txt');
  fs.writeFileSync(listFile, muxed.map((f) => `file '${f}'`).join('\n') + '\n');

  const finalOut = path.join(OUTPUT_DIR, 'sales-demo.mp4');
  const tmp = path.join(workDir, 'final-reencode.mp4');
  execSync(`ffmpeg -y -f concat -safe 0 -i "${listFile}" -c copy "${tmp}.raw.mp4"`, {
    stdio: 'pipe',
  });
  execSync(
    `ffmpeg -y -i "${tmp}.raw.mp4" -c:v libx264 -pix_fmt yuv420p -preset fast -crf 18 -c:a aac -b:a 192k -movflags +faststart "${finalOut}"`,
    { stdio: 'pipe' },
  );

  const total = probeDuration(finalOut);
  const minutes = Math.floor(total / 60);
  const seconds = Math.round(total % 60);
  console.log(`\n✅ ${finalOut}`);
  console.log(`   Duration: ${minutes}:${String(seconds).padStart(2, '0')} (${total.toFixed(1)}s)\n`);
}

try {
  main();
} catch (err) {
  console.error('\nFatal:', err);
  process.exit(1);
}
