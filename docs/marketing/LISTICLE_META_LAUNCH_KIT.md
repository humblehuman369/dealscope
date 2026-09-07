# Listicle pages — Phase 2 launch kit

> Paste-ready values for the two things Phase 2 needs a human logged into
> a third-party console for: the Meta campaign and the PostHog tiles.
> Strategy, rules and targets live in `LISTICLE_LANDING_PAGES.md` §5–§6;
> this file only carries the exact strings to enter. Every claim below is
> lifted from `frontend/src/lib/seo/persona-pages.ts`, which is the copy of
> record. If a page changes, regenerate this from the page, not the reverse.

**State on 2026-09-04**

| Item | Status |
|---|---|
| `/for/*` live on production, `noindex, follow`, not in sitemap | Done (deploy `f0430f8`) |
| CSP allows `connect.facebook.net` | Done |
| `NEXT_PUBLIC_META_PIXEL_ID` in Vercel Production | **Pending: needs the Pixel ID** (§1) |
| LinkedIn carousels + batch-02 | Built and validated; import + approve is §4 |
| PostHog DR-B patch, DR-C ×4, DR-F | Definitions in §3; create in the console |
| Meta campaign | Values in §2; create in Ads Manager. Launch 2 ad sets at $20/day + $5 retargeting. Cap $2,500. |

---

## 1. Pixel ID into Vercel

Events Manager → Data Sources → your pixel → the 15–16 digit ID under the
name. Then, from `frontend/`:

```bash
vercel env add NEXT_PUBLIC_META_PIXEL_ID production   # paste the ID at the prompt
vercel redeploy --prod                                 # or push any commit to main
```

`NEXT_PUBLIC_*` is inlined at build time, so a redeploy is required; the
env var alone changes nothing. Do **not** add it to Preview: preview
deployments would fire real pixel events.

Verify after the deploy, in a browser with analytics cookies accepted:
Events Manager → Test Events → open
`https://dealgapiq.com/for/house-hackers?fbclid=test`, run an address, and
watch for `PageView` then `Lead`. The Meta Pixel Helper extension should
show one pixel, no warnings. If `Lead` does not fire, the consent banner
was not accepted; the pixel is consent-gated and stays off until it is.

Optional but recommended once: Business Settings → Brand Safety → Domains →
add `dealgapiq.com` and verify by **DNS TXT** (no code change). Verified
domains can edit link previews on ads and are what Meta's conversion
configuration is keyed to; it also closes off anyone else claiming the
domain in their Business Manager.

---

## 2. Meta campaign

### 2.1 Campaign

| Field | Value |
|---|---|
| Name | `for-listicles` |
| Objective | **Traffic** (switch an ad set to **Leads** once it has ~50 `Lead` events in a week, per runbook §5) |
| Buying type | Auction |
| Campaign budget | Off (budget sits on each ad set so kill/scale is per persona) |
| A/B test | Off (hooks are compared in PostHog on `ft_utm_content`, not in Meta) |

### 2.2 Ad set defaults

Launch two ad sets at **$20/day**: `wholesalers` and `creative-finance-buyers`.
Add `house-hackers` and `out-of-state-investors` when either launched set
reaches 300 clicks or is paused by the kill rule. Retargeting (§2.6) runs at
**$5/day** from day one. Total starting spend **$45/day**.

At $1–$3 CPC, $20/day yields 50–140 clicks a week; expect the 300-click
read in 2–4 weeks per ad set.

**Spend cap:** first six weeks, all paid channels combined: **$2,500**. The
Monday review stops spend at the cap regardless of results.

| Field | Value |
|---|---|
| Name | exactly the page slug (see 2.3) so it joins to PostHog `ft_utm_campaign` by eye |
| Conversion location | Website |
| Performance goal | Maximize number of landing page views |
| Pixel | the one from §1 |
| Daily budget | **$20** (launch sets). Rotate-in sets also $20. Retargeting $5. |
| Schedule | start next morning 06:00 ET, no end date |
| Location | United States |
| Age | 25–64 |
| Advantage+ audience | Off for the first two weeks (interest stacks below); On once a page has ≥50 verdicts |
| Placements | Advantage+ placements |
| Attribution | 7-day click, 1-day view |
| Special Ad Category fallback | If Meta forces Housing, keep the ad set live, switch Advantage+ audience On, remove interest stacks, and note the date in the changelog. |

### 2.3 Ad sets and ads

Three ads per ad set. **Hook A** = the strongest persona headline. **Hook B**
= the next-best compression of the page. **Hook C** = the plain offer
(identical across all four; the control). Meta's headline field truncates
around 40 characters in feed; every headline below is counted. Primary text
after the first line is the page intro, unedited.

Shared across all ads:

| Field | Value |
|---|---|
| Description (below headline) | `Free verdict. No signup. No card.` |
| Call to action | **Learn more** |
| Website URL | see each ad; `fbclid` is appended by Meta and captured on first touch |
| URL parameters field | leave empty (the UTMs are in the URL itself) |
| Creative | **Primary:** 15-second screen recording (address typed by second 2, Deal Gap by second 6, captions on). Screenshot is the fallback. No stock, no lifestyle shots, no arrows. |

If Hook C wins on verdict rate across two or more personas for two weeks, the
listicle frame is not adding value for that persona. Move that persona's
budget to its matching `/answers` page.

---

#### Ad set `house-hackers`

Interest stack (search in Detailed targeting; use whichever exist):
`Real estate investing`, `BiggerPockets`, `FHA insured loan`, `First-time buyer`, `Duplex`, `Multi-family residential`, `Landlord`.

Creative capture: the **House Hack** strategy card on a duplex verdict, showing effective monthly housing cost after the other unit's rent.

**Ad A — `house-hackers-hookA`**

| Field | Value |
|---|---|
| Headline | `Run the duplex before the pre-approval` (39) |
| Primary text | `8 reasons house hackers check the numbers before the FHA pre-approval`<br><br>`Living in one unit while tenants pay the mortgage is the cheapest way into real estate, but only if the other units cover enough. House hackers who run the address first know what they will actually pay to live there before the lender asks for documents.` |
| URL | `https://dealgapiq.com/for/house-hackers?utm_source=meta&utm_medium=paid_social&utm_campaign=house-hackers&utm_content=hookA` |

**Ad B — `house-hackers-hookB`**

| Field | Value |
|---|---|
| Headline | `What the other unit pays of your mortgage` (40) |
| Primary text | `You see what the rented units cover.`<br><br>`Live rent estimates for the address, scaled to the units you do not occupy. The difference between that and the payment is what the house costs you each month. Run the duplex before you run the pre-approval.` |
| URL | `https://dealgapiq.com/for/house-hackers?utm_source=meta&utm_medium=paid_social&utm_campaign=house-hackers&utm_content=hookB` |

**Ad C — `house-hackers-hookC`** (control; identical across ad sets)

| Field | Value |
|---|---|
| Headline | `Free verdict on any address. No signup.` (39) |
| Primary text | `Paste any US address. In 15 seconds you get the price where the deal works, the Deal Gap to the asking price, and four ways to close it. Free. No account. No card.` |
| URL | `https://dealgapiq.com/for/house-hackers?utm_source=meta&utm_medium=paid_social&utm_campaign=house-hackers&utm_content=hookC` |

---

#### Ad set `wholesalers`

Interest stack: `Real estate investing`, `Wholesaling`, `Real estate entrepreneur`, `BiggerPockets`, `Flipping`, `Cash buyer`, `Real estate wholesaling` (try exact; fall back to `Real estate investing` + `Entrepreneurship`).

Creative capture: the **Wholesale** strategy card showing buyer MAO and the spread in dollars.

**Ad A — `wholesalers-hookA`**

| Field | Value |
|---|---|
| Headline | `Your spread, in dollars` (23) |
| Primary text | `Your spread, in dollars.`<br><br>`Contract price versus buyer price, less costs, equals the assignment fee this address can carry. You know the number before you name a price. Works on addresses that are not listed; an off-market lead gets the same verdict as a Zillow listing.` |
| URL | `https://dealgapiq.com/for/wholesalers?utm_source=meta&utm_medium=paid_social&utm_campaign=wholesalers&utm_content=hookA` |

**Ad B — `wholesalers-hookB`**

| Field | Value |
|---|---|
| Headline | `9 reasons to run the lead first` (31) |
| Primary text | `9 reasons wholesalers run a verdict before they make the call`<br><br>`A lead is a phone number and an address. What a cash buyer will pay for it, what you can contract it at, and whether assigning it is even the right move are numbers most wholesalers estimate in their head on the way to the call. Fifteen seconds puts them on the screen first.` |
| URL | `https://dealgapiq.com/for/wholesalers?utm_source=meta&utm_medium=paid_social&utm_campaign=wholesalers&utm_content=hookB` |

**Ad C — `wholesalers-hookC`** (control)

| Field | Value |
|---|---|
| Headline | `Free verdict on any address. No signup.` (39) |
| Primary text | `Paste any US address. In 15 seconds you get the price where the deal works, the Deal Gap to the asking price, and four ways to close it. Free. No account. No card.` |
| URL | `https://dealgapiq.com/for/wholesalers?utm_source=meta&utm_medium=paid_social&utm_campaign=wholesalers&utm_content=hookC` |

---

#### Ad set `out-of-state-investors`

Interest stack: `Real estate investing`, `Rental property`, `Turnkey real estate`, `BiggerPockets`, `Passive income`, `Landlord`, plus **exclude** none. Consider a second ad set later restricted to CA/NY/WA/MA/NJ residents (highest out-of-state buying rates).

Creative capture: a verdict on an address in a different state than the viewer's likely home, with the **/markets** assumptions panel (tax, vacancy, appreciation) visible.

**Ad A — `out-of-state-investors-hookA`**

| Field | Value |
|---|---|
| Headline | `9 reasons to analyze before you fly` (35) |
| Primary text | `9 reasons out-of-state investors analyze from their phone before they fly`<br><br>`Buying where you do not live means every mistake costs a plane ticket. Out-of-state investors who run the address first know the tax rate, the vacancy assumption and the Deal Gap for a market they have never driven, before they book anything.` |
| URL | `https://dealgapiq.com/for/out-of-state-investors?utm_source=meta&utm_medium=paid_social&utm_campaign=out-of-state-investors&utm_content=hookA` |

**Ad B — `out-of-state-investors-hookB`**

| Field | Value |
|---|---|
| Headline | `Run the address. Then book the flight.` (37) |
| Primary text | `Run the address before you book the flight.`<br><br>`Most remote investors fly to see properties a 15-second verdict would have removed from the list. Run the whole shortlist from the couch first. Every state's tax, vacancy and appreciation assumptions are published and applied automatically.` |
| URL | `https://dealgapiq.com/for/out-of-state-investors?utm_source=meta&utm_medium=paid_social&utm_campaign=out-of-state-investors&utm_content=hookB` |

**Ad C — `out-of-state-investors-hookC`** (control)

| Field | Value |
|---|---|
| Headline | `Free verdict on any address. No signup.` (39) |
| Primary text | `Paste any US address. In 15 seconds you get the price where the deal works, the Deal Gap to the asking price, and four ways to close it. Free. No account. No card.` |
| URL | `https://dealgapiq.com/for/out-of-state-investors?utm_source=meta&utm_medium=paid_social&utm_campaign=out-of-state-investors&utm_content=hookC` |

---

#### Ad set `creative-finance-buyers`

Interest stack: `Real estate investing`, `Pace Morby`, `Seller financing`, `Owner financing`, `Creative financing`, `Subject to`, `BiggerPockets`.

Creative capture: the **Four Paths** panel on a verdict with the seller-carry path expanded and its script visible.

**Ad A — `creative-finance-buyers-hookA`**

| Field | Value |
|---|---|
| Headline | `Three small asks that equal one big one` (39) |
| Primary text | `The blended plan: three small asks that equal one big one.`<br><br>`A 2% price reduction, a modest seller second and verified rent often reach the same math as a 6% cut, and are far more likely to get a yes. The verdict shows the blend that fits this address, with the script written in the seller's terms.` |
| URL | `https://dealgapiq.com/for/creative-finance-buyers?utm_source=meta&utm_medium=paid_social&utm_campaign=creative-finance-buyers&utm_content=hookA` |

**Ad B — `creative-finance-buyers-hookB`**

| Field | Value |
|---|---|
| Headline | `When the seller says no to the price` (36) |
| Primary text | `8 reasons creative-finance buyers pull up the Four Paths before they pitch`<br><br>`You know what subject-to and a seller carryback are. The freeze happens on the phone, when the seller says no to the price and you need three smaller asks that reach the same math. The Four Paths put those asks, and the words for them, on the screen before you dial.` |
| URL | `https://dealgapiq.com/for/creative-finance-buyers?utm_source=meta&utm_medium=paid_social&utm_campaign=creative-finance-buyers&utm_content=hookB` |

**Ad C — `creative-finance-buyers-hookC`** (control)

| Field | Value |
|---|---|
| Headline | `Free verdict on any address. No signup.` (39) |
| Primary text | `Paste any US address. In 15 seconds you get the price where the deal works, the Deal Gap to the asking price, and four ways to close it. Free. No account. No card.` |
| URL | `https://dealgapiq.com/for/creative-finance-buyers?utm_source=meta&utm_medium=paid_social&utm_campaign=creative-finance-buyers&utm_content=hookC` |

---

### 2.4 Before pressing Publish

- [ ] Launch ad set names are exactly `wholesalers` and `creative-finance-buyers`. House-hackers and out-of-state stay drafted until a launch set hits 300 clicks or is killed.
- [ ] Every URL opens the `/for/<slug>` page, not `/`.
- [ ] `utm_content` is `hookA` / `hookB` / `hookC` matching the ad name.
- [ ] Description line reads "Free verdict. No signup. No card."
- [ ] Hook C present on every ad set.
- [ ] Retargeting ad set live with exclusion audience (§2.6).
- [ ] Pixel selected on every ad set and showing "Active" (needs §1 done and one real page load).
- [ ] Special Ad Category: **None.** These ads sell analysis software, not housing, credit or employment. If Meta flags the account, appeal on that basis; do not accept the Housing category, it removes age and interest targeting. Fallback: Advantage+ On, drop interest stacks, note the date.
- [ ] Ads Manager columns: add `Landing page views`, `Leads`, `Cost per lead`, `Frequency`. Judge on PostHog (§3), use Meta's numbers for its optimizer only.

### 2.6 Retargeting ad set

Ad set `retarget-verdict-no-signup` inside campaign `for-listicles`.

| Field | Value |
|---|---|
| Audience | Custom audience: website visitors who fired `Lead` (verdict_viewed) in last 30 days, **excluding** `CompleteRegistration` in last 30 days. Second audience (union): visited URL contains `/for/` or `/answers/` in last 30 days. |
| Budget | $5/day |
| Optimization | Landing page views for week 1; `CompleteRegistration` once 50/week |
| Frequency cap | 3 per 7 days |
| Placements | Advantage+ |
| Destination | `https://dealgapiq.com/?utm_source=meta&utm_medium=paid_social&utm_campaign=retarget&utm_content=save` |

Audience sizes will be small at launch. Meta needs ~1,000 people to serve reliably; leave the ad set on and let it fill.

| Ad | Headline | Primary text |
|---|---|---|
| retarget-save | `Save the verdict you ran. Free account.` | `You ran an address. The numbers are still there. A free account keeps 10 saved properties so the next one is a comparison, not a memory.` |
| retarget-offer | `You have the number. Here is what to say.` | `Every verdict comes with four ways to close the gap and the script for each. Free account, no card. Pick the path and read it off the screen.` |

### 2.5 Weekly Monday review (runbook §5 rules, restated)

| Check | Source | Action |
|---|---|---|
| 300+ link clicks and verdict rate < 5% | Meta clicks ÷ DR-F verdicts for the slug | Pause the ad set. Rewrite the headline first. |
| `verdict → signup` above site average two weeks running | DR-F `signup_rate` vs DR-A overall | Ad set inherits the paused budget. |
| Frequency > 3 on a winning ad set | Meta | Add a third hook from a different reason before raising budget. |
| Hook B beats Hook A on verdict rate two weeks running | DR-C breakdown by `ft_utm_content` | Promote the reason to the page H1 in `persona-pages.ts`. |
| Hook C beats A and B on verdict rate for two weeks on two or more personas | DR-C / DR-F by `ft_utm_content` | Listicle frame is not adding value. Move that persona's budget to its matching `/answers` page. |
| `for:<slug>:offer` submits exceed `for:<slug>` | DR-D-style trend on `property_searched.source` | Reasons are selling, hero is not. Rewrite the intro. |

---

## 3. PostHog

Project 463676, dashboard **Direct Response**
(`https://us.posthog.com/project/463676/dashboard/2063305`). Property names
are exact; `ft_*` exists only on events sent through `trackEvent`, never on
`$pageview`.

### 3.1 DR-B — replace the SQL

Edit the existing `DR-B` insight and replace its query with:

```sql
SELECT
    properties.$pathname                   AS landing_path,
    count(DISTINCT properties.$session_id) AS sessions
FROM events
WHERE event = '$pageview'
  AND timestamp > now() - INTERVAL 7 DAY
  AND (
        properties.$pathname LIKE '/answers/%'
     OR properties.$pathname = '/'
     OR properties.$pathname LIKE '/markets/%'
     OR properties.$pathname LIKE '/for/%'
  )
GROUP BY landing_path
ORDER BY sessions DESC
```

### 3.2 DR-C — four new funnels

New insight → Funnel, one per slug. Name them `DR-C for/house-hackers`,
`DR-C for/wholesalers`, `DR-C for/out-of-state-investors`,
`DR-C for/creative-finance-buyers`. Replace `<slug>` in every step:

| Step | Event | Filter |
|---|---|---|
| 1 | `property_searched` | `source` **starts with** `for:<slug>` (matches both the hero and the `:offer` form) |
| 2 | `verdict_viewed` | `ft_landing_path` **equals** `/for/<slug>` |
| 3 | `verdict_email_captured` | `ft_landing_path` **equals** `/for/<slug>` |
| 4 | `signup_completed` | `ft_landing_path` **equals** `/for/<slug>` |
| 5 | `checkout_completed` | `ft_landing_path` **equals** `/for/<slug>` |

Settings: conversion window **14 days**; order **sequential**; breakdown by
`ft_utm_content` (reads hook A against hook B). A second breakdown by
`ft_utm_medium` separates `paid_social` from `founder` / `company_page`
when the LinkedIn carousels start landing traffic on the same pages.

Add all four to the Direct Response dashboard.

### 3.3 DR-F — persona scoreboard

New insight → SQL, name `DR-F`, add to the dashboard:

```sql
SELECT
    coalesce(nullIf(properties.ft_utm_campaign, ''), '(none)') AS campaign,
    coalesce(nullIf(properties.ft_utm_content, ''), '(none)')  AS hook,
    coalesce(nullIf(properties.ft_utm_medium, ''), '(none)')   AS medium,
    coalesce(nullIf(properties.ft_landing_path, ''), '')        AS landing_path,
    countIf(event = 'property_searched')                         AS address_submits,
    countIf(event = 'verdict_viewed')                            AS verdicts,
    countIf(event = 'verdict_email_captured')                    AS emails,
    countIf(event = 'signup_completed')                          AS signups,
    countIf(event = 'checkout_completed')                        AS paid,
    round(signups / nullIf(verdicts, 0), 3)                      AS signup_rate
FROM events
WHERE timestamp > now() - INTERVAL 7 DAY
  AND event IN ('property_searched', 'verdict_viewed', 'verdict_email_captured', 'signup_completed', 'checkout_completed')
  AND properties.ft_landing_path LIKE '/for/%'
GROUP BY campaign, hook, medium, landing_path
ORDER BY verdicts DESC
```

Verdict rate for a page = `verdicts` here ÷ `sessions` for the same
`landing_path` in DR-B. Cost per verdict and cost per signup are **not**
in this SQL — PostHog cannot read ad spend. Compute them in
`WEEKLY_PAID_REVIEW.md` from `docs/marketing/spend.csv` joined on
campaign name (`ft_utm_campaign`).

### 3.4 Subscription

Edit the existing weekly Monday 08:00 UTC subscription on the dashboard (or
add DR-F to the DR-A subscription) so the persona scoreboard arrives with
the source scoreboard.

---

## 4. LinkedIn carousels (batch-02)

Already built and validated against the importer:

- `docs/marketing/linkedin/batches/batch-02.yaml` — 4 founder carousel
  posts (Mon–Thu 2026-09-21 → 24, 07:45 ET) + 4 company reshares (12:00 ET),
  one per launch persona. Dates assume batch-01 finishes 2026-09-18; adjust
  before import if batch-01 moved.
- `docs/marketing/linkedin/assets/batch-02/<slug>-carousel.pdf` — generated
  from the page config (cover + one slide per reason + closing slide).
  Regenerate any time the page copy changes:

  ```bash
  (cd frontend && node --import tsx scripts/export-persona-pages.ts) > /tmp/persona-pages.json
  python3 scripts/build_listicle_carousels.py /tmp/persona-pages.json \
    --out docs/marketing/linkedin/assets/batch-02 \
    --slugs house-hackers wholesalers out-of-state-investors creative-finance-buyers
  ```

Import and approve exactly as `docs/marketing/linkedin/README.md` says
(needs the production `DATABASE_URL`; rows land as `draft`):

```bash
cd backend
DATABASE_URL=<railway url> python -m scripts.import_linkedin_batch ../docs/marketing/linkedin/batches/batch-02.yaml
# then preview and approve each row through /api/v1/admin/linkedin/posts
```

Reply to every substantive comment within 24 hours. The comments are where
the deal conversations happen, and on these posts they are also where the
next persona reason will come from.

---

## 5. Phase 2 exit criteria

Phase 2 is done, and Phase 3 (weeks 4–8: kill/scale weekly, rotate
house-hackers and out-of-state-investors in) starts, when:

1. DR-F has one full Monday-to-Monday week of data for the two launch slugs.
2. Each launched ad set has ≥300 link clicks or has been paused by the kill rule.
3. Batch-02 has published (or is approved and waiting on the dry-run flag).
4. Cumulative paid spend has not hit the $2,500 six-week cap. If it has, stop.

If a week passes and DR-F is empty while Meta reports clicks, the pixel or
consent path is broken, not the pages: re-run the §1 verification before
touching copy.
