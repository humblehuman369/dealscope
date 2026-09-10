# Reddit Ads: `find-investment-property` (second lane while Meta is on hold)

Paste-ready values for ads.reddit.com. Same page, same creative, same
rules as the Meta plan in `FIND_INVESTMENT_PROPERTY_LISTICLE.md` §3 and
`LISTICLE_LANDING_PAGES.md` §5, with three Reddit-specific changes: the
copy reads like a post, not an ad; the comments are part of the ad; and
there is no pixel, so PostHog is the only scoreboard.

Why Reddit: r/realestateinvesting (~2M members) and r/wholesaling are the
exact audience, CPMs are a fraction of Meta's, and Reddit's self-serve
account needs only a payment method, not the d/b/a verification Meta is
sitting on. Volume is small; this is a $10/day lane, not a replacement.

## Account

Business name: DealGapIQ. Payment method on file. No Reddit Pixel for now
(the page is consent-gated and the site already sends everything to
PostHog; judge on `ft_utm_source = reddit` there). If Reddit later asks
for a conversion source to optimize on, add the pixel then.

## Campaign

| Field | Value |
|---|---|
| Name | `find-investment-property` (= `utm_campaign`) |
| Objective | Traffic |
| Spend cap | none; the $2,500 six-week cap in the runbook covers all paid channels combined |

## Ad group `find-investment-property-reddit`

| Field | Value |
|---|---|
| Budget | $10/day, Lifetime off |
| Bid | Automated (CPC). If it lets you set a max, $1.00 |
| Schedule | start next morning 06:00 ET, no end |
| Location | United States |
| Device | All |
| Placement | Feed + Conversation (Conversation placements are cheap and sit under threads where people are asking exactly this) |
| Targeting | **Communities**: r/realestateinvesting, r/wholesaling, r/realestate, r/RealEstateInvestor, r/HouseHacking, r/landlord, r/FirstTimeHomeBuyer (only if the spend needs help; it skews non-investor). **Interests** (secondary): Real Estate, Personal Finance, Investing. Exclude nothing to start. |
| Frequency cap | 3 per 7 days |

## Ads

Three ads, one creative each, same destination with `utm_content` set per
ad. Reddit shows a post **title** (keep under ~100 characters; it can go
to 300 but gets cut in feed), the image, a **display name** ("DealGapIQ"),
a CTA button, and a **headline** under the image on some placements.
Comments are on by default. Leave them on; it is the reason to be on
Reddit. Reply to every comment within 24 hours in plain language, and if
someone says "this is an ad," agree with them and answer the question anyway.

Shared: CTA **Learn More**. Display name **DealGapIQ**. Headline under
image: `Run any address free. No signup.` Creative: `reddit-ad-not-for-sale-1200x628.png`
(feed) and `fb-ad-not-for-sale-1080.png` (square, for Conversation
placement if it asks for 1:1).

**Ad A — `reddit-hookA`** (the Meta hook, unchanged)
Title: `The best deal on this map isn't listed.`
URL: `https://dealgapiq.com/for/find-investment-property?utm_source=reddit&utm_medium=paid_social&utm_campaign=find-investment-property&utm_content=hookA`

**Ad B — `reddit-hookB`** (native to how people talk here)
Title: `Every real estate map shows homes for sale. This one also shows the ones that aren't: absentee owners 20+ years, expired listings, pre-foreclosures.`
URL: `…&utm_content=hookB`

**Ad C — `reddit-hookC`** (control, same as every other channel)
Title: `Paste any US address, get the price where the deal works and the gap to asking. Free, no signup, no card.`
URL: `…&utm_content=hookC`

**Pinned first comment on every ad** (post it from the DealGapIQ account
the minute the ad is approved, so it is the top comment):

> Founder here. Quick honest version: the free part is the Discovery on any address (value, rent, the price where it works, the Deal Gap, four offer structures with scripts). The full map with the owner-tenure / absentee / expired filters is the Pro tier. Happy to answer anything about how the numbers are built; sources are shown on every result.

That comment does two things: it scopes the free claim the way the page
does, and it pre-empts the "what's the catch" reply that would otherwise
be the top comment.

## Measurement

Nothing new to build. DR-C `for/find-investment-property` already exists;
add a breakdown by `ft_utm_source` to read `reddit` against `google` and
(later) `meta`. DR-F lists it as its own row. Reddit's own click count
comes from the Reddit dashboard; spend goes in `docs/marketing/spend.csv`
with campaign name `find-investment-property` and a `channel` of `reddit`
so `WEEKLY_PAID_REVIEW.md` can compute cost per verdict.

## Rules

Kill: 300 link clicks with a verdict rate under 5% → pause, rewrite the
title first. Scale: verdict→signup above site average two weeks running
inherits killed budget. Reddit-specific: if an ad's comments turn into a
real thread, do not touch the ad while the thread is alive; the thread is
doing the work. If comments go hostile and stay hostile after honest
replies, pause that ad and keep the others.

## Checklist before launch

- [ ] Three ads use the three `utm_content` values and the page URL, not `/`.
- [ ] Pinned comment ready to paste for each ad.
- [ ] `spend.csv` has a `reddit` row template.
- [ ] Frequency cap set.
- [ ] Ad account time zone is America/New_York so the 06:00 start is real.
