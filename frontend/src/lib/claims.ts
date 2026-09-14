/**
 * Single source of truth for public product claims.
 *
 * Directory counts are the exact row counts of the seed datasets.
 * Source count is the Discovery roster Discovery actually renders.
 * Prices match the checkout display amounts in billing_service
 * (`price_monthly=3499`, `price_yearly=34999`). The yearly-per-month
 * figure is derived, never typed.
 */

import { ALL_SOURCE_IDS } from '@/utils/propertySourceMapper'

/** Exact cash-buyer directory rows (`backend/app/data/buyers.json`). */
export const BUYER_TOTAL = 2812
/** Exact lender directory rows (`backend/app/data/lenders.json` → `lenders`). */
export const LENDER_TOTAL = 484

function formatCount(n: number): string {
  return n.toLocaleString('en-US')
}

function dollarsFromPrice(price: string): number {
  return Number(price.replace(/[^0-9.]/g, ''))
}

/** Exact cash-buyer row count, comma-formatted, no rounding, no plus. */
export const BUYER_COUNT = formatCount(BUYER_TOTAL)

/** Exact lender row count, comma-formatted, no rounding, no plus. */
export const LENDER_COUNT = formatCount(LENDER_TOTAL)

/** Discovery value-source roster length (IQ + providers). */
export const SOURCE_COUNT = ALL_SOURCE_IDS.length

/** Monthly Pro price as shown at checkout. */
export const PRO_MONTHLY_PRICE = '$34.99'

/** Yearly Pro price as shown at checkout. */
export const PRO_YEARLY_PRICE = '$349.99'

/** Per-month equivalent of annual billing, derived from the yearly price. */
export const PRO_YEARLY_PER_MONTH = (dollarsFromPrice(PRO_YEARLY_PRICE) / 12).toFixed(2)

/** Monthly amount without a leading $. */
export const PRO_MONTHLY_AMOUNT = dollarsFromPrice(PRO_MONTHLY_PRICE).toFixed(2)

/** Yearly amount without a leading $. */
export const PRO_YEARLY_AMOUNT = dollarsFromPrice(PRO_YEARLY_PRICE).toFixed(2)

export const SPEED_CLAIM = 'under 60 seconds'

/** SPEED_CLAIM with a leading capital for sentence starts. */
export const SPEED_CLAIM_SENTENCE = `${SPEED_CLAIM.charAt(0).toUpperCase()}${SPEED_CLAIM.slice(1)}`
