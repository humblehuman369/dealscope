# /answers pages — Google Search launch kit

> Paste-ready values for the Google Search campaign that matches the four
> Meta launch personas. Strategy and kill/scale rules live in
> `DIRECT_RESPONSE_PLAYBOOK.md` §5; this file carries the exact strings to
> enter. Headlines and agitate sentences are lifted from
> `frontend/src/lib/seo/problem-pages.ts`. If a page changes, regenerate
> this from the page, not the reverse.
>
> Launch four groups, not eight. $15/day each. Matched to the Meta personas
> so the persona scoreboard reads across both channels.

**State on 2026-09-07**

| Item | Status |
|---|---|
| `/answers/*` live on production | Done |
| Conversion action `verdict_viewed` imported from GA4 or PostHog | Pending |
| Campaign `answers-search` | Values below; create in Google Ads |

---

## 1. Campaign

| Field | Value |
|---|---|
| Name | `answers-search` |
| Type | **Search only**. No Display. No Search Partners. |
| Location | United States |
| Language | English |
| Bidding | Manual CPC, or Maximize Clicks with a **$5** bid cap for the first two weeks. Switch to Maximize Conversions once `verdict_viewed` has 30+ in a week. |
| Ad groups | one per page, named exactly the slug, **$15/day** each |
| Auto-tagging | On (keeps `gclid`) |
| Spend | $60/day across four groups. Counts toward the $2,500 six-week cap in `LISTICLE_META_LAUNCH_KIT.md` §2.2. |

---

## 2. Ad groups

Each group: Headline 1 = page H1 verbatim (pinned position 1). Headline 2 =
`Free verdict. No signup. No card.` (pinned position 2). Headline 3 =
`15 seconds from address to answer`. Description 1 = the page's agitate
sentence. Description 2 = `We analyze. You decide.`

Final URL:
`https://dealgapiq.com/answers/<slug>?utm_source=google&utm_medium=cpc&utm_campaign=<slug>`

### 2.1 `does-this-rental-cash-flow`

Persona match: house hackers / first-time rental buyers.

| Field | Value |
|---|---|
| H1 | Does this rental cash flow? |
| Agitate | Most listings do not, once property tax, vacancy, insurance and reserves come off the top of the rent. A spreadsheet takes 45 minutes per property and still depends on the rent you typed in. |

**Keywords** (exact `[ ]` and phrase `" "`):

| Match | Keyword |
|---|---|
| Exact | `[does this rental cash flow]` |
| Exact | `[will this rental cash flow]` |
| Exact | `[does this property cash flow]` |
| Phrase | `"rental property cash flow"` |
| Phrase | `"does this rental cash flow"` |
| Phrase | `"rental cash flow calculator"` |
| Phrase | `"will this rental cover the mortgage"` |
| Phrase | `"positive cash flow rental"` |
| Phrase | `"how much cash flow will this rental produce"` |
| Phrase | `"rental property cash flow check"` |

### 2.2 `what-should-i-offer-on-this-house`

Persona match: out-of-state / first-time offer.

| Field | Value |
|---|---|
| H1 | What should I offer on this house? |
| Agitate | Offer too high and the deal never cash flows. Offer too low with no reason attached and the seller stops answering. Most investors guess a percentage off list and hope. |

**Keywords:**

| Match | Keyword |
|---|---|
| Exact | `[what should I offer on this house]` |
| Exact | `[what should I offer on this investment property]` |
| Exact | `[how much should I offer on a rental]` |
| Phrase | `"what should I offer on this house"` |
| Phrase | `"target buy price rental"` |
| Phrase | `"max offer investment property"` |
| Phrase | `"how much to offer on a rental property"` |
| Phrase | `"offer price for investment property"` |
| Phrase | `"what's my max offer if I need cash flow"` |
| Phrase | `"how do I know if I'm overpaying for a rental"` |

### 2.3 `seller-wont-lower-the-price`

Persona match: creative-finance buyers.

| Field | Value |
|---|---|
| H1 | The seller won't lower the price. Is there another way? |
| Agitate | A 6% price cut is a no. Walking away is the default. But the same math can be reached with three smaller asks the seller can actually say yes to, and most investors never put them on the table. |

**Keywords:**

| Match | Keyword |
|---|---|
| Exact | `[seller won't lower the price]` |
| Exact | `[seller won't drop the price]` |
| Exact | `[seller financing when seller says no]` |
| Phrase | `"seller won't lower the price"` |
| Phrase | `"seller won't negotiate on price"` |
| Phrase | `"creative finance when seller says no"` |
| Phrase | `"seller carryback instead of price cut"` |
| Phrase | `"subject to when seller won't drop price"` |
| Phrase | `"three smaller asks instead of a price cut"` |
| Phrase | `"seller financing pitch"` |

### 2.4 `should-i-wholesale-this-deal`

Persona match: wholesalers.

| Field | Value |
|---|---|
| H1 | Should I wholesale this deal or keep it? |
| Agitate | An assignment fee today or cash flow for a decade. Choosing wrong on a good lead is expensive either way, and the answer depends on numbers most wholesalers estimate in their head. |

**Keywords:**

| Match | Keyword |
|---|---|
| Exact | `[should I wholesale this deal]` |
| Exact | `[wholesale or keep this property]` |
| Exact | `[should I assign this contract]` |
| Phrase | `"should I wholesale this deal"` |
| Phrase | `"wholesale vs hold vs flip"` |
| Phrase | `"assignment fee vs cash flow"` |
| Phrase | `"what will a cash buyer pay for this house"` |
| Phrase | `"how to calculate an assignment fee"` |
| Phrase | `"MAO on an off-market lead"` |
| Phrase | `"should I wholesale or keep it"` |

---

## 3. Campaign-level negatives

Load on day one. State names are negatives because `/markets/[state]`
handles that intent organically.

```
jobs
salary
career
course
free download
template
excel
spreadsheet
license
exam
near me
for sale
zillow
redfin
realtor
alabama
alaska
arizona
arkansas
california
colorado
connecticut
delaware
florida
georgia
hawaii
idaho
illinois
indiana
iowa
kansas
kentucky
louisiana
maine
maryland
massachusetts
michigan
minnesota
mississippi
missouri
montana
nebraska
nevada
new hampshire
new jersey
new mexico
new york
north carolina
north dakota
ohio
oklahoma
oregon
pennsylvania
rhode island
south carolina
south dakota
tennessee
texas
utah
vermont
virginia
washington
west virginia
wisconsin
wyoming
district of columbia
```

---

## 4. Kill and scale

**Kill rule.** 200 clicks and verdict rate under 6% → pause the group.
Rewrite the page H1 first (that is where the transcript's 4x came from),
not the bids, not the keywords. Zero verdicts in 200 clicks means something
is broken, not underperforming.

**Scale rule.** Same as Meta: a group whose `verdict_viewed → signup_completed`
rate beats the site average two weeks running inherits the killed budget.

---

## 5. PostHog

DR-C funnels already exist per `/answers` slug
(`DIRECT_RESPONSE_PLAYBOOK.md` §6.1). Add a breakdown by `ft_utm_medium` so
`cpc` reads separately from organic on the same page.

DR-F style scoreboard for search (optional clone of the persona SQL):

```sql
SELECT
    coalesce(nullIf(properties.ft_utm_campaign, ''), '(none)') AS campaign,
    coalesce(nullIf(properties.ft_utm_medium, ''), '(none)')   AS medium,
    coalesce(nullIf(properties.ft_landing_path, ''), '')        AS landing_path,
    countIf(event = 'property_searched')                         AS address_submits,
    countIf(event = 'verdict_viewed')                            AS verdicts,
    countIf(event = 'verdict_email_captured')                    AS emails,
    countIf(event = 'signup_completed')                          AS signups,
    round(signups / nullIf(verdicts, 0), 3)                      AS signup_rate
FROM events
WHERE timestamp > now() - INTERVAL 7 DAY
  AND event IN ('property_searched', 'verdict_viewed', 'verdict_email_captured', 'signup_completed')
  AND properties.ft_landing_path LIKE '/answers/%'
GROUP BY campaign, medium, landing_path
ORDER BY verdicts DESC
```

Cost per verdict and cost per signup are computed in
`WEEKLY_PAID_REVIEW.md` from `docs/marketing/spend.csv` joined on campaign
name. PostHog cannot read ad spend.

---

## 6. Before pressing Publish

- [ ] Campaign is Search only. Display and Search Partners are off.
- [ ] Four ad groups named exactly the slugs above. $15/day each.
- [ ] Headline 1 is the page H1, pinned. Headline 2 is `Free verdict. No signup. No card.`, pinned.
- [ ] Final URL is `/answers/<slug>` with the UTMs above, not `/`.
- [ ] Auto-tagging is on.
- [ ] Campaign-level negatives loaded, including every US state name.
- [ ] Conversion action for `verdict_viewed` exists (or Maximize Clicks is on until it does).
- [ ] Bid cap is $5 if using Maximize Clicks.
- [ ] This spend is counted toward the $2,500 six-week cap.

---

## Changelog

| Date | Change |
|---|---|
| 2026-09-07 | v1. Four groups at $15/day, keywords written out, negatives listed, kill at 200 clicks and <6% verdict rate. |
