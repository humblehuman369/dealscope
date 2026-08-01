/**
 * Generate per-scene ElevenLabs WAVs for the sales demo.
 *
 *   npx tsx scripts/walkthrough-video/tts.ts
 *   npx tsx scripts/walkthrough-video/tts.ts --scene 03-verdict
 *
 * Requires ELEVENLABS_API_KEY (loaded from backend/.env if unset).
 */
import * as fs from 'fs';
import * as path from 'path';
import { loadWalkthroughEnv, loadScenes, SCENES_DIR } from './loadEnv';

loadWalkthroughEnv();

const args = process.argv.slice(2);
const sceneFilter = (() => {
  const idx = args.indexOf('--scene');
  return idx !== -1 ? args[idx + 1] : undefined;
})();

const API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB';
const MODEL_ID = process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2';

async function synthesize(text: string, outPath: string): Promise<void> {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=pcm_44100`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': API_KEY!,
      'Content-Type': 'application/json',
      Accept: 'audio/pcm',
    },
    body: JSON.stringify({
      text,
      model_id: MODEL_ID,
      voice_settings: {
        stability: 0.4,
        similarity_boost: 0.75,
        style: 0.2,
        use_speaker_boost: true,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ElevenLabs ${res.status}: ${body.slice(0, 400)}`);
  }

  const pcm = Buffer.from(await res.arrayBuffer());
  // Wrap raw PCM (16-bit LE mono 44.1kHz) in a WAV header
  const wav = pcmToWav(pcm, 44100, 1, 16);
  fs.writeFileSync(outPath, wav);
}

function pcmToWav(pcm: Buffer, sampleRate: number, channels: number, bitsPerSample: number): Buffer {
  const byteRate = (sampleRate * channels * bitsPerSample) / 8;
  const blockAlign = (channels * bitsPerSample) / 8;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
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
