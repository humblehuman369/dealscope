# Google Play Store Assets

Static marketing assets for the DealGapIQ Google Play listing.

## Feature graphic (1024 x 500)

Four candidate versions are checked in across two strategic directions. **Pick one** for the Play Console upload.

### Direction A — "Investor's Lens" (recommended, A/B candidates)

These lead with what makes DealGapIQ unique: every US listing already has a financial verdict applied to it. Both carry the brand-spec wordmark (top-left) and the off-MLS coverage badge (bottom-right) — two design elements that signal "not just another real estate search app" within the first second of viewing.

| File | Concept | Best for |
|---|---|---|
| `feature-graphic-1024x500-v4-investors-lens.png` | Real home photo with a circular "lens" overlay revealing holographic Target Buy / Income Value / Market Price / DEAL verdict inside. Plain house outside, scanned property inside. | Premium positioning, brand-build, anyone who wants the strongest visual differentiation. |
| `feature-graphic-1024x500-v3-verdict-stream.png` | Two real listing-card thumbnails with bold DEAL / PASS verdict pills already stamped on the photos, plus a phone showing the full verdict screen for the DEAL property. | Conversion-optimized, action-oriented hunters. The verdict pills make the differentiator graspable in <1 second. |

- **v4 headline:** See every listing through an investor's lens.
- **v4 subhead:** The price you should pay. On every US home.
- **v3 headline:** Hunt deals through an investor's lens.
- **v3 subhead:** Every US listing. Pre-scored for profit.

### Direction B — "Search + Verdict" (kept as fallback, original AI logo)

These lead with the Property Search feature paired with the verdict screen. Stronger than the original Play listing image but reads more like a generic real-estate-search app, which dilutes the differentiation. Note: these still carry the original AI-generated brand mark; the brand-spec wordmark and off-MLS badge have not been applied here.

| File | Concept |
|---|---|
| `feature-graphic-1024x500-v1-terminal.png` | Map phone + verdict phone, Bloomberg-terminal aesthetic. |
| `feature-graphic-1024x500-v2-investor.png` | Same as v1 but with a human hand on the verdict phone, slightly warmer. |

## Brand specifications (applied to v3 and v4)

### Wordmark (top-left)

- **Source:** [`assets/dealgapiq-wordmark-darkmode.png`](assets/dealgapiq-wordmark-darkmode.png) — official brand asset, DM Sans ExtraBold, "DealGap" in white + "IQ" in cyan
- **Why a PNG, not rendered text:** the supplied asset is the brand-system source of truth. Rendering from text would require shipping the variable font and re-implementing the exact cyan tint, which is brittle.
- **Black source background → alpha:** the script (`apply_brand.py`) converts the PNG's solid-black background to transparency using a luminance-as-alpha pass that preserves anti-aliased letter edges and the exact white + cyan colors of the original.
- **Resized to 300px wide** (~66px tall, preserving the source 1024×225 aspect) and positioned at `(28, 8)` from the upper-left.
- **AI-logo erase via median filter:** before compositing, the script crops the top-left region, runs a 23-pixel median filter on the underlying pixels (which removes outlier bright pixels — the AI wordmark letters and brain icon — while preserving the local navy gradient), and pastes the smoothed area back. This avoids the visible "shadow box" that any sampled-color rectangle creates against a smoothly-graded navy background — instead of replacing the area with one color, it just smooths the existing pixels (mostly navy with thin white strokes), so the result blends seamlessly into the surrounding gradient.

### Off-MLS coverage badge (bottom-left)

- **Font:** DM Sans, weight 600 (SemiBold)
- **Tracking:** -0.01em
- **Text:** `MLS  +  Foreclosure  +  Pre-Foreclosure  +  Auction`
- **Color:** item names in ink `#1B2141`, `+` separators in blue `#0465F2`
- **Container:** white rounded pill (8px radius), 32px above the bottom edge, left-aligned at `x=40` to match the headline left margin
- **Position rationale:** sits as a continuation of the subhead (`Every US listing. Pre-scored for profit.` on v3, `The price you should pay. On every US home.` on v4) — the badge reads as the proof points that back the subhead's claim
- **Why this content:** flags coverage that Zillow / Redfin / Realtor / Trulia don't surface in their primary flow — turns the listing into a moat statement

These specs are applied automatically by [`apply_brand.py`](apply_brand.py) using the DM Sans variable font (download instructions inside the script). Re-run the script any time the underlying composition changes; it overwrites the v3 / v4 PNGs in place.

## Strategic rationale

Real estate search apps are a saturated, low-trust category — Zillow, Redfin, Realtor, Trulia, Mashvisor all offer "search homes on a map." Leading the Play listing with that framing puts DealGapIQ in the buyer's same-as-everything-else bucket.

The actual differentiator is narrower and sharper: **every listing in the database is already pre-scored through an "investor's lens" — Target Buy, Income Value, Market Price, Deal Gap, and a DEAL/WATCH/PASS verdict — before the user even taps. And that scoring runs on data Zillow & co don't surface: foreclosures, pre-foreclosures, and auctions sit alongside MLS listings.** No competitor combines those two layers.

Direction A leans into both. v4 makes the lens *literal* (a circular x-ray viewport revealing financial truth on top of a real home photo). v3 makes it *concrete* (listings scrolling by with verdicts already stamped on them). The off-MLS badge in the corner reinforces that the data layer is broader than competitors'.

Both Direction A variants share these design principles:

- "Investor's lens" appears explicitly in the headline (owns the brand line)
- Real property photography is present (anchors the category — this is real estate)
- Financial data is visibly *applied to* the property (signals the unique data layer)
- A definitive verdict (DEAL, or DEAL/PASS) is the visual hero (signals decisiveness, not just data)
- Off-MLS coverage badge calls out the scope advantage (foreclosure / pre-foreclosure / auction)
- Brand-spec wordmark on a clean white chip (premium, distinct from in-image AI typography)
- Dark navy / cyan / yellow / red palette consistent with the in-app theme

## Copy variants to test (if you A/B later)

Stronger (lens-led, differentiated):

- `See every listing through an investor's lens.` (v4 — poetic, brand-aligned)
- `Hunt deals through an investor's lens.` (v3 — action verb, fuses search + lens)
- `Every property has a verdict.`
- `Stop searching for homes. Start hunting for deals.`
- `The price you should pay. On every US listing.`

Weaker (search-led, less differentiated):

- `Find the deal. Know the price.` (v1 / v2)
- `Map every US property. Color-coded by profit.`

Off-MLS badge variants to test:

- `MLS  +  Foreclosure  +  Pre-Foreclosure  +  Auction` (current — comprehensive)
- `Beyond MLS: Foreclosure · Pre-Foreclosure · Auction` (more positioning-led)
- `Includes off-MLS deals` (terse, mysterious — drives curiosity)

## Required Play Console action

The play-button overlay you see on the current listing only appears because a YouTube promo video is attached. To make this new graphic fully visible:

1. Open Play Console -> Store presence -> Main store listing -> Graphics
2. **Either** remove the promo video (`Promo video` field) so the static feature graphic is what shows, **or** recut the promo video so its first frame matches this banner — the play button will then sit over a composition that already accounts for it
3. Upload `feature-graphic-1024x500-v4-investors-lens.png` (or v3) to the `Feature graphic` field
4. Save and publish

Recommended path: remove the promo video for now, ship one variant, A/B-test the other after you have baseline install data.

## Known caveats on the current PNGs

These were AI-generated and then post-processed. Brand wordmark and off-MLS badge are pixel-perfect (rendered from DM Sans). The remaining caveats are inside the AI-generated content:

- **v3:** Asking-price text on the listing cards and dollar amounts on the phone are garbled (`$7,89,000`, `$3,650.00`, address text reads "Ween Ehoniar, Avd."). Numbers are illegible-on-purpose at thumbnail size but noticeable on the full listing page. Easiest fix: composite real numbers in via Photoshop / Figma.
- **v4:** Largely clean. The literal label `VERDICT TAG` floats above the DEAL pill (the AI took the descriptor literally) — a minor cleanup. Dollar amounts ($492K -> $518K -> $554K) are logically ordered and the Deal Gap reads correctly.
- **v1 / v2:** Dollar amounts on the verdict phone are not financially logical (Market Price ends up below Target Buy in v1; numbers don't math to -11.2%). Original AI logo retained — does NOT carry the brand-spec wordmark or off-MLS badge.

## Spec reference

- Format: PNG (transparency-friendly for logo lockup)
- Dimensions: exactly **1024 x 500 px**
- Max file size: 1 MB (all four files are well under)
- Safe zone: keep critical elements (headline, brand mark) inside the central ~80% — Play Store crops vary by surface
- Source generation: AI image generation at 1376x768 (16:9), then center-cropped to 1024x500 via `sips`. Brand wordmark and off-MLS badge then composited via `apply_brand.py`.

## Related but separate assets

- `../iap-promo/` — In-app purchase promo cards (Pro Monthly / Pro Annual)
- `../../images/` — Marketing site hero assets (`phone-demo-hero.png`, `three-price-thresholds-and-gaps-corrected.png`, etc.)

## Out of scope for this drop

- App screenshots that appear below the feature graphic on the listing
- Promo video itself
- Marketing site hero
- App icon

Open follow-ups if you want to refresh any of those next.
