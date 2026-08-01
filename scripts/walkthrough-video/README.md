# DealGapIQ — Sales Demo Video Pipeline

Produces `output/sales-demo.mp4` (1920×1080, duration driven by ElevenLabs VO — typically ~3.5–6 min) from:

1. ElevenLabs VO (`tts.mjs`)
2. Live Playwright capture against production (`record.mjs`) — screenshot timeline + system ffmpeg
3. ffmpeg mux (`assemble.mjs`)

## Prerequisites

- System `ffmpeg` / `ffprobe` on PATH (Homebrew is fine)
- A desktop Chromium browser (Brave / Chrome / Edge) — used via Playwright `executablePath`
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

Script source: `frontend/docs/vo-script-sales-demo-6min.md`  
Scene data: `scenes.json`  
Final deliverable: `output/sales-demo.mp4`

TypeScript variants (`*.ts`) are reference copies; prefer the `.mjs` runners.
