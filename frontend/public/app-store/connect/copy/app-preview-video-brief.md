# App Preview Video Brief — DealGapIQ for iOS

App Store Connect → My Apps → DealGapIQ → [Version] → iOS App → **App Previews** (per device size)

This brief specifies a **30-second portrait App Preview** designed to be uploaded for the iPhone 6.9" Display (1080×1920 portrait, H.264 MP4, ≤500 MB). Apple will use this video as the **first slot in the screenshot carousel**, autoplaying silently in search results.

---

## Apple App Preview Rules (read these first)

Apple's App Preview guidelines are stricter than Google Play's promo video:

- **15-30 seconds.** No exceptions.
- **Must be screen recordings of your actual app.** Marketing animations, talking heads, hands holding phones, and lifestyle b-roll are all rejected. Brand text overlays and music are allowed; live action is not.
- **Capture method:** Use Xcode → Devices and Simulators → Take Screenshot/Take Video, OR `xcrun simctl io booted recordVideo output.mp4`, OR record on a physical device with QuickTime → New Movie Recording → select iPhone as source.
- **No price information, no Apple trademarks (no Apple Pay logos), no third-party brand logos** unless you have rights.
- Audio is not autoplayed in search results — design the video to **work with sound off**. Voiceover is allowed but treat it as a bonus, not the primary message.
- The poster frame (still image shown before play) is auto-generated from the first frame OR you can upload a custom one. Make frame 1 a strong visual.

---

## The Brief (30-second cut)

**Theme:** "Hunt deals through an investor's lens."

**Tone:** Confident, fast, fintech-grade. Bloomberg Terminal × Linear × Calm. No "lifestyle real estate" tropes (no aerial drone shots of suburbs, no smiling families).

**Color system:** Dark navy backgrounds throughout. Cyan glow accents. White DM Sans 800 text overlays.

**Music:** Upbeat instrumental tech score, ~120-130 BPM, no vocals. References:
- "Wave" by Patrick Patrikios (royalty-free, fits perfectly)
- "Ambient Noise" library on Artlist or Epidemic Sound — search "tech intro," "fintech corporate"
- Avoid: trap beats, ukulele, anything that sounds like a SaaS explainer video

---

## Shot List

| # | Time | Visual | Text Overlay (DM Sans 800, white) | Audio |
|---|---|---|---|---|
| 1 | 0.0 - 2.0s | DealGapIQ wordmark fade-in over dark navy. Subtle cyan glow pulse. | _(none)_ | Music starts; bass drop |
| 2 | 2.0 - 5.0s | Screen recording: open the app, map view loads with property pins fading in one by one (color-coded green/yellow/red). Camera (recording) gently zooms in on cluster of pins. | "Every US listing." (large, fades in at 3.5s) | Music continues; light SFX as pins drop |
| 3 | 5.0 - 9.0s | Screen recording: user taps a green pin, the property card slides up. Lens effect zoom on the green DEAL pill. | "Pre-scored for profit." (replaces previous text at 6.0s) | Music build |
| 4 | 9.0 - 14.0s | Screen recording: tap into property detail, scroll smoothly to reveal the three financial cards: Target Buy → Income Value → Market Price. Each card animates in with a subtle slide. | "Target Buy. Income Value. Market Price." (single line, fades through at 10s, replaces with brand-line at 13s) | Music sustained, light snare hits matching card slide-ins |
| 5 | 14.0 - 18.0s | Screen recording: switch to the off-MLS source filter. Map redraws with foreclosure / pre-foreclosure / auction pins appearing. | "Beyond the MLS." (at 14.5s) | Music swell |
| 6 | 18.0 - 23.0s | Screen recording: open DealMaker / scenarios. User drags a slider (Purchase Price). Net Profit number recalculates live in big type. Deal Gap bar shifts color from yellow to green. | "Run any scenario, instantly." (at 19s) | Music peak; subtle "kachunk" SFX as DEAL pill turns green |
| 7 | 23.0 - 27.0s | Quick montage: heatmap view of a city, then Discovery card with checkmark, then map view zoom out showing many DEAL pins across America. | "Hunt deals through an investor's lens." (full headline, animates in word-by-word) | Music starts to wind down |
| 8 | 27.0 - 30.0s | DealGapIQ wordmark + "Available on iPhone & iPad" small line below. Soft cyan glow pulse. | DealGapIQ (logo, large) | Music outro / button hit |

---

## Voiceover Script (Optional, ~25-second voiceover for sound-on viewers)

If you want to add a voiceover, hire a male or female voice with a confident, slightly conversational tone — think the narrator of an Equinox or Linear product video, not an infomercial. Example pacing:

> _(0-2s)_ DealGapIQ.
>
> _(3-7s)_ Every US listing — MLS, foreclosure, auction — pre-scored for profit.
>
> _(8-13s)_ See Discovery in seconds. Target Buy. Income Value. Market Price.
>
> _(14-18s)_ Coverage that goes beyond the MLS.
>
> _(19-23s)_ Model any scenario. See the gap close in real time.
>
> _(24-29s)_ Hunt deals through an investor's lens. Only on DealGapIQ.

---

## Production Path (cheapest → most polished)

### Option A — DIY in 4 hours (recommended for v1)
1. Run the app in iOS Simulator (iPhone 16 Pro, iOS 18+). Set the simulator to **Hardware → Recording Quality → Highest**.
2. Use `xcrun simctl io booted recordVideo --codec h264 ~/Desktop/raw.mp4` to capture each scene as a separate clip.
3. Open Final Cut Pro, iMovie, or DaVinci Resolve (free). Drop in the clips on a timeline at the times above.
4. Add text overlays on a layer above. Use DM Sans 800 at 80-100pt, white, with a soft drop shadow for legibility against any background.
5. Add the music track. Cut to 30s exactly. Export as 1080×1920 H.264 MP4.

### Option B — Hire a designer ($800-$2,000)
- Brief: this document + 8 screenshots already produced
- Look for a freelancer on Dribbble or via the Apple Developer Forums who specializes in App Preview videos
- Turnaround: 5-7 business days
- Deliverables: source file (.fcpxml or .drp) + final MP4

### Option C — Use a tool like Previewed.app or Rotato ($30-$80/month)
- These tools provide phone mockup templates and export App Store-spec videos
- Faster than DIY but less polished than a designer
- Good for iterating on multiple variants

---

## What NOT to do

- **Do NOT show pricing or a Subscribe button** in the video — Apple rejects videos that look like ads for in-app purchases
- **Do NOT use Apple's logo, the App Store badge, or any iOS UI screenshots that aren't your own app** — copyright violation
- **Do NOT show a hand holding a phone, a person using the app, or any live-action footage** — Apple rejects these
- **Do NOT autoplay sound** — design for muted playback first; voiceover is bonus
- **Do NOT exceed 30 seconds** — Apple will reject the upload
- **Do NOT use stock photos of houses inside the screen recordings** — only show what your actual app shows

---

## Success metric

The App Preview video plays automatically in App Store search results. Track:
- **App Store Connect → Analytics → App Store → App Preview Plays** (impression-to-play rate)
- **App Store Connect → Analytics → App Store → Conversion Rate** (a strong preview should lift conversion 10-25% vs. screenshots-only)

If the preview is not lifting conversion, the most common culprit is the **first 2 seconds** — they decide whether the user keeps watching or scrolls past. Iterate on those first.
