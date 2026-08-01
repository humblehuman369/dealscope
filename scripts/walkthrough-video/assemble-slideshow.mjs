/**
 * Ken Burns slideshow from App Store PNGs + ElevenLabs WAVs.
 * Fallback when live Playwright recording hits auth/limit issues.
 * (Homebrew ffmpeg often lacks libfreetype drawtext — captions ride on VO.)
 *
 *   node scripts/walkthrough-video/assemble-slideshow.mjs
 */
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SCENES_DIR = path.join(__dirname, 'output/scenes')
const OUT_DIR = path.join(__dirname, 'output')
const FINAL = path.join(OUT_DIR, 'sales-demo.mp4')
const SCENES = JSON.parse(fs.readFileSync(path.join(__dirname, 'scenes.json'), 'utf8'))

const STILL_ROOTS = [
  path.resolve(__dirname, '../screenshots/output/iphone-6.7'),
  SCENES_DIR,
]

const STILL_MAP = {
  '01-hook': ['02_search.png', '01_login.png'],
  '02-analyze': ['02_search.png'],
  '03-verdict': ['03_verdict.png'],
  '04-trust-strategies': ['04_strategy.png', '03_verdict.png'],
  '05-four-paths': ['03_verdict.png', '04_strategy.png'],
  '06-pitch': ['03_verdict.png'],
  '07-deal-maker': ['04_strategy.png'],
  '08-close': ['05_deal_vault.png', '02_search.png'],
}

function sh(cmd) {
  console.log(`$ ${cmd}`)
  execSync(cmd, { stdio: 'inherit' })
}

function findStill(names) {
  for (const name of names) {
    for (const root of STILL_ROOTS) {
      const p = path.join(root, name)
      if (fs.existsSync(p)) return p
    }
  }
  return null
}

function audioDuration(wav) {
  return parseFloat(
    execSync(
      `ffprobe -v error -show_entries format=duration -of csv=p=0 "${wav}"`,
      { encoding: 'utf8' },
    ).trim(),
  )
}

function buildScene(scene) {
  const audioIn = path.join(SCENES_DIR, `${scene.id}.wav`)
  const outMp4 = path.join(SCENES_DIR, `${scene.id}.mp4`)
  if (!fs.existsSync(audioIn)) throw new Error(`Missing audio ${audioIn}`)

  const still = findStill(STILL_MAP[scene.id] || [])
  if (!still) throw new Error(`No still for ${scene.id}`)

  const audioDur = audioDuration(audioIn)
  const target = Math.max(audioDur + 0.35, scene.minDurationSec || 0, 1)
  const frames = Math.ceil(target * 30)

  const filter = [
    `[0:v]scale=1920:1080:force_original_aspect_ratio=increase,`,
    `crop=1920:1080,`,
    `zoompan=z='min(zoom+0.0008,1.12)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1920x1080:fps=30`,
    `[v];`,
    `[1:a]apad=pad_dur=${Math.max(0, target - audioDur).toFixed(3)},`,
    `atrim=0:${target.toFixed(3)},asetpts=PTS-STARTPTS[a]`,
  ].join('')

  sh(
    [
      'ffmpeg -y',
      `-loop 1 -i "${still}"`,
      `-i "${audioIn}"`,
      `-filter_complex "${filter}"`,
      '-map "[v]" -map "[a]"',
      `-t ${target.toFixed(3)}`,
      '-c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p',
      '-c:a aac -b:a 192k',
      `"${outMp4}"`,
    ].join(' '),
  )
  return outMp4
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  const parts = []
  for (const scene of SCENES) {
    console.log(`\n=== Slideshow ${scene.id} ===`)
    parts.push(buildScene(scene))
  }

  const listPath = path.join(SCENES_DIR, '_concat.txt')
  fs.writeFileSync(listPath, parts.map((p) => `file '${p}'`).join('\n') + '\n')

  const tmp = `${FINAL}.tmp.mp4`
  sh(`ffmpeg -y -f concat -safe 0 -i "${listPath}" -c copy "${tmp}"`)
  sh(
    `ffmpeg -y -i "${tmp}" -c:v libx264 -pix_fmt yuv420p -preset fast -crf 18 -c:a aac -b:a 192k "${FINAL}"`,
  )
  fs.unlinkSync(tmp)

  const dur = execSync(
    `ffprobe -v error -show_entries format=duration -of csv=p=0 "${FINAL}"`,
    { encoding: 'utf8' },
  ).trim()
  const sec = parseFloat(dur)
  console.log(`\n✅ ${FINAL}`)
  console.log(
    `   Duration: ${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`,
  )
}

main()
