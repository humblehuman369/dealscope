# Google Ads: `find-investment-property` search campaign

Paste-ready values for `/for/find-investment-property`. Rules come from
`DIRECT_RESPONSE_PLAYBOOK.md` §5 (one ad group per page, headline 1 = page
H1, `utm_source=google&utm_medium=cpc&utm_campaign=<slug>`, kill at 200
clicks with zero verdicts, scale on signup rate). This page is the first
`/for` page to get search spend; it was built for a typed query.

## Import (Google Ads Editor)

Account → Import → From file → `google-ads-editor-find-investment-property.csv`.
Review the preview, then Post. The campaign imports **Paused**; enable it
in the web UI after the checklist below. If Editor rejects a column name,
keep the values and re-enter them by hand; every field is listed here.

## Campaign

| Field | Value |
|---|---|
| Name | `find-investment-property` (= `utm_campaign`, so it joins to PostHog `ft_utm_campaign` by eye) |
| Type | Search only. Uncheck Search partners and Display. |
| Budget | $15/day |
| Bidding | Manual CPC, $2.50 max to start (or Maximize clicks with a $2.50 cap). Move to Maximize conversions once the `Lead` conversion has ~30/month. |
| Location | United States (presence, not interest) |
| Language | English |
| Ad schedule | none |
| Conversion | Import PostHog `verdict_viewed` via a Google Ads conversion tag when ready; until then judge on DR-C / DR-F in PostHog, not Ads. |

## Ad group `find-investment-property`

Keywords, exact `[ ]` and phrase `" "`:

`find investment property` · `how to find investment properties` ·
`investment property search` · `find off market properties` ·
`off market investment properties` (phrase) · `foreclosure listings map` ·
`pre foreclosure listings` (phrase) · `expired listings for investors` (phrase) ·
`absentee owner list` · `find real estate deals` ·
`investment property finder` (phrase) · `distressed property search` (phrase)

Campaign negatives (phrase): jobs, job, careers, salary, course, courses,
class, training, book, pdf, definition, meaning, what is, realtor license,
real estate license, apartments for rent, for rent, commercial, reit,
stocks, free download.

## Responsive search ad

Final URL: `https://dealgapiq.com/for/find-investment-property?utm_source=google&utm_medium=cpc&utm_campaign=find-investment-property`
Display path: `dealgapiq.com/for/investors`

Headlines (all ≤30). Pin 1 to position 1 and 2 to position 2; leave the rest unpinned.

1. Find a Deal of a Lifetime *(pinned 1 — the page H1)*
2. Free Discovery. No Signup. *(pinned 2 — the guarantee line)*
3. Search Homes Not For Sale
4. Foreclosure & Expired Pins
5. Filter by Owner Tenure
6. Every Pin Shows Rent %
7. Investor Map, Not Listings
8. Run Any Address Free
9. Absentee Owner Leads on a Map
10. Draw Your Own Search Area
11. No Card. No Account.
12. DealGapIQ Search & Discover

Descriptions (all ≤90):

1. Every pin is a price and a rent-to-price number, not a photo. Filter, then run it free.
2. Search by foreclosure, expired listing, owner tenure and absentee status. Free, no signup.
3. Homes that aren't for sale, on one map. Pick a pin, run the address, know what to offer.
4. The full map is Pro. The Discovery on any address is free with no signup and no card.

Sitelinks (optional, add in the UI): *Is this a good investment property?* →
`/answers/is-this-a-good-investment-property` · *What should I offer?* →
`/answers/what-should-i-offer-on-this-house` · *Investment properties near me* →
`/markets/near-me` · *Pricing* → `/pricing`. Carry the same UTMs.

## Before enabling

- [ ] Branch `feat/for-find-investment-property` is deployed; the URL returns 200 and the address form submits.
- [ ] Search partners and Display are off.
- [ ] Ad strength shows "Good" or better (it should, with 12 headlines).
- [ ] Google's Housing sensitive-category flag only affects audience targeting on Display/YouTube; Search keywords are unaffected. Do not add audiences.
- [ ] PostHog DR-C `for/find-investment-property` exists (it does); add a breakdown by `ft_utm_medium` to read `cpc` against `paid_social` and organic.

## Weekly (Monday, with DR-A)

200 clicks and zero `verdict_viewed` with `ft_utm_campaign = find-investment-property` → pause, rewrite headline 1, not bids. Signup rate above site average two weeks running → this group inherits killed budget. Search terms report weekly: add converting terms as exact, add junk as negatives.
