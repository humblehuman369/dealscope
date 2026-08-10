# Worked Property Examples

Companion to *The Deal Gap*. Round numbers for teaching — not a claim about any real address.

**Shared teaching defaults (unless noted):**

- Buy discount for Target Buy: **5%** below Income Value  
- Deal Gap: `(Asking − Target Buy) / Asking × 100`  
- Figures are simplified so you can follow the logic without a full amortization workbook  

For a faster pass on real addresses, run the same framework at [dealgapiq.com](https://dealgapiq.com).

---

## Example A — Long-Term Rental with a 10% Deal Gap

**Property (fictional):** 3 bed / 2 bath single-family, Sunbelt suburb  
**Asking price:** $400,000  
**Strategy:** Long-term rental (LTR)

### Inputs you can defend (base case)

| Input | Amount | Notes |
|---|---|---|
| Monthly rent | $2,400 | Midpoint of three leased comps |
| Vacancy | 6% | ~3 weeks/year equivalent |
| Effective gross income (monthly) | $2,256 | $2,400 × (1 − 0.06) |
| Taxes | $350/mo | From assessment / prior year |
| Insurance | $180/mo | Quote — not a guess |
| Maintenance | $150/mo | ~0.5% of price / year ÷ 12 (placeholder; replace with property-specific) |
| Property management | $192/mo | 8% of collected rent |
| Other (lawn, etc.) | $50/mo | |
| **Total operating (monthly)** | **$922** | |
| **NOI (monthly)** | **$1,334** | $2,256 − $922 |
| **NOI (annual)** | **$16,008** | |

### Financing (investor purchase)

| Input | Value |
|---|---|
| Down payment | 25% |
| Loan | 75% LTV |
| Rate | 7.0% |
| Term | 30 years |

### Income Value (teaching walkthrough)

Income Value answers: *About how high can purchase price go before this income no longer supports the deal under these loan terms?*

Teaching shortcut used in this example (rounded for clarity):

1. Annual debt service on a $300,000 loan (75% of $400k) at 7%/30 ≈ **$23,950/year** (~$1,996/mo).  
2. At asking, monthly cash flow ≈ NOI $1,334 − debt $1,996 = **−$662**. Asking does **not** work.  
3. We solve for a purchase price where debt service fits under NOI with our required margin.  

For the book’s three-number method, assume the spreadsheet / calculator returns:

| Number | Value |
|---|---|
| **Income Value** | **$360,000** |
| **Target Buy** (5% discount) | $360,000 × 0.95 = **$342,000** |
| **Asking** | **$400,000** |
| **Deal Gap** | (400,000 − 342,000) / 400,000 = **14.5%** → treat as **~15% band** |

*Why Income Value can sit below a naive “rent × multiplier” guess:* taxes, insurance, vacancy, and management ate a large slice of the gross. The 1% rule ($4,000/mo rent on a $400k house) would have lied to you — this house rents at $2,400.

### Reading the gap

- Band: **15%** → hard mode for a clean price-only ask  
- First path options:
  1. **Price** — offer near $342k (likely needs motivation)  
  2. **Income re-verify** — if rent comps support $2,550 and insurance is $150, recompute before you fall in love  
  3. **Structure** — seller credit or carry that improves cash flow without a full $58k cut  
  4. **Pass** — if seller is firm retail and no structure — valid outcome  

### Decision log line

`Example A | Ask 400k | TB 342k | Gap ~14.5% | LTR | Paths: income re-check then structure | Else PASS`

---

## Example B — Same House as a House Hack (Gap Shrinks)

**Same property and asking price:** $400,000  
**Strategy:** House hack — owner occupies primary bedroom, rents two rooms

### What changes

You are not underwriting pure investment cash-on-cash the same way. Part of the “return” is **housing cost offset** — money you no longer pay to a landlord elsewhere.

| Input | Amount | Notes |
|---|---|---|
| Market rent if fully leased as LTR | $2,400 | Same as Example A |
| Room rents (2 rooms) | $900 + $850 = **$1,750** | Conservative for the area |
| Owner housing benefit | $1,400/mo | What owner would pay to rent a similar place |

### Simplified comparison

**LTR investor view (Example A):** Target Buy ~$342k, Deal Gap ~14.5%.

**House hacker view (teaching):**

- Room income $1,750 offsets the mortgage materially  
- Owner still “pays” the gap between full payment and room income — but that residual may beat their current rent  
- Effective willingness to pay rises because personal housing is part of the deal  

Assume after house-hack underwriting:

| Number | Value |
|---|---|
| **Income Value** (house-hack framing) | **$395,000** |
| **Target Buy** (3% discount — less margin required because of housing offset) | ≈ **$383,000** |
| **Deal Gap** | (400,000 − 383,000) / 400,000 = **4.25%** → **0–5% band** |

### Lesson

Same roof. Same ask. Different strategy → different Target Buy → different Deal Gap.

The house was not “a bad deal” in absolute terms. It was a **bad LTR at asking** and a **plausible house hack** if the owner can live with roommates and the loan program fits.

### Decision log line

`Example B | Ask 400k | TB 383k | Gap ~4% | House hack | Path: price (small) or as-is if rate/product helps | Constraints: owner-occ, roommate fit`

---

## Example C — LTR Pass vs Wholesale Maybe

**Property (fictional):** 4/2 fixer, older subdivision  
**Asking price:** $275,000  
**Condition:** Needs ~$40,000 rehab before rent-ready  

### Branch 1 — Buy-and-hold LTR at asking (retail mindset)

| Input | Amount |
|---|---|
| After-repair rent | $1,950/mo |
| All-in cost if pay asking + rehab | $275k + $40k = **$315,000** |
| Income Value (stabilized, teaching result) | **$265,000** |
| Target Buy on stabilized basis (5% off) | **$252,000** |

You cannot compare Target Buy only to $275k asking. Your economic basis is closer to **$315k** if you fund rehab.

Deal Gap versus all-in:

`(315,000 − 252,000) / 315,000 ≈ 20%` → **15%+ band**, plus execution risk.

**LTR verdict at these numbers:** PASS unless price drops hard or rehab is cheaper with bids in hand.

### Branch 2 — Wholesale to a BRRRR buyer

You do not want to hold. You want an assignment fee.

| Input | Amount |
|---|---|
| End buyer’s max (their Target Buy on ARV/rent thesis) | $245,000 contract price |
| Your negotiable contract with seller | $230,000 |
| Assignment fee | **$15,000** (if it closes) |
| Rehab (buyer’s problem) | $40,000 |

Your “Deal Gap” work is different: does the **buyer’s** Deal Gap still close after they pay you a fee?

If the buyer’s Target Buy is $245k and seller will not go below $260k, there is **no spread** — you do not invent one.

### Lesson

- LTR at retail asking + rehab = phantom deal if you ignore all-in basis  
- Wholesale only exists when a real end-buyer Target Buy sits above your contract price  
- Strategy ranking prevents you from forcing an LTR story onto a wholesale house (or the reverse)

### Decision log line

`Example C | Ask 275k + 40k rehab | LTR TB 252k | Gap ~20% all-in | LTR PASS | Wholesale only if seller ≤ ~230k and buyer TB ≥ 245k`

---

## Side-by-side summary

| | Example A (LTR) | Example B (House hack) | Example C (LTR vs Wholesale) |
|---|---|---|---|
| Ask | $400k | $400k | $275k (+$40k rehab) |
| Strategy | LTR | House hack | LTR / Wholesale |
| Target Buy | ~$342k | ~$383k | ~$252k stabilized |
| Deal Gap | ~14.5% | ~4% | ~20% all-in (LTR) |
| Band | ~15% | 0–5% | 15%+ |
| First move | Re-verify income / structure | Small price path | LTR pass; wholesale if spread |

---

## How to reuse these examples

1. Replace every input with a real quote or “unknown.”  
2. Recompute Income Value → Target Buy → Deal Gap.  
3. Rank at least two strategies before you offer.  
4. Log pursue / pass / path in one line.

When you are ready to run this on live addresses without rebuilding the sheet each time, use [DealGapIQ](https://dealgapiq.com).
