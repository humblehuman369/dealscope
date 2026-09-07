# Weekly paid review

Fill every Monday. The Metrics Analyst bot writes the table from
`docs/marketing/spend.csv` joined to DR-F by campaign name. Until ad-platform
APIs are wired, the CSV is the spend source — PostHog cannot read ad spend.

| channel | campaign/slug | hook | spend | clicks | sessions (DR-B) | verdicts (DR-F) | verdict rate | signups | signup rate | emails captured | cost per verdict | cost per signup | frequency (Meta) | action |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| meta | wholesalers | A | | | | | | | | | | | | |
| meta | wholesalers | B | | | | | | | | | | | | |
| meta | wholesalers | C | | | | | | | | | | | | |
| meta | creative-finance-buyers | A | | | | | | | | | | | | |
| meta | creative-finance-buyers | B | | | | | | | | | | | | |
| meta | creative-finance-buyers | C | | | | | | | | | | | | |
| meta | retarget | save | | | | | | | | | | | | |
| google | does-this-rental-cash-flow | — | | | | | | | | | | | | |
| google | what-should-i-offer-on-this-house | — | | | | | | | | | | | | |
| google | seller-wont-lower-the-price | — | | | | | | | | | | | | |
| google | should-i-wholesale-this-deal | — | | | | | | | | | | | | |

**Cumulative spend vs $2,500 six-week cap:** $____ / $2,500. Stop all paid at the cap regardless of results.

**Decision rules (one line each)**

1. Meta: 300+ link clicks and verdict rate under 5% → pause the ad set; rewrite the headline first.
2. Search: 200 clicks and verdict rate under 6% → pause the ad group; rewrite the page H1 first.
3. Verdict → signup above site average two weeks running → that ad set inherits paused budget.
4. Hook C beats A and B on verdict rate for two weeks on two or more personas → move that persona's budget to its matching `/answers` page.

Action values: `keep` / `kill` / `scale` / `rewrite`.
