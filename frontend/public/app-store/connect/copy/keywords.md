# App Store — App Name (Title) + Keyword Field

App Store Connect → My Apps → DealGapIQ → App Information

This file covers the two indexed metadata fields the existing pack didn't:
the **App Name (Title)** and the **Keyword field**. They work together with
`subtitle.md` ("Every US deal, pre-scored.") as Apple's indexed trio — Apple
indexes words in the **app name + subtitle + keyword field** and de-duplicates
across them. So the keyword field below deliberately **avoids** words already
carried by the name and subtitle (every, us, deal, pre-scored).

---

## App Name / Title (30 char max)

> **Recommended (PRIMARY):** `DealGapIQ: Real Estate Deals` _(28 chars)_

**Why this wins**
- Carries the highest-volume relevant head term — **"real estate"** — which the
  subtitle does *not*, so it adds ranking surface rather than duplicating it.
- Keeps the brand "DealGapIQ" first (brand recall + exact-brand search).
- Reads cleanly in the dense search grid.

**Alternates**

| # | Title | Chars | Note |
|---|---|---|---|
| 2 | `DealGapIQ: Real Estate Invest` | 29 | Pure-SEO play — ranks for "real estate" **and** "invest" with zero subtitle overlap; slightly clipped grammar |
| 3 | `DealGapIQ: Investment Property` | 30 | Captures "investment" + "property"; broader, less deal-focused |
| 4 | `DealGapIQ: Property Analysis` | 28 | Analytical framing; "analysis" is lower intent than "deals" |

> Trade-off: #1 ("Deals") slightly overlaps the subtitle's "deal" stem but is the
> most readable and on-brand. #2 is the strictly stronger keyword play if you
> want to rank for "invest" too. Pick #1 for clarity, #2 for max reach.

---

## Keyword field (100 char max, comma-separated, NO spaces)

> **Recommended (PRIMARY)** _(94 / 100)_
>
> `foreclosure,preforeclosure,auction,rental,flip,brrrr,wholesale,investor,roi,cashflow,arv,comps`

**Why this set**
- **Leads with the moat:** `foreclosure,preforeclosure,auction` — the off-MLS
  coverage that is DealGapIQ's core differentiator (and the theme of screenshot
  #5 and the Play feature graphic). These are high-intent terms Zillow/Redfin
  shoppers don't get, and they're absent from the name/subtitle.
- **Strategy terms** (`rental,flip,brrrr,wholesale`) match the six-strategy
  engine and the highest-volume investor searches.
- **Financial terms** (`roi,cashflow,arv,comps`) capture underwriting intent.
- **No wasted words:** nothing here repeats the app name or subtitle, and no
  plurals where Apple already infers them (Apple matches singular↔plural).

**Field rules honored**
- No spaces after commas (every space is a wasted character).
- No competitor brand names (Apple rejects them in metadata — use those in
  Apple Search Ads instead; see below).
- No "real estate" / "property" (carried by the title) and no "deal" (subtitle).

**Alternates (swap based on first 30 days of ASA + review-language data)**

| Swap in | Swap out | When |
|---|---|---|
| `offmarket` | `comps` | If "off market" shows higher ASA conversion than comps |
| `caprate` | `cashflow` | If cap-rate searches convert better for your audience |
| `landlord` | `arv` | If buy-and-hold (not flip) is your dominant install segment |

---

## Competitor terms — Apple Search Ads only (NOT metadata)

Do **not** put these in the keyword field (rejection risk). Bid on them in
Apple Search Ads, paired with the comparison-page messaging:

`dealcheck, mashvisor, propstream, biggerpockets, rehab estimator`

---

## Character counts (reference)

```
Title (PRIMARY):     28 / 30
Keyword field:       94 / 100   (6 chars headroom)
```

> Verify live in App Store Connect — its counter is authoritative. After saving,
> the field should read 94 and accept without truncation.
