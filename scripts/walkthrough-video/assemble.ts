/**
 * Mux scene videos + ElevenLabs WAVs + caption overlays → sales-demo.mp4
 *
 *   npx tsx scripts/walkthrough-video/assemble.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { loadScenes, SCENES_DIR, OUTPUT_DIR } from './loadEnv';

function probeDuration(file: string): number {
  const out = execSync(
    `ffprobe -v error -show_entries format=duration -of csv=p=0 "${file}"`,
    { encoding: 'utf8' },
  ).trim();
  return parseFloat(out);
}

function escapeDrawtext(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/:/g, '\\:')
    .replace(/'/g, "\\'")
    .replace(/%/g, '\\%');
}

function buildSceneClip(sceneId: string, caption: string, workDir: string): string {
  const videoIn = path.join(SCENES_DIR, `${sceneId}.mp4`);
  const audioIn = path.join(SCENES_DIR, `${sceneId}.wav`);
  if (!fs.existsSync(videoIn)) throw new Error(`Missing video: ${videoIn}`);
  if (!fs.existsSync(audioIn)) throw new Error(`Missing audio: ${audioIn}`);

  const audioDur = probeDuration(audioIn);
  const videoDur = probeDuration(videoIn);
  const target = Math.max(audioDur + 0.35, 1);
  const out = path.join(workDir, `${sceneId}-mux.mp4`);
  const captionEsc = escapeDrawtext(caption);

  // Pad video with freeze-frame if shorter than audio; trim if longer
  const filter = [
    `[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,`,
    `pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30,`,
    `tpad=stop_mode=clone:stop_duration=${Math.max(0, target - videoDur).toFixed(3)},`,
    `trim=duration=${target.toFixed(3)},setpts=PTS-STARTPTS,`,
    `drawbox=x=0:y=ih-110:w=iw:h=110:color=black@0.55:t=fill,`,
    `drawtext=text='${captionEsc}':fontcolor=white:fontsize=36:`,
    `x=(w-text_w)/2:y=h-70:font=Helvetica`,
    `[v]`,
  ].join('');

  const cmd = [
    'ffmpeg -y',
    `-i "${videoIn}"`,
    `-i "${audioIn}"`,
    `-filter_complex "${filter}"`,
    '-map "[v]" -map 1:a',
    `-t ${target.toFixed(3)}`,
    '-c:v libx264 -pix_fmt yuv420p -preset fast -crf 18',
    '-c:a aac -b:a 192k',
    '-shortest',
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

  const muxed: string[] = [];
  for (const scene of scenes) {
    process.stdout.write(`   → ${scene.id} ... `);
    const clip = buildSceneClip(scene.id, scene.caption, workDir);
    muxed.push(clip);
    const dur = probeDuration(clip);
    console.log(`✓ ${dur.toFixed(1)}s`);
  }

  const listFile = path.join(workDir, 'concat.txt');
  fs.writeFileSync(
    listFile,
    muxed.map((f) => `file '${f}'`).join('\n') + '\n',
  );

  const finalOut = path.join(OUTPUT_DIR, 'sales-demo.mp4');
  execSync(
    `ffmpeg -y -f concat -safe 0 -i "${listFile}" -c copy "${finalOut}"`,
    { stdio: 'pipe' },
  );

  // Re-encode once for clean timestamps
  const finalClean = path.join(OUTPUT_DIR, 'sales-demo.mp4');
  const tmp = path.join(workDir, 'final-reencode.mp4');
  execSync(
    `ffmpeg -y -i "${finalOut}" -c:v libx264 -pix_fmt yuv420p -preset fast -crf 18 -c:a aac -b:a 192k -movflags +faststart "${tmp}"`,
    { stdio: 'pipe' },
  );
  fs.copyFileSync(tmp, finalClean);

  const total = probeDuration(finalClean);
  const minutes = Math.floor(total / 60);
  const seconds = Math.round(total % 60);
  console.log(`\n✅ ${finalClean}`);
  console.log(`   Duration: ${minutes}:${String(seconds).padStart(2, '0')} (${total.toFixed(1)}s)\n`);
}

try {
  main();
} catch (err) {
  console.error('\nFatal:', err);
  process.exit(1);
}
