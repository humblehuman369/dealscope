/**
 * Single source of truth for plan-feature marketing claims.
 *
 * Every line here must match real enforcement:
 * - Feature flags: TIER_LIMITS in backend/app/models/subscription.py
 *   (pdf_reports, excel_proforma, rental_comps, editable_inputs, … are PRO)
 * - Directories: backend/app/services/directory_gates.py — viewing and
 *   exports are PAID-only. Trialing users are refused with
 *   "The directories unlock with your first payment." Do NOT claim trial
 *   directory access anywhere.
 *
 * The homepage and the pricing page must consume these constants rather
 * than defining their own lists, so the two surfaces cannot drift apart
 * (or drift from the backend) again.
 */

/** Free / Starter tier — pricing page card. */
export const STARTER_FEATURES: string[] = [
  'Property search + Interactive Map Search',
  '10 property analyses per month',
  'Discovery with deal score & plain-language explanations',
  'Income Value, Target Buy & Deal Gap on every property',
  'Multi-source IQ Estimates — Zillow, RentCast, Redfin, Realtor',
  'All 6 strategy snapshots — LTR, STR, BRRRR, Flip, House Hack, Wholesale',
  'Seller Motivation indicator',
  'Save up to 10 properties to DealGapIQ pipeline',
]

/** Pro tier — pricing page card ("Everything in Starter, plus"). */
export const PRO_FEATURES: string[] = [
  'Unlimited property analyses',
  'Full calculation breakdown — see every number behind Discovery',
  'Editable assumptions & stress testing — adjust rent, rates, and expenses',
  'Comps — professional sale & rental comparables with adjusted valuation',
  'Market Consensus engine — aggregate view across all data sources',
  'Sensitivity analysis — see how deal metrics shift across scenarios',
  '10-year financial proforma projections',
  'Deal Maker interactive worksheet with real-time recalculation',
  'Downloadable Excel proforma & strategy-specific worksheets',
  'PDF property reports',
  'DealGapIQ pipeline with unlimited saves & side-by-side deal comparison',
  'Cash Buyer Directory — direct access to verified cash buyers by market',
  'Hard Money Lender Directory — fix & flip, BRRRR, bridge, and DSCR lenders',
]

/** Free tier — homepage pricing section (short list). */
export const HOMEPAGE_FREE_FEATURES: string[] = [
  '10 discoveries per month',
  'Full 4-path analysis',
  'Negotiation scripts',
  'Save up to 10 properties',
]

/**
 * Pro tier — homepage pricing section (short list).
 * Directory lines take live counts so the homepage can show real totals.
 */
export function homepageProFeatures(buyerTotalLabel: string, lenderTotalLabel: string): string[] {
  return [
    'Unlimited discoveries',
    `Cash Buyer Directory (${buyerTotalLabel} verified contacts)`,
    `Hard Money Lender Directory (${lenderTotalLabel} lenders)`,
    'Professional sale & rental comps with adjusted valuation',
    'Editable assumptions + Deal Maker worksheet',
    'Excel proformas & PDF property reports',
    'Side-by-side deal comparison',
  ]
}

/**
 * Mirrors backend copy in directory_usage.py. Trial does NOT include
 * directory viewing or exports — both require a settled first payment.
 */
export const DIRECTORY_ACCESS_NOTE = 'Directories and exports unlock with your first payment.'
