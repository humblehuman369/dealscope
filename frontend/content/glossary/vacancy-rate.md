---
title: "What Is Vacancy Rate? The Single Most Underestimated Number in Rental Underwriting"
slug: vacancy-rate
type: glossary
intent: TOFU
primary_keyword: vacancy rate
secondary_keywords:
  - what is vacancy rate
  - rental vacancy rate
  - vacancy rate formula
meta_title: "Vacancy Rate Explained: What It Includes, How to Estimate It, and the Common Mistake"
meta_description: "Vacancy rate is the percentage of time a rental sits empty. The formula, what to use as a default by market, why investors routinely underestimate it, and what 'economic vacancy' captures that physical vacancy doesn't."
schema: DefinedTerm
status: draft
internal_links:
  - /glossary/noi
  - /glossary/cap-rate
  - /methodology
word_count_target: 700
---

# What Is Vacancy Rate?

Vacancy rate is the percentage of time a rental property sits empty between tenants. It is the single most underestimated assumption in rental underwriting — and the most common reason a deal that looked like 8% cash-on-cash actually delivers 4%.

## The 30-second definition

```
vacancy_rate = days_vacant / 365
            (or)
vacancy_rate = vacant_units / total_units      // for multifamily
```

Vacancy reduces gross rent before any other expense. A property with 5% vacancy on $36,000 of gross rent loses $1,800/year before a single dollar of operating expenses is paid.

## Physical vacancy vs. economic vacancy

These are different — and most investors only model the first.

**Physical vacancy** = days between tenants. A unit between leases for 2 weeks = 4% physical vacancy.

**Economic vacancy** includes everything that reduces actual collected rent below market:

- Days vacant between tenants (physical vacancy)
- Concessions (one month free, etc.)
- Bad debt (unpaid rent that gets written off)
- Below-market rents on existing tenants
- Late payments and partial collections

A property with 5% physical vacancy might have 8–12% economic vacancy after concessions, bad debt, and rent loss during turnover.

## What's a realistic vacancy assumption?

| Market type | Typical vacancy |
|-------------|-----------------|
| Hot rental market (Sun Belt, low DOM) | 3–5% |
| Average U.S. rental market | 5–8% |
| Slower-moving markets | 8–12% |
| Class C/D properties or higher tenant turnover | 10–15% |
| New construction lease-up phase | 20–30% (year 1 only) |

The single most common rookie mistake: assuming 5% vacancy in a market where actual physical vacancy averages 8% and economic vacancy is closer to 12%. That 7-percentage-point error on $36K gross rent = $2,520/year of phantom NOI.

## A real-numbers example

A duplex with $3,200/month rent, $36K gross potential rent.

**Conservative analyst (8% vacancy)**:
- Vacancy loss: $36,000 × 8% = $2,880
- Effective Gross Income: $33,120

**Optimistic analyst (5% vacancy)**:
- Vacancy loss: $36,000 × 5% = $1,800
- Effective Gross Income: $34,200

Same property, $1,080/year delta in NOI. That's a 4% swing in NOI from a single assumption — which moves cap rate, DSCR, and cash-on-cash by similar magnitudes.

## How to estimate vacancy for a specific property

Three sources, in order of usefulness:

1. **Local property manager.** They know real turnover rates and average days vacant in your specific zip code. The single best source.
2. **RentCast / market data.** Average days on market for rentals in the zip code, divided by 365 + an adjustment for non-renewal rates, gives a reasonable proxy.
3. **National averages.** A fallback only — the U.S. residential rental vacancy rate has averaged 6.5% since 2010, but local variance is enormous.

## How DealGapIQ uses it

The default vacancy rate in DealGapIQ's underwriting is **1%** — intentionally conservative to start, because the [Income Value](/methodology) calculation already builds in safety via the Target Buy discount. Pro Investor users override vacancy with their local data on every analysis. See [/methodology](/methodology) for full default assumptions.

[Run a free verdict →](https://dealgapiq.com)

## FAQ

**Is the 5% vacancy rule of thumb still accurate?**
For most U.S. markets in 2026, 5% physical vacancy is close to average. Economic vacancy (including concessions and bad debt) typically runs 7–9%. Use the higher number when underwriting conservatively.

**Should I include vacancy in cash-on-cash but not cap rate?**
Both metrics use NOI, which is calculated on Effective Gross Income (after vacancy). So vacancy is included in both.

**Does vacancy depend on property class?**
Yes, significantly. Class A properties (newer, higher-rent, higher tenant quality) average 3–5% vacancy. Class B average 5–8%. Class C/D average 8–15%. Adjust your assumption to the property's class, not just the market.

---

*Vacancy is one of 27 assumptions DealGapIQ surfaces on every analysis. [Run a free verdict →](https://dealgapiq.com)*

*We analyze. You decide. Not financial, legal, or investment advice.*
