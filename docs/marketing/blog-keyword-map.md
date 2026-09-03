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

## 3. Offers and Negotiation — `offers-negotiation`

**Pillar:** `/blog/how-to-make-an-offer-on-an-investment-property` (post). The two existing posts (teardown, Sub2 script) already live here.

| # | Working title | Primary keyword | Secondary keywords | Intent | URL slug | Internal links (min 3) | FAQ questions to answer | Words | Status |
|---|---|---|---|---|---|---|---|---|---|
| 3.0 | How to Make an Offer on an Investment Property (Price, Terms, and the Four Structures) | how to make an offer on an investment property | how much to offer on a rental property; investment property offer strategy; offer below asking price investment property | BOFU pillar | `how-to-make-an-offer-on-an-investment-property` | `/blog/what-is-the-deal-gap`, `/blog/lake-worth-teardown-four-offer-structures`, `/blog/subject-to-pitch-script-template`, `/deal-maker`, `/discovery` | How much below asking should an investor offer? Should you offer with contingencies? What makes a seller take terms over price? | 3000 | **Shipped** |
| 3.1 | The Lake Worth Teardown: One Property, Four Ways to Close It | how to make offer below asking | real estate deal analysis example; creative finance offer structures | BOFU | `lake-worth-teardown-four-offer-structures` | existing | existing | 2000 | **Shipped** |
| 3.2 | The Subject-To Pitch Script | subject to pitch script | sub2 cold call script; how to pitch subject to financing | BOFU | `subject-to-pitch-script-template` | existing | existing | 1800 | **Shipped** |
| 3.3 | The Seller Financing Pitch Script: How to Ask a Seller to Be the Bank | seller financing pitch script | how to ask seller for owner financing; seller financing script; how to convince a seller to do seller financing | BOFU | `seller-financing-pitch-script` | pillar, `/glossary/seller-carryback`, `/blog/how-to-structure-a-seller-carryback`, `/blog/subject-to-pitch-script-template` | What do you say to a seller about owner financing? What objections come up? Do you need an attorney? | 1800 | Planned |
| 3.4 | How to Present a Low Offer Without Insulting the Seller | how to make a lowball offer on a house | low offer script real estate; how to justify a low offer; offer 20 percent below asking | BOFU | `how-to-present-a-low-offer` | pillar, `/blog/what-is-the-deal-gap`, `/blog/how-to-analyze-a-rental-property`, `/discovery` | Is 20% below asking insulting? How do you justify a low offer? Should you show your numbers? | 1600 | Planned |
| 3.5 | Target Buy Price vs List Price: Closing the Gap Without a Price War | target buy price real estate | max allowable offer; how to calculate maximum offer investment property; 70 percent rule | MOFU | `target-buy-price-vs-list-price` | pillar, `/methodology`, `/blog/what-is-the-deal-gap`, `/deal-maker` | What is a maximum allowable offer? Is the 70% rule still useful? What if target buy is far below list? | 1700 | Planned |

## 4. Financing — `financing`

**Pillar:** `/lenders` (Hard Money Lender Directory). Posts here are the top-of-funnel for the Pro directories, so each ends with a directory CTA in addition to the verdict CTA.

| # | Working title | Primary keyword | Secondary keywords | Intent | URL slug | Internal links (min 3) | FAQ questions to answer | Words | Status |
|---|---|---|---|---|---|---|---|---|---|
| 4.1 | Hard Money vs DSCR Loans: Cost, Speed, and Which Deal Each One Fits | hard money vs dscr loan | dscr loan vs hard money; dscr loan requirements; hard money loan rates | MOFU | `hard-money-vs-dscr-loans` | `/lenders`, `/blog/how-to-calculate-dscr`, `/strategies/brrrr`, `/strategies/fix-flip` | Can you refinance hard money into DSCR? What credit score does a DSCR loan need? What are typical hard money points? | 2000 | **Shipped** |
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

**Totals:** 30 posts mapped (8 shipped in the seed batch + 2 pre-existing), 6 clusters, 6 pillars.

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
