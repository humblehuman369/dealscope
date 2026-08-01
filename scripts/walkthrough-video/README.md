# DealGapIQ — Sales Demo Video Pipeline

Produces `output/sales-demo.mp4` (~6 min, 1920×1080) from:

1. ElevenLabs VO (`tts.ts`)
2. Live Playwright capture against production (`record.ts`)
3. ffmpeg mux + captions (`assemble.ts`)

## Prerequisites

- `ffmpeg` / `ffprobe` on PATH
- Playwright browsers (`npx playwright install chromium` from repo root)
- `ELEVENLABS_API_KEY` in `backend/.env` (optional `ELEVENLABS_VOICE_ID`)
- Demo account: `review@dealgapiq.com` (see `scripts/screenshots/capture.ts`)

## Run

From repo root:

```bash
node scripts/walkthrough-video/tts.mjs
node scripts/walkthrough-video/record.mjs --base-url https://dealgapiq.com
node scripts/walkthrough-video/assemble.mjs
open scripts/walkthrough-video/output/sales-demo.mp4
```

TypeScript variants (`*.ts`) are kept as reference; prefer the `.mjs` runners (no tsx/esbuild required).

Script source: `frontend/docs/vo-script-sales-demo-6min.md`  
Scene data: `scenes.json`
