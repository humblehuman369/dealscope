# DealGapIQ — 60-Second Explainer
## ElevenLabs-Ready Script

**For:** ElevenLabs Speech Synthesis with your pre-configured voice
**Length:** 60 seconds · ~117 words
**Format:** Paste-as-text. Punctuation drives pacing; `<break>` tags handle the longer pauses.

---

## Recommended ElevenLabs settings (one-time)

| Setting | Value |
| --- | --- |
| Model | Eleven Multilingual v2 *or* Eleven v3 (v3 if available — better prosody) |
| Stability | **40** (lower = more expressive; raise to 55–60 if you hear over-acting) |
| Similarity | 75 |
| Style exaggeration | 20 |
| Speaker boost | ON |
| Output format | WAV 44.1 kHz / PCM (best quality) |

> **Tip:** Generate the full master first. If a single phrase comes out wrong, regenerate just *that scene* using the per-scene blocks below — they're tuned to render cleanly on their own.

---

## Master read — paste this whole block

> Paste everything between the lines into the ElevenLabs text field. The HTML-style `<break>` tags work in v2 and v3 models.

---

```
You drive past a house. You wonder what it'd be worth as a rental. <break time="0.5s" /> Now you know. In fifteen seconds.

<break time="0.8s" />

Point. <break time="0.4s" /> Scan. <break time="0.4s" /> Done.

<break time="0.8s" />

Target Buy. <break time="0.3s" /> Income Value. <break time="0.3s" /> Market Price. <break time="0.6s" /> The Deal Gap between them tells you instantly — walk away, negotiate, or write the offer.

<break time="0.8s" />

Same property — six ways to profit. <break time="0.4s" /> Long-term rental. B-R-R-R. Flip. House hack. <break time="0.4s" /> Whatever fits your strategy.

<break time="0.8s" />

Live comps. Local rehab pricing. Excel-ready proformas. <break time="0.5s" /> The whole investor workbench — built for one tap.

<break time="0.8s" />

Don't have an address yet? <break time="0.5s" /> Hunt deals across an entire ZIP. <break time="0.3s" /> Foreclosures. Pre-foreclosures. Auctions. <break time="0.4s" /> Every parcel — pre-graded.

<break time="0.8s" />

DealGapIQ. <break time="0.5s" /> Not a listing site. <break time="0.4s" /> A deal decision engine.
```

---

## Per-scene blocks (use these to regenerate individual scenes)

### Scene 1 — Cold open (0:00–0:05)
```
You drive past a house. You wonder what it'd be worth as a rental. <break time="0.5s" /> Now you know. In fifteen seconds.
```

### Scene 2 — Scan (0:05–0:12)
```
Point. <break time="0.4s" /> Scan. <break time="0.4s" /> Done.
```

### Scene 3 — Verdict (0:12–0:23)
```
Target Buy. <break time="0.3s" /> Income Value. <break time="0.3s" /> Market Price. <break time="0.6s" /> The Deal Gap between them tells you instantly — walk away, negotiate, or write the offer.
```

### Scene 4 — Strategy (0:23–0:32)
```
Same property — six ways to profit. <break time="0.4s" /> Long-term rental. B-R-R-R. Flip. House hack. <break time="0.4s" /> Whatever fits your strategy.
```

### Scene 5 — Appraiser + Estimator (0:32–0:42)
```
Live comps. Local rehab pricing. Excel-ready proformas. <break time="0.5s" /> The whole investor workbench — built for one tap.
```

### Scene 6 — Map Search (0:42–0:52)
```
Don't have an address yet? <break time="0.5s" /> Hunt deals across an entire ZIP. <break time="0.3s" /> Foreclosures. Pre-foreclosures. Auctions. <break time="0.4s" /> Every parcel — pre-graded.
```

### Scene 7 — Close (0:52–0:60)
```
DealGapIQ. <break time="0.5s" /> Not a listing site. <break time="0.4s" /> A deal decision engine.
```

---

## Two alternate close reads (generate both, pick the better)

### Close — version A (warmer)
```
DealGapIQ. <break time="0.5s" /> Not just another listing site... <break time="0.4s" /> a deal decision engine.
```

### Close — version B (more declarative)
```
DealGapIQ. <break time="0.6s" /> Not a listing site. <break time="0.5s" /> A deal decision engine.
```

---

## On-screen text (NOT spoken)

These appear as supers / lower-thirds in the video editor — do not include in the VO render:

- 0:05–0:12 — `Point · Scan · Done` (matches the words on screen)
- 0:12–0:23 — `Deal Gap = Market − Target Buy`
- 0:23–0:32 — `6 strategies · auto-calculated`
- 0:42–0:52 — `Foreclosure · Pre-foreclosure · Auction · 90-day stale`
- 0:52–0:60 — `3 free scans / month · No credit card · DealGapIQ.com`

---

## ElevenLabs quirks to know

| Quirk | What to do |
| --- | --- |
| Says "BRRRR" as "burr" | Already handled — written as `B-R-R-R` so it spells letters |
| Reads `proforma` weird | If it does — replace with `pro forma` (two words) |
| Reads "ZIP" as "zip code" | If it does — replace with `zip code` to control it explicitly |
| Says "DealGapIQ" wrong | Replace with `Deal Gap I Q` (with spaces) — forces letter-by-letter |
| Over-emphasizes everything | Lower style exaggeration to 10–15, raise stability to 55 |
| Reads `<break>` aloud | You're on an older model — switch to Eleven Multilingual v2 or v3 |

If your voice is a *cloned* voice (Professional Voice Clone or Instant), the prosody is locked to your training data — markup matters less, the voice does what it does. Trust it.

---

## Render workflow

1. Paste the **Master read** block. Generate.
2. Listen end-to-end. Note any scene that lands wrong.
3. For each bad scene: copy the matching **Per-scene block**, regenerate, download.
4. Drop the master + any per-scene replacements into your video editor (iMovie / Final Cut / Descript).
5. If a scene's per-render is shorter or longer than its budgeted time, trim or stretch the silence around it — don't re-record words.
6. Export both close versions (A and B), pick in editing.

---

## When you record your own voice

Use the **plain-text version** without `<break>` tags — those are SSML, your mouth is not. Honor the pause lengths by counting beats: short pauses ≈ "one"; medium ≈ "one-two"; long ≈ "one-two-three". Same script, same pacing, only the voice changes — preserves the A/B integrity.

---

*Document version: VO Script v1 — ElevenLabs · Companion to `60-Second VO Script.docx`*
