# 60-Second In-App Tour: "Meet Your Workbench" — v2

**Status:** Enhanced from v1 to add Map Search as Step 6 of 6, neutralize entry-method language, tighten copy to preserve the 60-second budget, and update implementation/metrics specs.

---

## What changed vs. v1

| Type | Change |
| --- | --- |
| Added | Step 6 — Map Search (9s, just before Close) |
| Changed | Welcome copy is now entry-method-neutral (works for scan / address / map entry) |
| Changed | Verdict / Strategy / Appraiser / DealMaker / Estimator copy tightened to fit Map Search in without breaking the 60s budget |
| Changed | Step counter goes from "X of 5" → "X of 6" |
| Changed | Close screen gains a third CTA: 📍 Browse the Map |
| Added | Cold-link variant (no scan history) now includes Map Search as a 3rd entry option |
| Added | Trigger condition updated to fire on first Verdict view regardless of entry path |
| Added | Map Search empty-state shows "Replay the workbench tour →" link |
| Added | Analytics events for the Map Search step + close-screen CTAs |

---

## Trigger & format

**Trigger:** Fires the first time the user lands on `/discovery` with a successful analysis result, regardless of entry path (camera scan, address search, or click-from-map). Replaces v1's `searchHistoryCount === 1` check, which was too tight for the Map-Search-then-click-pin flow.

**Format:** Spotlighted tooltip overlay with subtle dim/blur on non-active areas. Bottom-anchored on mobile, side-anchored on desktop. Step counter top-right (X/6). Skip button top-right. "Don't show this again" checkbox on the close screen only.

**Pacing:** Each frame displays for the time below, then auto-advances OR the user taps "Next →" to move faster. Total guaranteed run: 60 seconds.

---

## The 7 frames (with exact copy, anchor, timing)

> **Total: 4 + 10 + 8 + 8 + 8 + 7 + 9 + 6 = 60 seconds ✓**

### Welcome (4 seconds)

**Anchor:** Centered modal, no spotlight

**Copy:**

> **You just analyzed your first property.**
> Here's everything else you unlocked — in 60 seconds.
>
> [ Show Me → ]   [ Skip ]

*Why changed:* "scanned" excluded users who came in via Address search or Map Search. "Analyzed" is neutral and equally rewarding.

---

### Step 1 of 6 — Verdict (10 seconds)

**Anchor:** Spotlight Target Buy / Income Value / Market Price stack + Deal Gap visualization
**Tab focus:** Verdict (already active)

**Copy:**

> 🎯 **This is your Verdict.**
> Three numbers say it all — Target Buy is your profit price. Income Value is break-even. Market is what the seller wants.
>
> The **Deal Gap** between them is your negotiation room.

*Why tightened:* Trimmed 12s → 10s. Council Round 6 was right that Verdict is the hero, but the v1 prose was repeating "is" three times. Cut to one structural sentence.

---

### Step 2 of 6 — Strategy (8 seconds)

**Anchor:** Spotlight the "Strategy" tab; brief preview of the 6 strategy pills

**Copy:**

> 📊 **Same property, six ways to profit.**
> Long-term, short-term, BRRRR, flip, house hack, wholesale — full proforma for each, side by side.

---

### Step 3 of 6 — Appraiser (8 seconds)

**Anchor:** Spotlight the "Appraiser" tab

**Copy:**

> 🏛️ **Want a real valuation?**
> Live comps, your-pick adjustments, confidence score, and a professional PDF to use for funding.

---

### Step 4 of 6 — DealMaker (8 seconds)

**Anchor:** Spotlight the "DealMaker" tab

**Copy:**

> 🛠️ **Structure the offer before you write it.**
> Change loan type, down payment, or rent — every metric recalculates live.

---

### Step 5 of 6 — Estimator (7 seconds)

**Anchor:** Spotlight the "Estimator" tab

**Copy:**

> 🔨 **Need rehab numbers?**
> Local construction pricing built in. Pick a preset or itemize — kitchen, bath, systems, the works.

---

### Step 6 of 6 — Map Search 🆕 (9 seconds)

**Anchor:** Spotlight the "Map Search" entry point — sticky-nav icon on desktop, the floating map button on mobile, OR the search-mode modal if visible

**Copy:**

> 🗺️ **Don't have an address? Hunt the whole market.**
> Map Search shows every parcel pre-graded green / yellow / red — with foreclosure, pre-foreclosure, auction, and 90-day-stale filters built in.
>
> *Pro tip: this is how flippers and wholesalers find their next deal.*

*Why this position:* Map Search is the next-deal loop. Putting it after Estimator (last deep-analysis tool) and right before Close creates a clean handoff: "you finished analyzing this one — here's how to find the next."

*Why the persona callout:* Council Round 6 noted the homepage doesn't speak to flippers/wholesalers. The tour's tooltip is one of the few moments to acknowledge those personas without cluttering the marketing surface.

---

### Close (6 seconds)

**Anchor:** Centered modal, no spotlight. Three CTAs (Save = primary, others equal weight)

**Copy:**

> **That's the workbench.**
> Save this property to track it, scan another, or hunt deals across an entire ZIP.
>
> [ ⭐ Save This Deal ]   [ 📸 Scan Another ]   [ 📍 Browse the Map ]
>
> ☐ Don't show this tour again

*Why three CTAs:* Save = retention loop, Scan = engagement loop, Map = breadth-of-product loop. The third button is also the moment that converts a scanner into a prospector. Without it, the tour subtly tells users "the workbench is for one address at a time" — which sells the product short.

---

## Updated UX rules (deltas from v1)

| Behavior | Updated spec |
| --- | --- |
| Trigger | Fires the first time the user lands on `/discovery` with a successful analysis result, regardless of entry path. Replace `searchHistoryCount === 1` with `firstVerdictView === true && hasSeenWorkbenchTour === false`. |
| Step indicator | "Step X of 6" |
| Replay | Two access points: (1) user menu → Profile → "Replay tour", (2) Map Search empty state → "New to the workbench? Take the 60-sec tour →" |
| Cold-link variant | `/discovery` opened via shared link with no analysis result fires a different first-time modal — see below. |
| Skippable | Yes — "Skip" link top-right on every step. Skipping marks tour-complete (won't re-trigger). |
| Don't-show-again | Only on close screen, defaults checked. If unchecked, tour fires once more on next session. |
| Auto-advance | Yes, on the timing above. User can tap "Next →" to skip ahead. "← Back" returns to previous step. |
| Pause | Tapping anywhere on the spotlight pauses auto-advance for 30 seconds. |
| Mobile | Tooltips bottom-anchored above the tab bar. Spotlight uses iOS-style cutout. Tap outside to pause. |
| Desktop | Tooltips right- or top-anchored depending on element position. Same spotlight behavior. |
| Style | Match the existing color system: tooltip background `#0A1929` (Verdict card bg), border `#00D4FF` (Target Buy blue accent), 16px rounded corners, soft drop shadow. |

---

## Cold-link first-time modal (new copy)

```
First time here? DealGapIQ analyzes any property in 15 seconds.

[ 📸 Scan a Property ]
[ 🔍 Search by Address ]
[ 📍 Browse the Map ]

Want a quick walkthrough first? [ Take the 60-sec tour → ]
```

*Why:* v1 had only one fallback ("see what DealGapIQ does → 60-sec tour"). With three entry methods now exposed on the homepage, the cold-link modal should mirror them.

---

## Why the math still hits 60s

| Frame | v1 | v2 | Δ |
| --- | --- | --- | --- |
| Welcome | 4 | 4 | — |
| Verdict | 12 | 10 | −2 |
| Strategy | 10 | 8 | −2 |
| Appraiser | 10 | 8 | −2 |
| DealMaker | 10 | 8 | −2 |
| Estimator | 8 | 7 | −1 |
| **Map Search** | **—** | **9** | **+9** |
| Close | 6 | 6 | — |
| **Total** | **60** | **60** | **✓** |

Tighter copy on the analysis-tool steps absorbs the new Map Search frame without breaking the budget. The trims are real because the v1 copy was over-explaining ("Tap any strategy to see…" etc. — users already know they can tap tabs).

---

## Updated implementation footprint

| Component | Where |
| --- | --- |
| Tour state (`hasSeenWorkbenchTour`) | DB user preferences (preferred) or localStorage fallback |
| Tour engine | `react-joyride` recommended (already React, well-maintained, supports custom anchor types). Alternates: Shepherd.js, Driver.js. |
| First-Verdict trigger | Hook into `/discovery` page mount: `if (!user.preferences.hasSeenWorkbenchTour && verdict.isLoaded) { startTour(); markSeen(); }` |
| Map Search anchor logic | Anchor target depends on viewport — desktop sticky-nav `[data-tour="map-search-nav"]`, mobile floating-button `[data-tour="map-search-fab"]`. Add these data attrs in the existing nav components. |
| Close-screen CTA wiring | "Save This Deal" → save mutation, "Scan Another" → camera, "Browse the Map" → `router.push('/map-search')` |
| Replay link | User menu + Map Search empty state |
| Cold-link variant | `/discovery` page detects missing analysis → renders 3-button modal |
| Analytics | `tour-shown`, `tour-step-reached:{1..6}`, `tour-skipped:{stepNumber}`, `tour-completed`, `save-from-close`, `scan-from-close`, **`mapsearch-from-close`** |

---

## Updated success metrics

| Metric | Target |
| --- | --- |
| Tour completion rate | >60% (industry baseline ~40%) |
| Multi-tab usage in first session (visits ≥3 of the 6 tabs) | >50% |
| First-week retention (return ≥1×) | +10–15% lift vs. no-tour baseline |
| Save-from-close CTA click rate | >25% |
| Scan-Another-from-close CTA click rate | >30% |
| **Map-Search-from-close CTA click rate** | **>15% (new — directly measures whether the tour broadens product comprehension)** |
| **Map Search adoption within first 7 days** | **>25% of tour-completers vs. baseline (the lever this whole change is supposed to pull)** |

If Map-Search-from-close is <10%, the Step 6 copy isn't landing — A/B test removing the persona line, or moving Map Search to Step 1 (re-frame the tour as "discovery → analysis → next deal").

---

## Why these specific 6 steps work

1. **Welcome** uses "you" — credit the user for analyzing. First-timers need ego reinforcement after taking action. The tour rewards them for the work they just did.
2. **Verdict** gets 10 seconds (the longest analysis-step). It's the hero of the product. Everything else is supporting cast. Don't rush it.
3. **Strategy → Appraiser → DealMaker → Estimator** follows the deal lifecycle: explore → value → structure → estimate. This sequence subliminally teaches the workflow.
4. **Map Search** sits at Step 6 — after the user has seen what *one analysis* unlocks, then we show them how to *find more*. Reverse order would feel like a sales pitch before the value is established.
5. **Close** has three CTAs of equal weight. Save = retention. Scan = engagement. Map = breadth. Any of the three is a win — don't favor one.
6. **No mention of "Pro" or "Upgrade"** anywhere. The tour is about value disclosure, not monetization. Trust that the gated features will sell themselves once users hit them naturally.

---

## Where to NOT trigger this tour

- **Cold landing on /discovery via shared link** — they didn't analyze anything, the welcome copy doesn't apply. Show the cold-link first-time modal above instead.
- **Logged-in user re-analyzing their 2nd property** — already saw the tour, don't re-trigger.
- **Mobile users on slow networks** — defer until tabs have rendered, or the spotlight will land on missing elements.

---

## Open questions before implementation

1. **Entry-aware welcome copy?** v2 uses neutral "analyzed" — but if you want the welcome to brag about the *specific entry method* the user used (e.g., "Nice scan!" / "Nice find on the map!"), we can branch on `analysisOrigin`. Slightly more code, more delight.
2. **Should the Map Search step *demo* the filters, or just point at the entry?** Current spec just points at the nav button. A more aggressive version would briefly nav-preview the Map Search screen with foreclosure pins lit up. Trade-off: more wow vs. more loading time and more opportunity for things to go wrong on slow networks.
3. **Is "Map Search" the right in-product label, or should it match the in-app modal copy ("Browse the map")?** Pick one and ensure homepage / tour / nav all match.

---

## Bonus: parallel 60-second homepage video script (carry-over from v1, lightly revised)

Use as a v2 explainer or a 60-second pre-roll for paid social.

| Time | Scene | Voiceover |
| --- | --- | --- |
| 0:00–0:05 | Cold open — driving past a house, hand reaches for phone | "You see a house. You wonder what it'd be worth as a rental. Now you know — in 15 seconds." |
| 0:05–0:12 | Phone pointed at house. AR cone overlay. "Property Found! 95% confidence." Address resolves. | "Point. Scan. Done." |
| 0:12–0:23 | Cut to Verdict page. Camera pans down the three values. Deal Gap visualization animates. | "Target Buy. Income Value. Market Price. The Deal Gap tells you instantly: walk away, negotiate, or write the offer." |
| 0:23–0:32 | Strategy pills tap through. Numbers update for each. | "Same property — six ways to make money. Long-term rental. BRRRR. Flip. House hack. Whatever fits your strategy." |
| 0:32–0:42 | Quick cuts: comp map with pins, rehab estimator quick-start presets, Excel proforma download | "Live comps. Local rehab pricing. Excel-ready proformas. The whole investor workbench — built for one tap." |
| 0:42–0:52 | **🆕 Map Search montage — pre-graded pins on satellite, foreclosure filter chip, click-to-analyze a parcel** | **"Don't have an address yet? Hunt deals across an entire ZIP — foreclosures, pre-foreclosures, auctions, every parcel pre-graded."** |
| 0:52–0:60 | DealGapIQ logo. App store badges. URL. | "DealGapIQ. Not a listing site. A deal decision engine." On-screen: *3 free scans/month · No credit card · DealGapIQ.com* |

*Suggested production:* Screen recording on a real iPhone running the live app. No actor needed for VO — professional voice with light editing. Keep it tight and confident — let the screen recordings do the talking.

---

*Document version: v2 · Source: enhanced from `60 New User Tower.docx` · Adds Map Search as the 6th workbench step, mirroring the homepage redesign.*
