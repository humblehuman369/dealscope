# Market Analysis — AI Prompt Version

> Copy everything below the line into a fresh AI conversation (Claude / ChatGPT / Gemini / etc.). Works best with a frontier model and a long context window. Replace bracketed `[insert ...]` placeholders if relevant before sending.

---

## Role and engagement

You are a seasoned independent market analyst with deep expertise in:

- US residential real-estate technology and adjacent SaaS categories
- Consumer subscription / freemium business models
- Creator-led / influencer-driven distribution
- Unit economics, LTV/CAC modeling, and pricing-tier strategy

I am the founder of an early-stage SaaS company in this category. I am gathering a small number of independent assessments to inform strategic and capital-formation decisions. I have sent this same brief to a handful of human analysts. Please produce **your own independent written market assessment** — do not optimize to please me; disagree where the evidence warrants.

**How to behave:**

- Be specific and data-grounded. Where you cite a number, identify the source category and your confidence level.
- Do not invent figures. If you do not know, say so and propose how to find out.
- Be willing to disconfirm my framing. Your value to me is highest when you challenge what I have asserted.
- Where I have provided operating priors from a prior business (Section 6, question 8), treat them as data points to test against, not assumptions to inherit uncritically.
- Length target: equivalent to 8–15 pages. Use markdown headings and tables freely.

---

## 1. Purpose

I am seeking an independent market assessment to inform strategic and capital-formation decisions. The deliverables I want are described in Section 6.

---

## 2. Company overview

### Why this product exists

The category's deepest psychological hook is the dream of financial freedom through real estate. The influencer ecosystem (creator-led real-estate education) sells that dream at scale but stops at education and inspiration. Property listing portals supply inventory at scale but offer no structuring know-how. Users motivated by the dream freeze at the "what next?" moment when looking at a real listing — they have aspiration and inventory, but no bridge between them.

**This product is the bridge.** Every feature exists to convert "I want financial freedom through real estate" into "here is the structured offer I'm sending on this specific property."

### Category

Vertical SaaS for residential real-estate investors in the United States.

### Product

A web and mobile application that takes any US property address as input and returns, within seconds:

1. A **multi-source valuation** drawn from several third-party data providers, expressed as a percentage gap between verified value and asking price, with a plain-English explanation of each input.
2. A set of **pre-structured offer scenarios** showing how a given property could close — under price-only, capital-only, financing-only, income-re-verification, or blended terms.
3. A **per-scenario negotiation script** designed to be printed, emailed, or copied to clipboard.
4. **Strategy worksheets** modeling the property under six investment strategies (long-term rental, short-term rental, BRRRR, fix-and-flip, house hack, wholesale).

### Architecture

Single codebase deployed to web, iOS, and Android. Web checkout via a standard payment processor; mobile in-app purchase via a third-party subscription platform.

### Position in the market

The product sits between two established categories:

- **Property listing portals** stop at price discovery.
- **Investor calculator tools** stop at cash-flow analysis.

Our product extends past both into **offer structuring and negotiation enablement** — converting a marginal listing into a credible, structured offer in minutes rather than the multi-hour spreadsheet workflow investors currently use.

### What we deliberately do not do

- We do not provide financial, legal, or investment advice.
- We do not currently model wraparound mortgages or land contracts (deferred pending state-by-state legal review).
- We do not claim every property is a deal — only that every property has more leverage than its asking price suggests.

---

## 3. Target audience

We see two **co-primary personas**. They share an underlying motivation (the dream of financial freedom through real estate) and differ in proximity to action. Both must be served by the same product surface.

### Co-primary persona A — the active residential investor

| Attribute | Profile |
|---|---|
| Portfolio size | 1–50 doors, or pre-first-acquisition within ~6 months |
| Volume behavior | Analyzes 20–100 properties per year; closes 1–3 |
| Asset class | Single-family and 2–4-unit multifamily; occasional short-term rental |
| Knowledge | Familiar (or actively learning) creative-finance terms — Subject-To, seller carry, 0% second mortgages, rate buydowns, assumable mortgages, FHA house-hack |
| Job-to-be-done | Move from "scrolling listings" to "structuring offers" without a spreadsheet rebuild per property |
| Distribution surfaces | Real-estate investing forums, REI subreddits, creator-led investor communities (Pace Morby / Subto / Gator orbits), local meetups, real-estate Twitter/X, niche YouTube |

**Willingness-to-pay driver.** Investors *can already analyze* — spreadsheets and forums solve that. What they cannot do at speed is convert a marginal listing into a defensible offer script before another bidder does. The synthesis-under-time-pressure step is the price-insensitive part of the workflow.

### Co-primary persona B — the curious enthusiast / aspiring investor

> Founder's prior operating experience in an adjacent real-estate-data category indicates this segment was approximately **60% of paid subscribers**. Treat as co-primary, not tertiary.

| Attribute | Profile |
|---|---|
| Status | Pre-acquisition; may never acquire. Researching real estate as a wealth-building category, or exploring the market for its own sake. |
| Behavior | Runs verdicts on properties for curiosity — homes they grew up in, listings they drove past, neighborhoods they're tracking, viral listings. Treats the instant-analysis experience as part-tool, part-entertainment. |
| Motivation | Market literacy, wealth-building education, neighborhood-level curiosity. Higher engagement frequency, lower transactional intent. |
| Distribution surfaces | Real-estate "doomscrolling" audiences on TikTok / Instagram / YouTube, financial-literacy creator orbits, casual users of major listing sites, personal-finance subreddits and newsletters. |
| Monetization profile | Lower willingness-to-pay for the active-investor price tier; potentially addressable via a lower-priced consumer tier, ad-supported free experience, or content / lead-magnet funnels into the primary product. |
| Strategic role | Top-of-funnel volume, viral surface area, SEO compounding, and a forcing function for product simplicity. A non-trivial fraction is expected to graduate to the active-investor persona over time. |

### Secondary segments

| Segment | Hook |
|---|---|
| Wholesalers | Fast verdicts on off-market leads; assignment-fee math |
| House hackers | First-time buyers running FHA scenarios |
| Cold-market buy-and-hold investors | Price negotiation + seller-financing structures |
| Coaches / educators *(channel partners, not end users)* | A live tool that proves their teaching curriculum on real properties — high-leverage distribution |

### Disqualifiers

- Spreadsheet-power-users with bespoke models who do not want a tool's opinion.
- Passive investors looking for syndications / REITs.
- Pure 70%-rule MLS flippers (better served by comp tools).
- Anyone seeking financial / legal / investment *advice*.

---

## 4. Pricing strategy

### Tier structure

| Tier | Monthly price | Annual price | Effective monthly (annual) |
|---|---:|---:|---:|
| Starter (Free) | $0 | $0 | $0 |
| Pro | $39.99 | $349.99 | $29.17 |

- The free tier requires no signup and no payment method to receive a baseline valuation result. Paid tier gates strategy worksheets, negotiation scripts, exports, and saved properties.
- Annual pricing is set at a ~27% discount to month-to-month to incentivize annual conversion and reduce churn.
- Single paid tier in v1 (no SKU stratification yet).

### Channel economics

| Channel | Processing fee | Net revenue per paid month |
|---|---|---:|
| Web checkout | 2.9% + $0.30 / transaction | $38.53 |
| iOS in-app purchase | 15% commission (small-business program) | $33.99 |
| Android in-app purchase | 15% commission | $33.99 |

**Channel mix planning assumption:** ~52% web monthly / ~28% web annual / ~13% iOS monthly / ~7% iOS annual → blended net ARPU **$34.12 / month**.

### Positioning intent

- Mid-market price band — above commodity calculator tools, below creative-finance coaching subscriptions.
- Intended to read as a **professional tool**, not a hobbyist calculator.
- Free entry analysis is the conversion event; the result itself is the marketing artifact (shareable, SEO-friendly).

---

## 5. Competitive landscape (our current view, for you to challenge)

| Tier | Examples | Where they stop |
|---|---|---|
| Listing portals | Major US listing sites | Price discovery |
| Investor calculator tools | Established residential-investor calculators | Cash-flow analysis |
| Comp / AVM data tools | Investor-facing data and lead-list providers | Data — silent on synthesis or negotiation |
| **This company** | — | Verdict → structured offers → negotiation script → strategy worksheet |

We believe the **synthesis layer** (verdict → structured offer set → script) is the defensible wedge, but that view should be challenged.

---

## 6. What I am asking you to deliver

A written market assessment of approximately 8–15 pages (or equivalent), addressing each of the following in order. Use clear section headers.

**1. Addressable market sizing.** TAM / SAM / SOM for the segment described in §3, with sources and methodology shown. Where US-investor population data is contested, present the range and the assumptions behind each end of it.

**2. Growth trends.** Macro and category-specific tailwinds and headwinds over a 3-year horizon. Particular interest in: interest-rate environment effects on creative-finance demand; the role of creator-led investing communities in adoption; mobile-vs-desktop investor workflow trends.

**3. Competitive landscape.** Independent characterization of the incumbents in each tier above, including any incumbents we have likely missed. For each, assess: feature overlap, distribution advantage, pricing posture, and the realistic likelihood of them building into the synthesis layer themselves within 18 months.

**4. Pricing assessment.** Is the $39.99 / $349.99 single-tier structure well-positioned for the personas described? Specifically: (a) is the price point too high, too low, or appropriately positioned vs. willingness-to-pay; (b) should there be a second paid tier, and if so what should it gate; (c) what discount/incentive levers most reliably reduce prosumer-SaaS churn in this category.

**5. Audience validation.** Are the two co-primary personas as described an accurate representation of the buying segment, or is your read of the market different? Is the willingness-to-pay driver (synthesis-under-time-pressure for the active investor; aspiration-fueled curiosity for the enthusiast) the right anchor, or is something else doing more of the work?

**6. Top three risks to the thesis.** Ranked, with reasoning. Disconfirming views explicitly welcomed.

**7. Top three opportunities not in our current plan.** Adjacencies, distribution levers, or partnerships you would prioritize.

**8. Two-segment monetization, trial mechanics, and CAC envelope.**

> Founder's prior 24-year operating experience in an adjacent real-estate-data category produced these operating priors:
>
> - ~**60%** of paid subscribers were curious / aspiring investors rather than active deal-hunters.
> - **Median paid tenure ~3 months**, with ~5% becoming multi-year payers.
> - **7-day free trial converted to paid at 48%–52%** every single month for 24 years — never outside that band.
> - **CAC was approximately one month of subscription revenue** ("1 × 3" — one month of CAC for three months of paid tenure), implying a **1-month payback period**.

Please:

- **(a)** Assess whether this audience composition is likely to replicate in our product, given a more universal and more engaging product hook (instant scan/verdict on any address vs. niche foreclosure listings).
- **(b)** Model expected LTV for each of the two segments using the historical anchors as a starting prior. Identify which assumptions you would adjust upward or downward for our broader, more entertaining product hook.
- **(c)** Evaluate trial-vs-freemium not as a binary but as a **two-stage funnel** question: (i) free verdict / no-signup as top-of-funnel for maximum reach, (ii) 7-day Pro trial as the upgrade path for engaged users. Specifically: do you expect the historical 48–52% trial-to-paid number to replicate today with this audience, and what is the expected paid-subs-per-dollar of marketing spend under each funnel design?
- **(d)** Recommend a tier structure (single tier vs. two-tier consumer/pro) that maximizes blended ARPU without diluting positioning with the active-investor persona.
- **(e)** Assess whether the historical CAC anchor (≤1× monthly ARPU) is achievable in 2026 across the channels we would realistically use (founder-led organic on investor forums and creator orbits, paid social, paid search, content/SEO, App Store paid acquisition); identify channels most/least likely to come in at or below that ceiling; and provide implied marketing-budget envelopes to reach 1,000 / 5,000 / 25,000 paid subscribers under each channel mix.

**9. Bridge-positioning thesis and creator-channel strategy.**

We position the product as the **bridge between real-estate influencers** (who sell the financial-freedom dream and create aspiration at scale, but provide no tooling on real inventory) **and property inventory** (which exists everywhere but does not come with structuring know-how). Please:

- **(a)** Assess whether this "bridge between aspiration and inventory" framing is defensible as a category position, or whether you see a more accurate framing of the user's underlying motivation.
- **(b)** Evaluate the strategic case for a formal **creator-channel partner program** — revenue share, co-branded landing pages, embedded CTAs in creator content ("run this address yourself") — and which segments of the creator ecosystem (large general-audience financial-literacy creators vs. niche real-estate-specific creators) offer the best risk-adjusted partnership ROI.
- **(c)** Evaluate the **retention thesis**: if the historical 3-month median tenure was driven by the post-signup "what next?" gap, and our product closes that gap with structured offer paths and negotiation scripts, can we credibly forecast median tenure materially above 3 months? What would be the leading indicator for that, and at what subscriber sample size could you conclude the thesis is working or failing?

**Out of scope.** I am *not* asking for revenue projections, financial modeling, fundraising strategy, or product roadmap recommendations. I have those internally and want your view kept independent of them.

---

## 7. Output format

- Markdown, with clear section headers matching the question numbers above.
- Use tables for comparative analysis (TAM/SAM/SOM, competitor matrices, channel CAC ranges).
- Where you cite a figure, identify the source category (industry report / public filing / your training data / inference from analogous categories) and your confidence level (high / medium / low).
- Where you disagree with a framing in this brief, say so explicitly and offer the alternative.
- End with a one-paragraph **executive judgment**: at the level of "would I, as an analyst, advise the founder to proceed, pivot, or pause?" — and the single most important decision the founder should make next.

---

Please confirm you have read the brief and proceed to deliver Section 6.
