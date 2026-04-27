# Investor discount cohorts (DealGapIQ probability)

This document defines how DealGapIQ maps **Deal Gap %** to **cumulative investor probability**
(the estimated share of investors who historically close at that discount depth **or deeper**, relative to original list).

## Inputs

| Input | Purpose |
|-------|---------|
| **Deal Gap %** | `(list_price - target_buy) / list_price × 100`. Positive = discount needed below list to hit Target Buy. |
| **State** (optional) | Two-letter U.S. code. Selects one of three regional cohort distributions; if missing or invalid, use **national** baseline. |

Verdict **score** (0–100) still uses **national** bracket interpolation only (stable grades). Only the **probability headline** is regional.

## Regional cohorts

State → cohort mapping lives in [`backend/app/core/regions.py`](../backend/app/core/regions.py).

| Cohort key | Display label | Geographic scope (summary) |
|------------|---------------|----------------------------|
| `national` | U.S. | Default when state unknown |
| `sun_belt` | Sun Belt | See `SUN_BELT_STATES` in `regions.py` |
| `midwest_affordability` | Midwest | See `MIDWEST_AFFORDABILITY_STATES` |
| `coastal_northeast` | Coastal / Northeast | See `COASTAL_NORTHEAST_STATES` + DC |

## Distributions (mutually exclusive % of closed deals)

Each tuple is **(at or above list, 0–5% below, 6–10%, 11–20%, 21–30%, 31–40%, 41%+)**. Percentages sum to **100%**.

Defined in [`backend/app/services/iq_verdict_service.py`](../backend/app/services/iq_verdict_service.py) as `REGIONAL_COHORT_PERCENTAGES`.

| Region | Shares |
|--------|--------|
| National | 19 / 32 / 24 / 16 / 5.5 / 2.5 / 1 |
| Sun Belt | 15 / 25 / 25 / 22 / 8 / 3 / 2 |
| Midwest | 25 / 30 / 23 / 14 / 5 / 2 / 1 |
| Coastal / Northeast | 35 / 35 / 16 / 9 / 3 / 1.5 / 0.5 |

## Cumulative probability math

For Deal Gap \(D > 0\):

1. For each positive discount-depth bin \((L, U]\) with cohort weight \(p\), assume **uniform** discount within the bin (same structure as score brackets).
2. Add the fraction of \(p\) for which closing discount \(\geq D\).
3. Round to an integer percent and clamp to **[1, 99]** for display (except \(D \leq 0\) → **100%** — at or above list).

Implementation: `_get_cumulative_investor_pct()` in `iq_verdict_service.py`.

## Sources and caveats

- **Redfin** full-year 2025 MLS analysis: sale-to-list distribution (all buyers baseline).
- **Cotality** Q4 2025 Home Investor Report: investor share and cash-driven below-list behavior.
- **Realtor.com** Q1 2026 Market Clock: buyer/seller fragmentation.

Public reports **do not** publish investor-only discount brackets at the exact granularity we use. Regional tables are **calibrated** to those sources and normalized to sum to 100%; they are best-effort for product UX, not a peer-reviewed dataset.

**Refresh:** Revisit cohorts annually when Redfin/Cotality publish full-year investor and sale-to-list statistics (target: Q1 after each calendar year).
