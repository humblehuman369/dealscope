---
title: "What Is the Deal Gap? The One Number That Tells You What to Offer"
slug: what-is-the-deal-gap
type: blog
intent: TOFU
primary_keyword: deal gap real estate
secondary_keywords:
  - target buy price
  - income value real estate
  - how much below asking to offer investment property
  - what to offer on a rental property
meta_title: "What Is the Deal Gap in Real Estate? (Worked Example)"
meta_description: "The Deal Gap is the distance between asking price and the Target Buy that makes a rental pencil. How it is calculated, with a $325K worked example."
schema: BlogPosting
status: published
category: deal-analysis
tags:
  - deal-gap
  - target-buy
  - income-value
  - underwriting
author: Brad Geisen
date_published: "2026-09-03"
date_modified: "2026-09-03"
internal_links:
  - /methodology
  - /what-is-dealgapiq
  - /blog/how-to-analyze-a-rental-property
  - /blog/how-to-make-an-offer-on-an-investment-property
  - /blog/lake-worth-teardown-four-offer-structures
  - /discovery
word_count_target: 1800
faq:
  - question: "What is a good Deal Gap?"
    answer: "Zero or negative. A Deal Gap of 0% means the asking price already equals your Target Buy, so the strategy pencils at list. A negative Deal Gap means the property is priced below your Target Buy, which is rare and usually worth a fast second look. Most listings show a positive Deal Gap of 10% to 25%, which is the range where offer structure, not just price, decides the deal."
  - question: "Is a positive Deal Gap a dead deal?"
    answer: "No. A positive Deal Gap tells you how far the price is from working at standard terms. It can be closed by a lower price, by financing that lowers the monthly payment (a seller-carried second, an assumed low-rate loan), by verifying the rent is higher than the estimate, or by a blend of small concessions. The gap is the size of the problem, not the verdict."
  - question: "How is Target Buy calculated?"
    answer: "Target Buy is the highest price at which a property hits your return threshold for a given strategy. For a long-term rental that threshold is usually a cash-on-cash return; DealGapIQ solves for the price where net operating income minus debt service equals that return on the cash you put in, using the down payment, rate, closing costs, taxes, insurance, vacancy, maintenance, and reserves in front of you."
  - question: "What is the difference between Income Value and Target Buy?"
    answer: "Income Value is the break-even price: the most you can pay and still have the rent cover every expense and the mortgage with nothing left over. Target Buy is lower, because it also requires the return you want. Income Value tells you where the deal stops covering itself; Target Buy tells you where it starts paying you."
---

Every investor has a version of the same question: *how much below asking should I offer?* The usual answers are folk rules. Ten percent. The 70% rule. Whatever the seller will take.

The Deal Gap replaces the folk rule with a measurement. It is the percentage distance between the asking price and the **Target Buy**, the price at which the property actually meets your return threshold. A 16.7% Deal Gap does not mean "offer 16.7% less." It means the asking price is 16.7% above the number where this property works for you, and now you know exactly how much problem you are solving.

This post explains what the Deal Gap is, how it is derived, and what to do with it.

## The three numbers behind the Deal Gap

DealGapIQ produces three prices for every property and every strategy. They stack.

| Number | What it answers | Direction |
|---|---|---|
| **Asking price** (or estimated market price when off-market) | What the seller wants | Given |
| **Income Value** | The most you can pay and still break even on cash flow | Ceiling |
| **Target Buy** | The most you can pay and still hit your return target | Offer anchor |

The Deal Gap is:

> **Deal Gap = (Asking price − Target Buy) ÷ Asking price**

A positive Deal Gap means the asking price is above what the strategy supports. A negative Deal Gap means the property is already priced below your Target Buy. Zero means it pencils at list.

The full derivation of the inputs is on the [methodology page](/methodology). The rest of this post shows it on a real-shaped example.

## A worked example: $325,000 asking, $2,600 rent

Take a single-family long-term rental with these inputs. These are illustrative but plausible for a mid-priced Sun Belt suburb; every one of them is editable in the product.

:::callout{type="example"}
**Property:** $325,000 asking · $2,600/month rent
**Financing:** 20% down ($65,000) · 6.0% · 30 years · 3% closing costs ($9,750)
**Operating:** property tax 1.2% of price ($325/mo) · insurance 1.0% ($271/mo) · vacancy 5% ($130) · maintenance 5% ($130) · capital reserves 5% ($130) · self-managed
**Return target:** 8% cash-on-cash
:::

Step 1: monthly operating expenses. $325 + $271 + $130 + $130 + $130 = **$986**.

Step 2: net operating income. $2,600 − $986 = $1,614/month, or **$19,370/year**.

Step 3: debt service. A $260,000 loan at 6% over 30 years is $1,559/month, or **$18,706/year**.

Step 4: cash flow at asking. $19,370 − $18,706 = **$664/year**, about $55/month. On $74,750 invested (down payment plus closing), that is a **0.9% cash-on-cash return**.

The property is not losing money at asking. It is just not paying you. A 5.96% cap rate looks respectable on a listing sheet, and it hides a sub-1% return on your actual cash. That difference is the whole reason this number exists.

## Solving for Income Value

Income Value is the price where cash flow is exactly zero. Taxes, insurance, and the loan all scale with price, so you solve for it rather than guess.

At this rent and these assumptions, **Income Value is $333,347**. The asking price is about $8,000 under it, which is why cash flow is slightly positive. Pay one dollar more than Income Value and the property costs you money every month before appreciation.

## Solving for Target Buy

Target Buy adds the return requirement. At an 8% cash-on-cash target, the price where NOI minus debt service equals 8% of the cash invested is **$270,731**.

Check it: at $270,731 the loan is $216,585, the payment is $1,299/month, NOI (with lower taxes and insurance at the lower price) is $20,564, debt service is $15,582, and cash flow is $4,981 on $62,268 invested. That is 8.0%, and the debt service coverage ratio is 1.32, which most DSCR lenders would accept.

## The Deal Gap on this property

> ($325,000 − $270,731) ÷ $325,000 = **16.7%**

In dollars, the gap is **$54,269**. That is the size of the problem.

::cta[See the Deal Gap on a property you are watching →]{href="/discovery"}

## What a 16.7% Deal Gap tells you

It does not tell you to offer $270,731. It tells you three things a folk rule cannot.

**Whether price alone can close it.** A 16.7% price cut is a hard ask on a fresh listing and a routine one on a 90-day-old listing with two prior reductions. Same gap, different conversation. Days on market and the seller's situation decide which.

**Which financing levers are big enough.** Every $10,000 of price at 80% loan-to-value is about $48/month of payment. But a seller-carried second at 0% on part of the price, or an assumed 3.25% loan, moves the monthly payment far more than a $10,000 discount does. On this property, a $48,750 seller second at 0% with a smaller bank first raises cash-on-cash from 0.9% to 5.6% at full asking, without touching the price. The gap tells you how much monthly payment you need to remove; the structure tells you how.

**Whether the rent estimate is the real problem.** If a three-comp check supports $2,750 instead of $2,600, NOI rises $1,530 a year and the Target Buy rises with it. Sometimes the gap is a data problem, not a price problem. Verify rent first; it is the cheapest lever.

## Deal Gap by strategy

The same property has a different Target Buy for each strategy, because each strategy values it differently. A fix-and-flip Target Buy is driven by after-repair value and selling costs. A BRRRR Target Buy is driven by the refinance appraisal. A house hack Target Buy is higher than a pure rental's because you occupy one unit at a 3.5% down payment.

That is why DealGapIQ computes the Deal Gap independently for all six strategies and ranks them. A property with a 17% gap as a long-term rental can have a 4% gap as a house hack. The verdict is not "good deal" or "bad deal." It is "here is the strategy where the gap is smallest, and here is what closes it."

## How to use the Deal Gap in an offer

1. **Verify the inputs.** Rent, taxes, insurance. A wrong input produces a wrong gap with a confident face.
2. **Read the gap against the seller.** Under 5%: offer near Target Buy with clean terms. 5% to 15%: lead with a small price ask plus one structural lever. Over 15%: the deal closes on structure, or it does not close.
3. **Pick the lever that removes the most monthly payment per dollar of seller concession.** Seller seconds and assumable loans win here; straight discounts lose.
4. **Write the offer at Target Buy or at asking-with-terms, never in between with nothing to show for it.**

The [Lake Worth teardown](/blog/lake-worth-teardown-four-offer-structures) walks through four structures on one property with a 10.8% gap. The [offer pillar](/blog/how-to-make-an-offer-on-an-investment-property) turns this into a repeatable process.

## What the Deal Gap is not

It is not a prediction of what the seller will accept. It is not a valuation; the property may well be worth the asking price to an owner-occupant. It is a measurement of the distance between the price and *your* return requirement, on *your* assumptions, for *one* strategy.

Change the return target and the gap changes. That is the point. A tool that gives one answer regardless of who is asking is not analyzing anything.

We analyze. You decide. Not financial, legal, or investment advice.
