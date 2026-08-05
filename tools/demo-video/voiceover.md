# Voiceover Script — "What is DealGapIQ?" (60s demo, v4)

Total: ~155 words at a brisk-but-natural ~160 wpm. Each cue must END before its
scene window closes (windows below include the crossfade into the next scene).

Delivery notes: confident, direct, investor-to-investor. No hype voice.
Emphasis words are **bolded**. "DealGapIQ" is pronounced "Deal-Gap-I-Q".

| # | Scene (on screen) | Window | Cue |
|---|---|---|---|
| 1 | Logo + hook headline | 0:00.4 – 0:06.0 | Stop scrolling listings. Start spotting **real deals**. This is DealGapIQ — in sixty seconds. |
| 2 | Gap animation (−30.9%) | 0:06.3 – 0:13.8 | Every listing hides a **gap** — the distance between the asking price and what it's worth to an investor. That gap **is** the deal. |
| 3 | Step 1: Search | 0:14.3 – 0:20.8 | Step one — search **any address**. Active, expired, or off-market. Your first Discovery is free — no login. |
| 4 | Step 2: Deal Gap | 0:21.3 – 0:29.8 | Step two — see the **Deal Gap** in seconds. Six live data sources. One **target buy price**. Know exactly what the property is worth to *you*. |
| 5 | Step 3: Four options | 0:30.3 – 0:39.3 | Step three — get **four ready-made ways** to make the deal work: a rent increase, a price cut, creative finance, or a blended plan — each with a worksheet and a negotiation script. |
| 6 | Buyers & lenders | 0:40.0 – 0:46.3 | Then **close it** — with twenty-eight hundred verified cash buyers and nearly five hundred hard-money lenders, built in. |
| 7 | Founder trust card | 0:47.0 – 0:52.8 | From Foreclosure-dot-com founder Brad Geisen — who built the pricing tools for Fannie Mae and Freddie Mac. |
| 8 | CTA | 0:53.3 – 0:59.5 | **Know what to offer.** Run your free Discovery now at DealGapIQ-dot-com. Free — no card needed. |

## Recording specs

- Mono or stereo WAV/AIFF, 48 kHz, -16 LUFS integrated (web loudness standard)
- Leave ~0.4s of room tone at the head of each cue for editing
- Record each cue as a separate take; they get placed at the timestamps above

## Muxing the final audio

Once you have a finished 60s track (voiceover + optional music bed):

```bash
ffmpeg -i frontend/public/videos/what-is-dealgapiq-v4.mp4 -i vo-final.wav \
  -c:v copy -c:a aac -b:a 128k -shortest \
  frontend/public/videos/what-is-dealgapiq-v4-audio.mp4
```

Then swap the file into place (keep the same filename referenced in code, or
update the four `VideoModal` references).

Note: the homepage modal autoplays with sound permitted only after user
interaction — the video opens from a click, so audio will play.
