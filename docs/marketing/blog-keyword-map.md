# DealGapIQ Blog — Keyword Map and Editorial Standard

**Status:** Active. Update the `Status` column when a post ships.
**Owner:** Brad Geisen
**Companion docs:** `docs/seo-operations.md` (publishing checklist, weekly review), `docs/marketing/MARKETING_PLAYBOOK.md` §12 (keyword tiers).

This is the post-level plan behind the keyword tiers in the playbook. Every blog post targets exactly one primary keyword, belongs to exactly one cluster, and links up to that cluster's pillar. The pillar links back down. That hub-and-spoke shape is what lets a new domain rank: authority pools on the pillar instead of scattering across thirty unrelated pages.

## How to use this file

1. Pick the next unshipped row in the cluster with the weakest coverage.
2. Copy the frontmatter template from §9 and fill it from the row.
3. Write to the editorial standard in §8. Run `npm run content:check`.
4. Ship, then update `Status`, and request indexing per `docs/seo-operations.md`.

Intent codes: **TOFU** (learning a concept), **MOFU** (comparing approaches, ready to analyze), **BOFU** (ready to offer; a verdict run is the natural next step).

Category slugs must match `frontend/src/lib/blog-categories.ts`.

---

## 1. Creative Finance — `creative-finance`

**Pillar:** `/blog/creative-finance-field-guide` (post). Glossary terms already exist for Subject-To, Seller Carryback, Morby Method, Due-on-Sale; every post here links at least two of them.

| # | Working title | Primary keyword | Secondary keywords | Intent | URL slug | Internal links (min 3) | FAQ questions to answer | Words | Status |
|---|---|---|---|---|---|---|---|---|---|
| 1.0 | The Creative Finance Field Guide: Every Structure That Closes When the Bank Says No | creative financing real estate | creative finance strategies; creative real estate financing examples; how does creative financing work | TOFU pillar | `creative-finance-field-guide` | `/glossary/subject-to-financing`, `/glossary/seller-carryback`, `/glossary/morby-method`, `/blog/subject-to-pitch-script-template`, `/discovery` | What is creative financing in real estate? Is creative financing legal? Which structure fits which seller? | 3000 | **Shipped** |
| 1.1 | Subject-To vs Seller Financing: Which One Fits This Seller? | subject to vs seller financing | seller financing vs subject to; sub2 or seller carry; difference between subject to and owner financing | MOFU | `subject-to-vs-seller-financing` | pillar, `/glossary/subject-to-financing`, `/glossary/seller-carryback`, `/blog/lake-worth-teardown-four-offer-structures` | Which is riskier for the seller? Can you combine them? What happens to the existing loan? | 1800 | Planned |
| 1.2 | Wraparound Mortgage Explained (With the Numbers) | wraparound mortgage | wrap mortgage example; all-inclusive trust deed; wraparound mortgage vs subject to | TOFU | `wraparound-mortgage-explained` | pillar, `/glossary/due-on-sale-clause-sub2`, `/glossary/seller-carryback` | How does a wraparound mortgage work? Who services the underlying loan? Is a wrap legal? | 1800 | Planned |
| 1.3 | How to Structure a Seller Carryback (Rate, Term, Balloon, Position) | how to structure seller financing | seller carryback terms; seller financing interest rate; seller financing balloon payment | BOFU | `how-to-structure-a-seller-carryback` | pillar, `/glossary/seller-carryback`, `/blog/lake-worth-teardown-four-offer-structures`, `/deal-maker` | What is a typical seller financing interest rate? How long should the balloon be? Can the seller carry a second? | 2000 | Planned |
| 1.4 | Lease Option for Investors: When Rent-to-Own Beats Buying Now | lease option real estate investing | lease option vs lease purchase; sandwich lease option; option fee | TOFU | `lease-option-for-investors` | pillar, `/strategies/long-term-rental`, `/glossary/subject-to-financing` | What is a lease option? How much is a typical option fee? What is a sandwich lease? | 1700 | Planned |
| 1.5 | The Morby Method Walk-Through: DSCR Loan + Seller Second on One Deal | morby method example | morby method explained; dscr loan with seller financing; morby method risks | MOFU | `morby-method-walk-through` | pillar, `/glossary/morby-method`, `/blog/how-to-calculate-dscr`, `/lenders` | Does the DSCR lender allow a seller second? What down payment does the Morby Method need? | 1900 | Planned |
| 1.6 | Due-on-Sale Risk in Practice: What Actually Happens After a Sub2 Close | due on sale clause subject to | due on sale clause enforcement; will the bank call the loan; garn st germain act | TOFU | `due-on-sale-risk-in-practice` | pillar, `/glossary/due-on-sale-clause-sub2`, `/glossary/subject-to-financing`, `/legal/find-attorney` | How often is due-on-sale enforced? What triggers it? How do investors mitigate it? | 1600 | Planned |

## 2. Deal Analysis — `deal-analysis`

**Pillar:** `/methodology` (existing page). Every post shows a worked example using DealGapIQ's three metrics (Target Buy, Income Value, Deal Gap) so the numbers on the blog match the numbers in the product.

| # | Working title | Primary keyword | Secondary keywords | Intent | URL slug | Internal links (min 3) | FAQ questions to answer | Words | Status |
|---|---|---|---|---|---|---|---|---|---|
| 2.1 | How to Analyze a Rental Property in 10 Minutes (Worked Example) | how to analyze a rental property | rental property analysis; rental property analysis example; how to evaluate a rental property | TOFU | `how-to-analyze-a-rental-property` | `/methodology`, `/blog/cap-rate-vs-cash-on-cash-return`, `/blog/what-is-the-deal-gap`, `/strategies/long-term-rental`, `/discovery` | What is a good cash flow for a rental? What expenses do investors forget? What is the 50% rule? | 2500 | **Shipped** |
| 2.2 | Cap Rate vs Cash-on-Cash Return: Which Number Should Drive the Offer? | cap rate vs cash on cash | cap rate vs cash on cash return; difference between cap rate and coc; what is a good cash on cash return | MOFU | `cap-rate-vs-cash-on-cash-return` | `/methodology`, `/blog/how-to-analyze-a-rental-property`, `/national-averages`, `/deal-maker` | What is a good cap rate? Does leverage change cap rate? Why can CoC be negative when cap rate is positive? | 2000 | **Shipped** |
| 2.3 | How to Calculate DSCR (And the Number Lenders Actually Want) | how to calculate dscr | dscr formula real estate; dscr calculator; what is a good dscr ratio | MOFU | `how-to-calculate-dscr` | `/methodology`, `/blog/hard-money-vs-dscr-loans`, `/glossary/morby-method`, `/lenders` | What DSCR do lenders require? Does DSCR include vacancy? How do you raise DSCR on a deal? | 1800 | **Shipped** |
| 2.4 | The 1% Rule Is Dead. Here Is What to Use Instead. | 1 percent rule real estate | 1% rule rental property; is the 1 percent rule still valid; 2 percent rule | TOFU | `one-percent-rule-is-dead` | `/methodology`, `/blog/how-to-analyze-a-rental-property`, `/blog/what-is-the-deal-gap`, `/national-averages` | What is the 1% rule? Why does it fail at today's rates? What replaces it? | 1600 | Planned |
| 2.5 | How to Estimate ARV Without Fooling Yourself | how to estimate arv | arv formula; after repair value calculator; arv comps | MOFU | `how-to-estimate-arv` | `/methodology`, `/strategies/fix-flip`, `/strategies/brrrr`, `/price-intel` | What is ARV? How many comps do you need? How far back can comps go? | 1800 | Planned |
| 2.6 | Rehab Budget by the Numbers: Line Items Investors Underprice | rehab budget for investment property | how to estimate rehab costs; renovation budget rental property; rehab cost per square foot | MOFU | `rehab-budget-by-the-numbers` | `/strategies/fix-flip`, `/strategies/brrrr`, `/rehab`, `/blog/how-to-estimate-arv` | What does a cosmetic rehab cost per square foot? What contingency should you carry? | 1900 | Planned |
| 2.7 | What Is the Deal Gap? The One Number That Tells You What to Offer | deal gap real estate | target buy price; income value real estate; how much below asking to offer investment property | TOFU | `what-is-the-deal-gap` | `/methodology`, `/what-is-dealgapiq`, `/blog/lake-worth-teardown-four-offer-structures`, `/discovery` | What is a good Deal Gap? Is a negative Deal Gap a dead deal? How is Target Buy calculated? | 1800 | **Shipped** |
| 2.8 | How to Find Cash Flow Positive Rental Properties (The Price Does Most of the Work) | cash flow positive rental properties | how to find cash flow positive rental properties; positive cash flow rental property; rental property cash flow calculator | MOFU | `cash-flow-positive-rental-properties` | `/methodology`, `/blog/how-to-analyze-a-rental-property`, `/blog/what-is-the-deal-gap`, `/markets`, `/discovery` | What makes a rental cash flow positive? Is $100/month good? Why do so few listings cash flow at asking? | 1600 | **Shipped** |

## 3. Offers and Negotiation — `offers-negotiation`

**Pillar:** `/blog/how-to-make-an-offer-on-an-investment-property` (post). The two existing posts (teardown, Sub2 script) already live here.

| # | Working title | Primary keyword | Secondary keywords | Intent | URL slug | Internal links (min 3) | FAQ questions to answer | Words | Status |
|---|---|---|---|---|---|---|---|---|---|
| 3.0 | How to Make an Offer on an Investment Property (Price, Terms, and the Four Structures) | how to make an offer on an investment property | how much to offer on a rental property; investment property offer strategy; offer below asking price investment property | BOFU pillar | `how-to-make-an-offer-on-an-investment-property` | `/blog/what-is-the-deal-gap`, `/blog/lake-worth-teardown-four-offer-structures`, `/blog/subject-to-pitch-script-template`, `/deal-maker`, `/discovery` | How much below asking should an investor offer? Should you offer with contingencies? What makes a seller take terms over price? | 3000 | **Shipped** |
| 3.1 | The Lake Worth Teardown: One Property, Four Ways to Close It | how to make offer below asking | real estate deal analysis example; creative finance offer structures | BOFU | `lake-worth-teardown-four-offer-structures` | existing | existing | 2000 | **Shipped** |
| 3.2 | The Subject-To Pitch Script | subject to pitch script | sub2 cold call script; how to pitch subject to financing | BOFU | `subject-to-pitch-script-template` | existing | existing | 1800 | **Shipped** |
| 3.3 | The Seller Financing Pitch Script: How to Ask a Seller to Be the Bank | seller financing pitch script | how to ask seller for owner financing; seller financing script; how to convince a seller to do seller financing | BOFU | `seller-financing-pitch-script` | pillar, `/glossary/seller-carryback`, `/blog/how-to-structure-a-seller-carryback`, `/blog/subject-to-pitch-script-template` | What do you say to a seller about owner financing? What objections come up? Do you need an attorney? | 1800 | Planned |
| 3.4 | How to Present a Low Offer Without Insulting the Seller | how to make a lowball offer on a house | low offer script real estate; how to justify a low offer; offer 20 percent below asking | BOFU | `how-to-present-a-low-offer` | pillar, `/blog/what-is-the-deal-gap`, `/blog/how-to-analyze-a-rental-property`, `/discovery` | Is 20% below asking insulting? How do you justify a low offer? Should you show your numbers? | 1600 | Planned |
| 3.6 | How to Find Off-Market Properties (and Price Them Before You Make the Call) | how to find off market properties | off market properties for sale; absentee owner list; pre-foreclosure listings; probate real estate leads; driving for dollars | MOFU | `how-to-find-off-market-properties` | pillar, `/blog/what-is-the-deal-gap`, `/blog/creative-finance-field-guide`, `/directory`, `/map-search` | What does off-market mean? Where do investors find them? Are they cheaper? How do you offer with no asking price? | 1800 | **Shipped** |
| 3.5 | Target Buy Price vs List Price: Closing the Gap Without a Price War | target buy price real estate | max allowable offer; how to calculate maximum offer investment property; 70 percent rule | MOFU | `target-buy-price-vs-list-price` | pillar, `/methodology`, `/blog/what-is-the-deal-gap`, `/deal-maker` | What is a maximum allowable offer? Is the 70% rule still useful? What if target buy is far below list? | 1700 | Planned |

## 4. Financing — `financing`

**Pillar:** `/lenders` (Hard Money Lender Directory). Posts here are the top-of-funnel for the Pro directories, so each ends with a directory CTA in addition to the verdict CTA.

| # | Working title | Primary keyword | Secondary keywords | Intent | URL slug | Internal links (min 3) | FAQ questions to answer | Words | Status |
|---|---|---|---|---|---|---|---|---|---|
| 4.1 | Hard Money vs DSCR Loans: Cost, Speed, and Which Deal Each One Fits | hard money vs dscr loan | dscr loan vs hard money; dscr loan requirements; hard money loan rates | MOFU | `hard-money-vs-dscr-loans` | `/lenders`, `/blog/how-to-calculate-dscr`, `/strategies/brrrr`, `/strategies/fix-flip` | Can you refinance hard money into DSCR? What credit score does a DSCR loan need? What are typical hard money points? | 2000 | **Shipped** |
| 4.5 | DSCR Loan Requirements for Rental Property: What Lenders Check and the Numbers That Pass | dscr loan requirements rental property | dscr loan requirements; dscr loan minimum credit score; dscr loan down payment; how to qualify for a dscr loan | BOFU | `dscr-loan-requirements` | `/lenders`, `/blog/how-to-calculate-dscr`, `/blog/hard-money-vs-dscr-loans`, `/glossary/morby-method` | Minimum DSCR? Down payment? Credit score? Proof of income? STR allowed? | 1600 | **Shipped** |
| 4.2 | How to Find Hard Money Lenders by State (And What to Ask Them) | how to find hard money lenders | hard money lenders near me; local hard money lenders; questions to ask a hard money lender | BOFU | `how-to-find-hard-money-lenders-by-state` | `/lenders`, `/markets`, `/blog/hard-money-vs-dscr-loans` | Do hard money lenders lend in every state? What is a typical LTV? How fast can hard money close? | 1600 | Planned |
| 4.3 | Private Money vs Hard Money: The Real Difference Is Who Sets the Terms | private money vs hard money | private money lenders real estate; how to raise private money; private lender interest rate | TOFU | `private-money-vs-hard-money` | `/lenders`, `/blog/hard-money-vs-dscr-loans`, `/blog/creative-finance-field-guide` | Is private money cheaper than hard money? How do you find private lenders? Is a promissory note enough? | 1600 | Planned |
| 4.4 | BRRRR Refinance Seasoning: How Long Before You Can Pull Cash Out | brrrr refinance seasoning | cash out refinance seasoning period; brrrr refinance requirements; delayed financing exception | MOFU | `brrrr-refinance-seasoning` | `/strategies/brrrr`, `/blog/hard-money-vs-dscr-loans`, `/blog/how-to-estimate-arv`, `/lenders` | What is the seasoning period for a cash-out refi? What is delayed financing? What LTV can you refinance to? | 1700 | Planned |

## 5. Strategies — `strategies`

**Pillars:** the six `/strategies/*` pages. Each post compares two strategies on the same property so the reader sees the same inputs produce different verdicts.

| # | Working title | Primary keyword | Secondary keywords | Intent | URL slug | Internal links (min 3) | FAQ questions to answer | Words | Status |
|---|---|---|---|---|---|---|---|---|---|
| 5.1 | BRRRR vs Fix and Flip: Same House, Two Exits, Very Different Math | brrrr vs fix and flip | brrrr or flip; fix and flip vs buy and hold; brrrr strategy pros and cons | MOFU | `brrrr-vs-fix-and-flip` | `/strategies/brrrr`, `/strategies/fix-flip`, `/blog/how-to-estimate-arv`, `/blog/brrrr-refinance-seasoning` | Which makes more money? Which is more tax efficient? Can you switch from flip to BRRRR mid-project? | 2000 | **Shipped** |
| 5.2 | Short-Term Rental vs Long-Term Rental Cash Flow: What the Gross Number Hides | short term rental vs long term rental | airbnb vs long term rental profit; str vs ltr cash flow; short term rental expenses | MOFU | `short-term-rental-vs-long-term-rental` | `/strategies/short-term-rental`, `/strategies/long-term-rental`, `/blog/how-to-analyze-a-rental-property` | Do STRs make more than LTRs? What occupancy rate do you need? What does STR management cost? | 1900 | Planned |
| 5.3 | House Hacking Your First Deal: The Numbers at 3.5% Down | house hacking first deal | house hack duplex; fha house hack; how to house hack | TOFU | `house-hacking-first-deal` | `/strategies/house-hack`, `/blog/how-to-analyze-a-rental-property`, `/blog/cap-rate-vs-cash-on-cash-return` | Can you house hack with FHA? How long must you live there? Does house hacking cash flow? | 1700 | Planned |
| 5.4 | Wholesaling to Cash Buyers: How the Spread Really Gets Made | how to wholesale real estate | wholesale real estate for beginners; assignment fee; how to find cash buyers | TOFU | `wholesaling-to-cash-buyers` | `/strategies/wholesale`, `/directory`, `/blog/how-to-estimate-arv`, `/blog/target-buy-price-vs-list-price` | Is wholesaling legal? What is a typical assignment fee? How do you find cash buyers? | 1800 | Planned |

## 6. Markets — `markets`

**Pillar:** `/markets` (state pages, Stage 8). Posts here are the only ones allowed to quote state-level figures, and only the ones the `/markets/[state]` pages display.

| # | Working title | Primary keyword | Secondary keywords | Intent | URL slug | Internal links (min 3) | FAQ questions to answer | Words | Status |
|---|---|---|---|---|---|---|---|---|---|
| 6.1 | Best States for Rental Cash Flow: Vacancy, Property Tax, and Rent-to-Price | best states for rental property cash flow | best states to buy rental property; property tax by state for investors; landlord friendly states | TOFU | `best-states-for-rental-cash-flow` | `/markets`, `/blog/how-to-analyze-a-rental-property`, `/blog/cap-rate-vs-cash-on-cash-return` | Which state has the lowest property tax for investors? Does high appreciation offset low cash flow? | 2000 | Planned |
| 6.2 | How to Read a Local Market Before You Write the Offer | how to analyze a real estate market | real estate market analysis for investors; how to research a rental market; days on market meaning | MOFU | `how-to-read-a-local-market` | `/markets`, `/map-search`, `/blog/what-is-the-deal-gap`, `/blog/how-to-present-a-low-offer` | What days on market signals a motivated seller? How do you check rent demand? | 1700 | Planned |
| 6.3 | Property Tax Rates by State: What a 1% vs 2% Rate Does to Your Cash Flow | property tax rates by state investors | investment property tax rate; effective property tax rate; property tax cash flow | TOFU | `property-tax-rates-by-state-cash-flow` | `/markets`, `/blog/best-states-for-rental-cash-flow`, `/blog/how-to-analyze-a-rental-property` | How is effective property tax rate calculated? Do investors pay a higher rate? | 1500 | Planned |

**Totals:** 33 posts mapped in §1 to §6 (13 shipped), plus the §10 backlog. 6 clusters, 6 pillars.

---

## 7. Coverage priorities

Ship in this order. Each block is one month at the one-post-per-week cadence.

1. Fill Deal Analysis (2.4, 2.5, 2.6): most search volume, best fit with the product's core screens.
2. Fill Offers (3.3, 3.4, 3.5): highest conversion intent; short posts.
3. Fill Financing (4.2, 4.3, 4.4): feeds the Pro lender directory.
4. Creative Finance (1.1 to 1.6): the differentiated cluster; existing glossary gives it internal-link depth.
5. Strategies (5.2 to 5.4) and Markets (6.1 to 6.3) once `/markets` is indexed.

---

## 8. Editorial standard

Every published post must pass these before `status: published`. `npm run content:check` enforces the mechanical ones; the rest are on the author.

**Keyword placement**
- One primary keyword. It appears in `title`, `meta_title`, `meta_description`, the URL slug, and the first 100 words of the body, in natural language.
- Secondary keywords appear in H2s or body copy where they read naturally. Never stuff.
- H2s are phrased as the questions people type. If a heading would not make sense as a search query or an FAQ, rewrite it.

**Structure**
- No H1 in the body; the page renders the frontmatter `title` as the H1.
- 3 to 8 H2s. Use H3s for sub-steps, not for style.
- A worked example with real dollar figures computed with DealGapIQ methodology (Target Buy, Income Value, Deal Gap, DSCR, cash-on-cash). Numbers must be internally consistent; if a reader recomputes them, they match.
- At least one `::cta` directive placed after the worked example, plus the automatic end-of-post CTA.
- 3 to 6 `faq` entries in frontmatter. Answers are 40 to 90 words, self-contained, and would survive being shown alone in a search result.
- At least 3 `internal_links`: the cluster pillar, one glossary term or strategy page, one sibling post.

**Trust**
- No market statistics without a named source in the sentence. The only exception is data rendered on `/markets/[state]`, which cites its own source.
- Never fabricate rents, prices, rates, or vacancy. If a figure is illustrative, say "illustrative" and keep it plausible for the market named.
- Author is a real person with a bio (`author: Brad Geisen` today). Ghost bylines are not allowed.
- Every post ends with the standard disclaimer line: "We analyze. You decide. Not financial, legal, or investment advice."

**Maintenance**
- Bump `date_modified` on every substantive edit. Do not bump it for typo fixes.
- Review posts older than 12 months each quarter; refresh the numbers or mark the example date.
- If GSC shows a post ranking for a query outside its primary keyword, decide: retitle, or spin the query into a new row above.

**Length**
- Cluster posts: 1,200 to 2,000 words of body copy (frontmatter FAQ excluded). Pillars: 2,000 to 3,500. Longer is not better; complete is better.

---

## 9. Frontmatter template

```yaml
---
title: "Working title from the row"
slug: url-slug-from-the-row
type: blog
intent: TOFU | MOFU | BOFU
primary_keyword: primary keyword from the row
secondary_keywords:
  - secondary one
  - secondary two
meta_title: "<= 60 chars, primary keyword first"
meta_description: "<= 155 chars, primary keyword, a concrete promise, no ellipsis"
schema: BlogPosting
status: draft
category: creative-finance | deal-analysis | offers-negotiation | financing | strategies | markets
tags:
  - two-to-five
  - kebab-case
author: Brad Geisen
date_published: "YYYY-MM-DD"
date_modified: "YYYY-MM-DD"
internal_links:
  - /blog/cluster-pillar
  - /glossary/related-term
  - /blog/sibling-post
word_count_target: 1800
faq:
  - question: "Question phrased as searched?"
    answer: "40 to 90 word self-contained answer."
---
```

Body conventions: start with the problem in two or three sentences (primary keyword in the first 100 words), then H2s. Use `:::callout{type="example"}` for the worked-numbers block, `:::callout{type="warning"}` for risk, and `::cta[Label]{href="/discovery"}` once after the example.

---

## 10. Search-term sheet triage (September 2026)

Source: `Top_100_Real_Estate_Keywords.xlsx` and `US_Residential_Real_Estate_Investor_Search_Terms.xlsx` (200 terms, 5 category domains, volume and intent labels). This section records how each class of term maps to the blog so the sheets do not have to be re-read.

### 10.1 The triage rule

A term earns a blog post only when a blog post can satisfy the intent behind it. Three classes, decided by reading the SERP the term implies rather than the term itself:

| Class | Share of the 200 | What the searcher wants | What we do |
|---|---|---|---|
| **Listing intent** ("duplexes for sale near me", "foreclosed homes for sale", "Florida investment properties for sale", "hard money lenders near me") | ~35% | An inventory page with filters. Google serves Zillow, Redfin, LoopNet, Auction.com, or a lender directory. | No blog post. Where we own a matching inventory surface (`/lenders`, `/directory`, `/markets`, `/map-search`) the term is that page's keyword, not the blog's. Otherwise skip. |
| **Data we do not hold** ("property tax rates by county", "eviction rates by state", "rent control laws by city", "best places to buy rental property [year]", "average cap rate by city", "US housing market crash forecast") | ~15% | A table or a forecast. | Skip until a first-party source exists (state tax/vacancy is on `/markets`; city data waits on `docs/feature-plans/market-snapshots-pipeline.md`). The editorial standard forbids fabricating it. |
| **Method / number intent** ("how to calculate cap rate", "DSCR loan requirements", "cash flow positive rental properties", "BRRRR method", "off market properties", "1% rule") | ~50% | A method and a worked number. | Blog post, mapped below. This is exactly what the product does, so every one of these converts to a verdict run. |

Two adjustments when a high-volume term is listing-intent but the *underlying* need is a method: rewrite the keyword to the informational form and target that. "Off market properties for sale" → "how to find off market properties" (shipped, 3.6). "Cash flow positive rental properties" is already both, and ranks for the method (2.8). "Investment properties for sale near me" has no honest informational rewrite and is skipped.

### 10.2 Terms already covered by shipped posts

| Sheet term | Sheet rank / volume | Covered by |
|---|---|---|
| cash flow positive rental properties | #10, High | 2.8 `cash-flow-positive-rental-properties` |
| DSCR loan requirements rental property | #42, High | 4.5 `dscr-loan-requirements` |
| off market properties for sale | #2, High | 3.6 `how-to-find-off-market-properties` |
| debt service coverage ratio calculator | #59, High | 2.3 `how-to-calculate-dscr` |
| how to calculate cap rate residential; cap rate calculator | #57, High | 2.2 `cap-rate-vs-cash-on-cash-return` (consider a dedicated 2.9 if GSC shows the query splitting) |
| BRRRR method real estate; BRRRR method properties | #4, High | 5.1 `brrrr-vs-fix-and-flip` + `/strategies/brrrr` (add 5.5 below for the pure how-to) |
| subject to real estate deals; creative financing real estate; seller financing real estate | #13, #12, Medium | 1.0 `creative-finance-field-guide`, 3.2 `subject-to-pitch-script-template` |
| rental property cash flow calculator | #56, High | 2.1 `how-to-analyze-a-rental-property`, 2.8 |
| hard money loan rates; hard money vs DSCR | Medium | 4.1 `hard-money-vs-dscr-loans` |

### 10.3 Backlog: ready-to-write rows from the sheets

Ordered by (volume × fit with the product). Each is one post at the weekly cadence; write to §8 and the template in §9.

| # | Working title | Primary keyword (sheet term) | Sheet signal | Cluster | URL slug | Internal links | FAQ questions | Words |
|---|---|---|---|---|---|---|---|---|
| 5.5 | The BRRRR Method, Step by Step, With the Refinance Math That Decides It | brrrr method real estate | #4 High, High Intent | strategies | `brrrr-method-step-by-step` | `/strategies/brrrr`, `/blog/brrrr-vs-fix-and-flip`, `/blog/dscr-loan-requirements`, `/blog/how-to-estimate-arv` | What does BRRRR stand for? How much cash do you get back? What ARV do you need? | 2000 |
| 5.6 | Are Turnkey Rental Properties Worth It? Run the Numbers Before the Brochure Does | turnkey rental properties | #3 High, High Intent | strategies | `turnkey-rental-properties-worth-it` | `/strategies/long-term-rental`, `/blog/cash-flow-positive-rental-properties`, `/blog/cap-rate-vs-cash-on-cash-return` | What is a turnkey rental? What premium do you pay? Do turnkey properties cash flow? | 1700 |
| 5.7 | How to Evaluate a Wholesale Real Estate Deal (Before You Wire the Earnest Money) | wholesale real estate deals | #9 High, High Intent | strategies | `how-to-evaluate-a-wholesale-deal` | `/strategies/wholesale`, `/directory`, `/blog/how-to-find-off-market-properties`, `/blog/how-to-estimate-arv` | Is the wholesaler's ARV reliable? What is a fair assignment fee? Can you back out? | 1700 |
| 5.8 | Fix and Flip Homes: How to Underwrite One From the Listing to the Resale | fix and flip homes | #5 High, High Intent | strategies | `how-to-underwrite-a-fix-and-flip` | `/strategies/fix-flip`, `/blog/brrrr-vs-fix-and-flip`, `/blog/rehab-budget-by-the-numbers`, `/lenders` | What is the 70% rule? What holding costs do flippers miss? What profit margin is realistic? | 1900 |
| 2.9 | Gross Rent Multiplier: The 30-Second Screen and Where It Lies | gross rent multiplier | #60 Medium; Top-100 list | deal-analysis | `gross-rent-multiplier` | `/methodology`, `/blog/cap-rate-vs-cash-on-cash-return`, `/blog/one-percent-rule-is-dead` | What is a good GRM? GRM vs cap rate? Does GRM include expenses? | 1400 |
| 2.10 | ROI on a Rental Property: Cash-on-Cash, Total Return, and Which One to Trust | roi on rental property | Top-100 list | deal-analysis | `roi-on-rental-property` | `/methodology`, `/blog/cap-rate-vs-cash-on-cash-return`, `/blog/cash-flow-positive-rental-properties` | What is a good ROI on a rental? Does ROI include appreciation? How is IRR different? | 1600 |
| 2.11 | Rent-to-Price Ratio by Market: How to Read It and Why 0.8% Is the New 1% | rent to price ratio | #71 Medium, Analytical | deal-analysis | `rent-to-price-ratio-by-market` | `/markets`, `/blog/one-percent-rule-is-dead`, `/blog/cash-flow-positive-rental-properties` | What is a good rent-to-price ratio? How does it differ from the 1% rule? Does it include expenses? | 1500 |
| 4.6 | Private Money Lenders for Real Estate: How to Find Them and What They Expect | private money lenders real estate | #43 Medium, High Intent | financing | `private-money-lenders-real-estate` (merge with 4.3) | `/lenders`, `/blog/hard-money-vs-dscr-loans`, `/blog/creative-finance-field-guide` | see 4.3 | 1600 |
| 4.7 | FHA 203k for a Multifamily: The Owner-Occupied Rehab Loan Investors Overlook | fha 203k loan multi family | #47 Medium, High Intent | financing | `fha-203k-multifamily` | `/strategies/house-hack`, `/blog/house-hacking-first-deal`, `/blog/rehab-budget-by-the-numbers` | Can you use 203k on a fourplex? What is the max rehab? How long does it take? | 1600 |
| 4.8 | HELOC for an Investment Property: Using Home Equity as the Down Payment | heloc for investment property | Top-100 list | financing | `heloc-for-investment-property` | `/blog/cash-flow-positive-rental-properties`, `/blog/dscr-loan-requirements`, `/blog/brrrr-refinance-seasoning` | Can you get a HELOC on a rental? Does a HELOC count against DSCR? What rate should you model? | 1500 |
| 1.7 | Owner-Financed Homes: How to Find Them and What the Seller Will Want | owner financed homes | Top-100 list; #12 | creative-finance | `owner-financed-homes` | pillar, `/glossary/seller-carryback`, `/blog/how-to-find-off-market-properties`, `/blog/how-to-structure-a-seller-carryback` | Where do you find owner-financed homes? What down payment do sellers want? Is a balloon standard? | 1600 |
| 1.8 | Assumable Mortgages for Investors: Taking Over a 3% Loan in a 7% Market | assumable mortgage homes | Top-100 list | creative-finance | `assumable-mortgage-investors` | pillar, `/glossary/subject-to-financing`, `/glossary/due-on-sale-clause-sub2` | Which loans are assumable? Can an investor assume an FHA loan? Assumption vs subject-to? | 1500 |
| 5.9 | House Hacking Properties: What to Look For and How the Numbers Change at 3.5% Down | house hacking properties | #20 Medium, High Intent | strategies | merge into 5.3 | see 5.3 | see 5.3 | — |
| 6.4 | Sunbelt Real Estate Investing: Why the Cash Flow Is There and Where It Is Not | sunbelt real estate investing | #81 High, High Intent | markets | `sunbelt-real-estate-investing` | `/markets`, `/blog/best-states-for-rental-cash-flow`, state pages for FL, TX, GA, NC, TN | Which states count as the Sunbelt? Why do investors favor it? What are the risks? | 1700 |
| 6.5 | Landlord-Friendly States: What Actually Makes a State Landlord-Friendly | landlord friendly states | #78 High, Analytical | markets | `landlord-friendly-states` | `/markets`, `/blog/best-states-for-rental-cash-flow` | What defines landlord-friendly? Does it matter more than cash flow? | 1500 — **only** with a named legal source for every state claim; otherwise skip |

### 10.4 Terms deliberately not chased

Listing intent with no honest rewrite: investment properties for sale near me; foreclosed / REO / distressed / short sale homes for sale; turnkey rental properties for sale (the *worth it* angle is 5.6); every "for sale" property-type term (duplex, triplex, fourplex, multifamily, small apartment building, townhomes, mobile home parks, land, ADU, student housing, senior living, co-living, build-to-rent, Section 8, manufactured homes, waterfront, mixed use, vacation rentals); every "[state] properties for sale" term; hard money lenders near me (that is `/lenders`); real estate syndication opportunities; DST 1031 exchange properties; Opportunity Zones properties for sale; 1031 exchange qualified cities.

Data we do not hold: property tax rates by county; eviction rates by state; rent control laws by city; average cap rate by city; highest cash on cash return markets; gross rental yields by state; fastest growing housing markets; best places to buy rental property [year]; housing market crash forecast; in-migration patterns; job growth by city; housing inventory levels; months of supply; median price vs rent index; housing starts; STR occupancy analytics; real estate market report [city]; every "[city]" and "zip code" term; population growth cities; school districts; FEMA flood maps; walkable neighborhoods; transit-oriented development.

Out of the product's lane: mezzanine debt; preferred equity platforms; promotional equity / waterfalls; non-recourse loans; real estate crowdfunding; self-directed IRA; blanket mortgage; portfolio lenders; commercial mortgage rates; conventional loan limits (informational, no differentiation); 1031 exchange mechanics (a glossary term, not a post); tax lien sales.

Revisit the data class as soon as `/markets/[state]` is indexed and the snapshot pipeline exists; several of those terms are high volume and the state pages are the natural home for them.
