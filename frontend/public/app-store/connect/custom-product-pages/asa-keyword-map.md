# Apple Search Ads → Custom Product Page Map

Pair each ASA ad group with the matching CPP so the creative matches search intent.
Budget guidance from [`docs/operations/APP_LAUNCH_RUNBOOK.md`](../../../../../docs/operations/APP_LAUNCH_RUNBOOK.md) Phase 6 (~$45/day).

After ASC approves each CPP, paste the unique product-page URL in the **CPP URL** column.

| ASA campaign / ad group | Match | Keywords (starter) | CPP | CPP URL |
|---|---|---|---|---|
| Brand defense | Exact | `dealgapiq`, `deal gap iq`, `deal gap` | Default listing *(or Deal Gap)* | _(default)_ |
| Core discovery | Broad → Exact winners | `real estate deals`, `investment property`, `property analysis`, `real estate investing app` | **Deal Gap** | `TODO_ASC_URL_deal-gap` |
| Distressed / off-MLS | Exact + Broad | `foreclosure`, `pre foreclosure`, `preforeclosure`, `foreclosure listings`, `auction homes`, `tax auction`, `off market properties` | **Foreclosure & Auction** | `TODO_ASC_URL_foreclosure` |
| Rental / cash flow | Exact + Broad | `rental property`, `cash flow`, `cashflow`, `roi calculator`, `rental analysis`, `cap rate`, `landlord` | **Rental Cash Flow** | `TODO_ASC_URL_rental` |
| Flip / ARV | Exact + Broad | `fix and flip`, `house flipping`, `arv`, `comps`, `rehab estimator` | **Fix & Flip** | `TODO_ASC_URL_flip` |
| BRRRR (→ Flip CPP) | Exact | `brrrr`, `brrrr calculator`, `brrrr method` | **Fix & Flip** | `TODO_ASC_URL_flip` |
| Wholesale (→ Flip CPP) | Exact | `wholesale real estate`, `wholesaling houses`, `assignment fee` | **Fix & Flip** | `TODO_ASC_URL_flip` |
| Competitor conquest | Exact | `dealcheck`, `mashvisor`, `propstream`, `biggerpockets`, `rehab estimator` | **vs Calculators** | `TODO_ASC_URL_competitor` |
| Search Match | Apple | _(discovery)_ | **Deal Gap** | `TODO_ASC_URL_deal-gap` |

## Suggested daily budget split (~$45)

| Bucket | $/day | CPPs used |
|---|---|---|
| Brand defense | $5 | Default |
| Core discovery + Search Match | $20 | Deal Gap |
| Distressed + Rental + Flip | $10 | Foreclosure / Rental / Flip (split by CPA) |
| Competitor conquest | $10 | vs Calculators |

## Guardrails

- Pause any keyword > $8 CPI or > $60 cost-per-trial at the 7-day read.
- Promote Search Match winners into dedicated exact ad groups with the matching CPP.
- Never put competitor brand names in App Store promotional text — only in ASA keyword targeting.
