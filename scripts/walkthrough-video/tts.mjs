/**
 * Generate per-scene ElevenLabs WAVs for the sales demo.
 *
 *   node scripts/walkthrough-video/tts.mjs
 *   node scripts/walkthrough-video/tts.mjs --scene 03-verdict
 */
import fs from 'fs';
import path from 'path';
import { loadWalkthroughEnv, loadScenes, SCENES_DIR } from './loadEnv.mjs';

loadWalkthroughEnv();

const args = process.argv.slice(2);
const sceneIdx = args.indexOf('--scene');
const sceneFilter = sceneIdx !== -1 ? args[sceneIdx + 1] : undefined;

const API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB';
const MODEL_ID = process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2';

async function synthesize(text, outPath) {
  // mp3_44100_128 is available on Starter+; pcm_44100 requires Pro
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': API_KEY,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: MODEL_ID,
      // Softer, calmer read for the investor-journey cut:
      // higher stability = steadier pacing, lower style = less announcer punch
      voice_settings: {
        stability: 0.55,
        similarity_boost: 0.75,
        style: 0.1,
        use_speaker_boost: true,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ElevenLabs ${res.status}: ${body.slice(0, 400)}`);
  }

  const mp3Path = outPath.replace(/\.wav$/i, '.mp3');
  fs.writeFileSync(mp3Path, Buffer.from(await res.arrayBuffer()));
  // Normalize to WAV for assemble.mjs
  const { execSync } = await import('child_process');
  execSync(`ffmpeg -y -i "${mp3Path}" -acodec pcm_s16le -ar 44100 -ac 1 "${outPath}"`, {
    stdio: 'pipe',
  });
}

async function main() {
  if (!API_KEY) {
    console.error('✗ ELEVENLABS_API_KEY is missing. Add it to backend/.env or export it.');
    process.exit(1);
  }

  fs.mkdirSync(SCENES_DIR, { recursive: true });
  const scenes = loadScenes().filter((s) => !sceneFilter || s.id === sceneFilter);
  if (scenes.length === 0) {
    console.error(`✗ No scenes matched${sceneFilter ? ` "${sceneFilter}"` : ''}`);
    process.exit(1);
  }

  console.log(`\n🎙  ElevenLabs TTS`);
  console.log(`   Voice:  ${VOICE_ID}`);
  console.log(`   Model:  ${MODEL_ID}`);
  console.log(`   Scenes: ${scenes.length}\n`);

  for (const scene of scenes) {
    const outPath = path.join(SCENES_DIR, `${scene.id}.wav`);
    process.stdout.write(`   → ${scene.id} ... `);
    await synthesize(scene.elevenLabsText, outPath);
    const kb = (fs.statSync(outPath).size / 1024).toFixed(0);
    console.log(`✓ ${kb} KB`);
  }

  console.log(`\n✅ WAVs saved to ${SCENES_DIR}\n`);
}

main().catch((err) => {
  console.error('\nFatal:', err);
  process.exit(1);
});
