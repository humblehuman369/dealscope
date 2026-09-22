# DealGapIQ — content source of truth

Human/marketing single source of truth for **all public facts**. Do not invent numbers, names, dates, or claims. If a fact is missing, ask Brad.

## How to use

1. Change a public fact **here first**.
2. Mirror it in code (`frontend/src/config/site.ts`, `frontend/src/lib/claims.ts`, `frontend/src/lib/brand.ts`, and any live copy that hard-codes the same string).
3. Ship the live surfaces (home, FAQ, press, schema, stores) only after code and this file agree.

## Relationship to code

| Layer | Role |
| --- | --- |
| **This file** | Approved wording and facts for humans (press, marketing, AEO copy, reviews). |
| `frontend/src/config/site.ts` | Code mirror for dates, contact, founder, platforms, strategies, worked example. |
| `frontend/src/lib/claims.ts` | Prices, directory counts, source count, speed claim, free-tier caps. |
| `frontend/src/lib/brand.ts` | Legal entity name / d/b/a, brand asset paths. |
| `frontend/src/content/home-faq.ts` | FAQ Q&A (also drives `FAQPage` JSON-LD). |
| `frontend/src/lib/seo/home-schema.ts` | Home meta description + home `Article` / FAQ graph. |
| `frontend/src/components/seo/SiteJsonLd.tsx` | Site-wide `Organization`, `Person`, `WebSite`, `SoftwareApplication`. |

If this file and live code disagree, **prefer live `site.ts` / `claims.ts` / `home-schema.ts` values** until Brad re-approves. Record the conflict; do not guess.

---

## Brand & legal entity

| Field | Value |
| --- | --- |
| Product / brand name | **DealGapIQ** (one word, that capitalisation, everywhere in headings, titles, schema `name`) |
| Legal entity | **InvestIQ LLC** |
| Full legal line | **InvestIQ LLC d/b/a DealGapIQ** (footer, policies, copyright) |
| Headquarters (public) | **Boca Raton, Florida** (city-level only) |
| Site | `https://dealgapiq.com` |
| Support email | `support@dealgapiq.com` |
| Support phone (display) | `(866) 388-8222` |
| Support phone (E.164 / schema) | `+1-866-388-8222` |

---

## Founder

| Field | Value |
| --- | --- |
| Name | Brad Geisen |
| Title | Founder and CEO |
| Book | *The Deal Gap* |
| Credential line (exact order; do not reorder) | Founded Foreclosure.com, built HomePath.com for Fannie Mae and HomeSteps.com for Freddie Mac |
| LinkedIn (Person) | `https://www.linkedin.com/in/bradgeisen/` |
| Amazon author / book | `https://www.amazon.com/dp/B0HF3MJPLH` |
| Company LinkedIn | `https://www.linkedin.com/company/dealgapiq/` |

Additional founder context used in press/about copy (approved in launch plan / press page): Foreclosure.com still powers BiggerPockets’ foreclosure search; GSE partnerships date to a 1991 HUD pilot program.

---

## Dates

| Event | Value | Code constant |
| --- | --- | --- |
| Beta launch | January 2026 (`2026-01`) | `BETA_LAUNCH` |
| Public launch | August 2026 (`2026-08`); also `Organization.foundingDate` | `PUBLIC_LAUNCH` |
| Home `Article.datePublished` (beta go-live day) | `2026-01-15` | `HOME_PUBLISHED_AT` |
| Home “Updated” / `Article.dateModified` | `2026-09-21` | `HOME_UPDATED_AT` |
| Launch announcement post | `2026-09-22` | `LAUNCH_POST_DATE` |
| Launch post slug | `dealgapiq-launches-publicly` | `LAUNCH_POST_SLUG` |
| iOS / macOS App Store published | September 20, 2026 | `IOS_PUBLISHED` / `MACOS_PUBLISHED` |
| Android Google Play published | September 19, 2026 | `ANDROID_PUBLISHED` |
| Release cadence | Updates ship weekly | — |

---

## Pricing & free tier

| Plan | Facts |
| --- | --- |
| Free / Starter | **$0**, **3 discoveries a month**, **3 saved properties**, **no credit card** |
| Pro monthly | **$34.99/mo** (final for web, iOS, and Android — never $39.99) |
| Pro annual | **$29.17/mo** billed annually (`$349.99`/year) |
| Pro trial | **7-day trial**, no card |
| Speed claim | **under 60 seconds** |

Code: `PRO_MONTHLY_PRICE`, `PRO_YEARLY_PRICE`, `PRO_YEARLY_PER_MONTH`, `STARTER_VERDICTS_PER_MONTH`, `STARTER_SAVED_PROPERTIES`, `SPEED_CLAIM` in `frontend/src/lib/claims.ts`.

---

## Product claims

### Strategies (6, approved order)

1. long-term rental  
2. short-term rental  
3. BRRRR  
4. fix and flip  
5. house hack  
6. wholesale  

### Valuation / listing sources

- **5** sources today (use “5” everywhere; never “6”).
- Named in public copy: **Zillow, Redfin, Realtor.com, and RentCast**, shown side by side; more sources planned.
- Discovery roster length in code (`ALL_SOURCE_IDS` / `SOURCE_COUNT`) is 5: IQ + those four providers.

### Directories (Pro)

- **2,812** verified cash buyers  
- **484** hard money lenders  
- Searchable by city, county, ZIP, state, strategy, and loan product (Pro)

### Paths to close the gap

Every analysis returns **four paths plus a Blend** to close the gap. Each path has an editable worksheet and a negotiation script.

| Path | Public name | What it changes |
| --- | --- | --- |
| 1 | **Price** | The purchase price |
| 2 | **Income** | The income side of the deal |
| 3 | **Terms** | How and when the seller gets paid (seller financing, subject to, and other creative financing) |
| 4 | **Equity** | How equity is shared or deferred |
| + | **Blend** | Combines two or more of the four |

Naming rules: capitalise the path names when used as labels (the Terms path). In running prose, **"four paths plus a Blend"** is the only approved phrase. Never "four offer structures", "four ways", "four pre-built paths", "offer paths", "4 ways", or "the fourth blends the other three" (superseded 22 September 2026, approved by Brad). Seller financing and subject-to sit in the Terms path. Code identifiers (`fourWays.ts`, `FourWaysSection`, `four_ways`) stay as they are.

Code mirror: `frontend/src/components/iq-verdict/make-it-work/fourWays.ts` (`FOUR_WAYS`, `WAY_NAMES`).

### Coverage

Live in **every U.S. market**. Surfaces foreclosures, pre-foreclosures, expired listings, absentee owners, and distressed sellers by address, city, or ZIP.

### Lake Worth worked example (approved)

| Field | Value |
| --- | --- |
| Address | 1014-16 N J St, Lake Worth, FL |
| List price | $457,100 |
| Target buy | $428,000 at 20% down |
| Deal gap | −6.4% (about $29,000) |

A **negative** gap means list price is above the target buy price.

---

## Platforms & store listings

| Platform | Detail |
| --- | --- |
| Web | `https://dealgapiq.com` |
| iOS | App Store ID **6759636866**; published September 20, 2026 |
| macOS | Same App Store listing / ID as iOS (no separate id); published September 20, 2026 |
| Android | Google Play application id **`com.dealgapiq.mobile`**; published September 19, 2026 |
| Schema `operatingSystem` | `Web, iOS, macOS, Android` |
| Point & Scan | Runs a discovery from the phone camera; also works without the app installed |

Canonical store URLs (no attribution params):

- App Store: `https://apps.apple.com/app/id6759636866`
- Google Play: `https://play.google.com/store/apps/details?id=com.dealgapiq.mobile`

---

## Spelling & naming rules

| Term | Rule |
| --- | --- |
| **DealGapIQ** | One word, that capitalisation. Not “Deal Gap IQ” in brand mark / primary name (schema may list alternateName variants for search). |
| **Deal Maker** | Two words in **user-facing** copy. Code identifiers may stay `DealMaker` / `deal-maker`. |
| **InvestIQ LLC** | Legal entity only; brand in headings/titles/schema `name` is DealGapIQ. |
| **deal gap** | Lowercase in running prose unless starting a sentence or used as the product metric label “Deal Gap”. |
| Source count | Always **5**, never 6. |
| Pro price | Always **$34.99**, never $39.99. |
| Free tier | Always **3 discoveries** a month (not 10 analyses). |

Brand colors (press kit): black `#000000`, cyan `#0EA5E9`, white `#FFFFFF`.

---

## Canonical copy

### Home H1

```
Find a Great Deal & How to Close It.
```

### Home title (document / SERP)

```
DealGapIQ: Real Estate Deal Analysis and Offer Tool for Investors
```

### Home meta description (`HOME_DESCRIPTION`, under 155 chars)

```
See a property's deal gap (price vs. investor value) and four paths plus a Blend to close it. Six strategies, every U.S. market, under 60 seconds. Free.
```

### Home hero lede (verbatim)

```
DealGapIQ is a real estate investment analysis tool that shows the gap between a property's asking price and the price at which it works for an investor, then gives four paths plus a Blend to close that gap. It analyzes six strategies across every U.S. market in under 60 seconds, starts free, and Pro costs $34.99 a month.
```

### Key takeaways (verbatim list)

1. The "deal gap" is the difference between the list price and the target buy price that makes a property pencil for a chosen strategy.
2. DealGapIQ scores any address, on-market or off-market, against six strategies: long-term rental, short-term rental, BRRRR, fix and flip, house hack, and wholesale.
3. Every analysis returns four paths plus a Blend to close the gap, each with an editable worksheet and a negotiation script.
4. The free plan gives three discoveries a month with no card. Pro is $34.99 a month or $29.17 a month billed annually.
5. Pro adds directories of 2,812 verified cash buyers and 484 hard money lenders, plus comps, Excel proformas and PDF reports.
6. Built by Brad Geisen, who founded Foreclosure.com and whose team built HomePath.com for Fannie Mae and HomeSteps.com for Freddie Mac.

### FAQ answers (verbatim; match `home-faq.ts`)

**What is DealGapIQ?**  
DealGapIQ is a real estate investment analysis tool that shows the gap between a property's price and its investor value, then gives four paths plus a Blend to close it. It covers six strategies in every U.S. market and runs in under 60 seconds. It starts free.

**What does "deal gap" mean?**  
The deal gap is the difference between the seller's asking price and the target buy price that makes the deal work for an investor. DealGapIQ reports it as a percentage and a dollar amount. A negative gap means the list price is above the target.

**How do I find real estate deals?**  
Start with the number, not the listing. A good real estate deal is any property, on-market or off-market, where the list price is close to the target buy price for your strategy. To find investment properties and undervalued properties, run every address you see through a deal gap check, then focus on the ones with the smallest gap. Sources that surface good deals include foreclosures, pre-foreclosures, expired listings, absentee owners, tax delinquent lists, and off-market owners you contact directly. DealGapIQ scores any U.S. address against six strategies in under 60 seconds and gives four paths plus a Blend to close the gap: Price, Income, Terms and Equity, and a Blend that combines them. The free plan includes three discoveries a month with no credit card.

**Is DealGapIQ free?**  
Yes, the free plan gives three discoveries a month, the full analysis, and negotiation scripts, with no credit card. Pro is $34.99 a month or $29.17 a month billed annually and comes with a 7-day trial.

**Does DealGapIQ work for BRRRR and fix and flip?**  
Yes. Every discovery is scored against six strategies: long-term rental, short-term rental, BRRRR, fix and flip, house hack, and wholesale. Pro users can edit the assumptions for each.

**How is DealGapIQ different from DealCheck?**  
DealCheck is a calculator that tells you whether a deal works at a given price. DealGapIQ tells you the price at which it works, how far the listing is from that price, and four paths plus a Blend to get there, including creative financing. DealCheck is cheaper; DealGapIQ includes buyer and lender directories.

**Does DealGapIQ need a mailing list or motivated seller?**  
No. Any property qualifies. The tool finds the gap and the structure that closes it, so you can make an offer on a normal listing rather than mailing thousands of owners hoping one is distressed.

**Does DealGapIQ cover my area?**  
DealGapIQ is live in every U.S. market. It surfaces foreclosures, pre-foreclosures, expired listings, absentee owners, and distressed sellers by address, city, or ZIP.

**Is there a DealGapIQ app?**  
Yes. There are iOS, macOS and Android apps (App Store ID 6759636866; Google Play id com.dealgapiq.mobile) and a Point & Scan feature that runs a discovery when you point your phone camera at a house. Scanning also works without the app installed.

### Press launch sentence (verbatim)

```
DealGapIQ, founded by Foreclosure.com founder Brad Geisen, publicly launched in August 2026 as a free real estate deal analysis tool that shows investors the gap between a property's price and its investor value, and four paths plus a Blend to close it.
```

### Launch announcement title

```
DealGapIQ launches publicly: see the deal gap on any U.S. property
```

---

## Schema / entity rules

| Rule | Value |
| --- | --- |
| Organization `@id` | `https://dealgapiq.com/#organization` (**never** `/#org`) |
| Organization `name` | DealGapIQ |
| Organization `legalName` | InvestIQ LLC |
| Organization `foundingDate` | `2026-08` |
| Organization address | City-level only: Boca Raton, FL, US — **no street address** |
| Organization `sameAs` | App Store URL, Google Play URL, company LinkedIn. **Crunchbase pending** — do not add until the profile exists. |
| Person `@id` | `https://dealgapiq.com/about#brad-geisen` |
| Person `sameAs` (from `FOUNDER_SAME_AS`) | LinkedIn + Amazon book URL |
| Person `sameAs` (also emitted in `SiteJsonLd`) | plus `https://www.foreclosure.com` |
| SoftwareApplication `operatingSystem` | `Web, iOS, macOS, Android` |
| Offers | Free $0; Pro monthly 34.99 USD; Pro annual effective 29.17 USD/mo (yearly 349.99 USD) |
| Search Console | Verified via **DNS** (GoDaddy). Do **not** publish an HTML verification meta tag. |

### What NOT to publish

- The **Casper, WY registered-agent address** — nowhere (site, schema, press, footers, policies that are public marketing).
- Any street-level HQ address; keep **Boca Raton, FL** city-level only.
- Fabricated directory counts, prices, source counts, or launch dates.
- Crunchbase (or other) profile URLs that do not exist yet.

---

## Indexable public surfaces

### Always treat as marketing / crawl targets

See `frontend/src/lib/seo/indexable-routes.ts` for the curated list (product, strategies, learn, comparisons, legal), plus `/`, `/press`, and the launch blog post.

### `/markets` ISR

- Routes: `/markets`, `/markets/[state]` (no city pages until a `market_snapshots` pipeline exists).
- A state page is **indexable** only when the backend says so: the state has its **own** `MARKET_ADJUSTMENTS` row **and** at least one in-state directory section (`state_lender_count > 0` or `buyer_count > 0`). Nationwide lender counts and the national `DEFAULT` baseline do **not** make a state indexable.
- Non-indexable states may still render available sections under noindex; they must not emit Dataset schema as if they were indexable, and they are omitted from the sitemap when not indexable.
- **Current production set (post markets-indexability work):** **CA, FL, GA, TX** only. Re-check the live `GET /api/v1/markets/states` `indexable` flags before claiming a longer list.

### Product app routes

`/discovery` and `/deal-maker` may be indexed as explainer surfaces; interactive UI is client-side under Suspense. Do not invent property-specific public URLs as canonical marketing pages.

---

## Change process

1. **Update this file** with the new approved fact or wording (ask Brad if unsure).
2. **Update the code mirrors** — typically `site.ts` / `claims.ts` / `brand.ts`, then any consumer (`home-faq.ts`, `home-schema.ts`, `SiteJsonLd`, press page, homepage sections).
3. **Update live copy** only after code constants agree (grep for old prices, counts, spellings).
4. Open a PR that lists fact changes; prefer squash-merge for agent docs PRs.
5. After deploy: Rich Results / Search Console checks stay with Brad (browser-only).

Never invent a fact to unblock a PR. Prefer “Unavailable” or “ask Brad” over a guess.
