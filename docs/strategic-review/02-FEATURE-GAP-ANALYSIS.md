# DealGapIQ — Competitive Feature Gap Analysis

**Date:** June 10, 2026
**Benchmark set:** DealCheck ($10–29/mo, free tier), Mashvisor ($17.99–74.99/mo), PropStream ($99/mo), BiggerPockets Pro ($39/mo), AirDNA/PriceLabs ($20+/mo, STR-specific), Stessa (free/$20+, portfolio).
**DealGapIQ position:** Starter (free, 3 analyses/mo) + Pro Investor ($39.99/mo, $349.99/yr, 7-day trial).

---

## 1. Market Positioning Map

The market splits into **data acquisition** (PropStream), **deal underwriting** (DealCheck, BiggerPockets), **market intelligence** (Mashvisor, AirDNA), and **portfolio tracking** (Stessa). Most investors stitch 2–3 tools together.

DealGapIQ's actual differentiation (verified in code, not marketing):

1. **Negotiation-centric analytics** — Deal Gap, Target Buy, and achievability scoring calibrated against investor-discount cohort brackets. No benchmarked competitor frames analysis around *what to offer and how likely the seller is to accept*.
2. **Creative-finance structure engine** ("Three/Four Paths") — seller seconds, Sub2, rate buydowns, assumables, FHA house-hack, blended plans — with generated pitch scripts. **Unique in the benchmark set.**
3. **Multi-source IQ Estimate** with transparent source switching (RentCast + Zillow + Redfin + Realtor) — more defensible than single-AVM competitors.
4. **All six strategies analyzed simultaneously** per address (LTR, STR, BRRRR, Flip, House Hack, Wholesale) — DealCheck makes the user pick a strategy first.

DealGapIQ is priced at BiggerPockets Pro levels ($39.99) with DealCheck-class underwriting depth plus a unique negotiation layer. The price is defensible **only if** the trust and data-coverage gaps below are closed.

---

## 2. Feature Gap Matrix

Legend: ✅ strong · 🟡 partial/weak · ❌ absent

| Capability | DealGapIQ | DealCheck | Mashvisor | PropStream | BP Pro |
|---|---|---|---|---|---|
| **Underwriting & analysis** | | | | | |
| Rental (LTR) analysis | ✅ | ✅ | ✅ | 🟡 basic | ✅ |
| STR/Airbnb analysis | 🟡 *engine built, but Mashvisor disabled → ADR/occupancy fabricated* | ✅ | ✅ core strength | ❌ | 🟡 |
| BRRRR | ✅ | ✅ | ❌ | ❌ | ✅ |
| Fix & Flip | ✅ | ✅ | ❌ | 🟡 | ✅ |
| House Hack | ✅ | 🟡 | ❌ | ❌ | 🟡 |
| Wholesale (MAO, LOI, assignment) | ✅ | 🟡 | ❌ | 🟡 | 🟡 |
| Multi-strategy simultaneous compare | ✅ unique | ❌ | 🟡 LTR vs STR | ❌ | ❌ |
| Long-horizon projections | 🟡 10-yr proforma | ✅ **35-yr** with appreciation/rent growth | 🟡 | ❌ | ✅ |
| IRR / DCR / advanced return metrics | 🟡 DSCR yes; **IRR absent** | ✅ IRR + DCR | 🟡 | ❌ | ✅ |
| Sensitivity analysis | ✅ (Pro) | 🟡 | ❌ | ❌ | ❌ |
| **Negotiation & offers** | | | | | |
| Target Buy / offer recommendation | ✅ unique | 🟡 max offer calc | ❌ | ❌ | 🟡 |
| Deal achievability score (seller-context) | ✅ unique | ❌ | ❌ | ❌ | ❌ |
| Creative finance structures + pitch scripts | ✅ unique | ❌ | ❌ | ❌ | ❌ |
| Seller motivation scoring | ✅ | ❌ | ❌ | ✅ Propensity-to-Transact | ❌ |
| **Data & discovery** | | | | | |
| Address-level valuation (multi-AVM) | ✅ 4 sources | 🟡 | 🟡 | ✅ | ❌ |
| Sale/rent comps | ✅ + weighted appraisal grid | ✅ | ✅ | ✅ deepest | 🟡 |
| Map-based deal search | ✅ | ❌ | ✅ heatmaps | ✅ core | ❌ |
| Off-market/distress lead filters | 🟡 motivated-seller keywords, owner tenure | ❌ | ❌ | ✅ 120+ filters, liens, foreclosure | ❌ |
| Owner data / skip tracing | ❌ | ❌ | ❌ | ✅ (add-on) | ❌ |
| Neighborhood/market scores | 🟡 market temp, DOM | ❌ | ✅ Mashmeter | 🟡 | ❌ |
| **Workflow & retention** | | | | | |
| Deal pipeline / CRM | ✅ Kanban, tasks, docs, budgets | 🟡 saved deals | ❌ | 🟡 lists | ❌ |
| Portfolio tracking (owned assets) | 🟡 sold/held stages only | 🟡 | ❌ | ❌ | 🟡 (Stessa wins) |
| Cash buyer / lender directories | ✅ 2,800+ buyers, 484 lenders | ❌ | ❌ | ❌ | 🟡 community |
| Branded PDF/Excel reports | ✅ (Pro) | ✅ branded on Pro | 🟡 | 🟡 | ✅ |
| Price/market alerts | ❌ *email templates exist, not wired* | ✅ | 🟡 | ✅ | ❌ |
| Mobile app | ✅ Capacitor iOS/Android + IAP | ✅ 4.8★ native | 🟡 | ✅ | 🟡 |
| **Platform** | | | | | |
| Free tier | ✅ 3 analyses/mo | ✅ | ❌ trial only | ❌ | ✅ |
| API access for power users | ❌ | ❌ | 🟡 | 🟡 | ❌ |
| Team/multi-seat | ❌ (`TEAM_SHARE` enum stub only) | 🟡 | ❌ | ✅ | ❌ |

---

## 3. Gap Assessment — Prioritized

### Tier 1: Gaps that directly threaten the $39.99 price point

| Gap | Why it matters | Effort signal |
|-----|----------------|---------------|
| **STR data is fabricated in production** (Mashvisor off; $200 ADR / 75% occupancy hardcoded) | Mashvisor and AirDNA win every STR comparison today. Shipping a 6-strategy product where 1 of 6 runs on invented numbers is a churn and credibility risk. Either re-enable a real STR source (Mashvisor RapidAPI ~$18–75/mo, or AirDNA API) or visibly mark STR as "estimate unavailable." | Integration exists; this is a config + data-cost decision |
| **IRR missing** | DealCheck markets IRR/DCR as table stakes for financed deals in a 6%+ rate environment. The 10-yr proforma already computes the cash-flow series; IRR is an incremental calculation. | Low — proforma series already exists |
| **35-yr / loan-term projections** | DealCheck's 35-year hold modeling is a cited differentiator. Extending the existing 10-yr engine is incremental. | Low–medium |
| **Alerts not wired** (email templates + prefs UI exist; no trigger pipeline, no push token registration) | Alerts are the #1 re-engagement mechanic competitors use. The investment is 80% complete and idle. | Medium — wiring, not building |

### Tier 2: Differentiation amplifiers (lean into what's unique)

| Opportunity | Rationale |
|-------------|-----------|
| **Market the Four Paths engine as the hero feature** | It is the only genuinely unique capability in the benchmark set and is buried behind Discovery. No competitor generates seller pitch scripts. |
| **Deal Gap as a public/shareable artifact** | A shareable "this listing is 12% over its income value" card is organic acquisition no competitor offers. |
| **Wholesale disposition loop** (buyer directory → LOI → assignment) | PropStream owns acquisition; nobody owns disposition. The buyer directory + LOI scaffolding exists — but LOI has no persistence (4 TODOs) and must be finished. |
| **Verified STR + LTR side-by-side per address** | Mashvisor's core pitch, but DealGapIQ can layer it onto the negotiation stack — once STR data is real. |

### Tier 3: Deliberate non-goals (do not chase)

- **Skip tracing / owner contact data** — PropStream's moat; capital-intensive data licensing; different buyer persona (marketers vs. underwriters).
- **Property management features** — Buildium/Stessa territory; dilutes positioning.
- **Commercial/ARGUS-class modeling** — wrong segment.

---

## 4. Pricing Benchmark

| Product | Entry | Mid | Notes |
|---------|-------|-----|-------|
| DealCheck | Free | $10–29/mo | 14-day trial; price anchor for "calculator" perception |
| Mashvisor | — | $17.99–74.99/mo | Annual saves ~35% |
| PropStream | — | $99/mo | Data play, add-on pricing |
| BiggerPockets Pro | Free community | $39/mo ($390/yr) | Closest price neighbor |
| **DealGapIQ** | **Free (3/mo)** | **$39.99/mo ($349.99/yr)** | 7-day trial |

**Assessment:** $39.99 is 2× DealCheck's top tier. The justification must be the negotiation layer + multi-strategy verdict + directories — which requires (a) the STR data gap closed, (b) the fabrication issues fixed, and (c) the Four Paths engine promoted from buried feature to headline. Consider a future mid-tier (~$19–24/mo: unlimited analyses, no directories/exports) to capture the DealCheck-price-sensitive segment; the `TIER_LIMITS` model and Stripe plumbing already support adding a tier.

---

## 5. Competitive Moat Summary

| Moat candidate | Durability |
|----------------|-----------|
| Investor-discount cohort scoring (regional brackets) | Medium-high — data + methodology, hard to copy quickly |
| Four Paths creative-finance engine + pitch scripts | High — deep domain encoding, no competitor analog |
| Multi-source IQ Estimate | Medium — replicable but expensive (4 API contracts) |
| Buyer/lender directories | Medium — 2,800 buyers is a real asset; needs freshness process |
| Brand/SEO (comparison pages vs DealCheck/PropStream/Mashvisor already live) | Compounding if maintained |
