/**
 * Canonical market / list price for a property — must match Discovery, Strategy,
 * Verdict API payload, and Deal Maker worksheet "Market Price" row.
 *
 * Off-market: IQ Value Estimate → market_price → Zestimate → RentCast AVM → tax fallback.
 * Listed: active list price when available.
 */

import { FALLBACK_PROPERTY } from '@/lib/constants/property-defaults'

export function isListedStatus(listingStatus?: string | null): boolean {
  if (!listingStatus) return false
  return !['OFF_MARKET', 'SOLD', 'FOR_RENT', 'OTHER'].includes(String(listingStatus))
}

export type PropertyMarketPriceInput = {
  listing?: { list_price?: number | null; listing_status?: string | null } | null
  valuations?: {
    value_iq_estimate?: number | null
    market_price?: number | null
    zestimate?: number | null
    current_value_avm?: number | null
    tax_assessed_value?: number | null
  } | null
}

export function resolveMarketPriceFromPropertyResponse(
  data: PropertyMarketPriceInput,
  options?: {
    fallback?: number
    conditionPremium?: number
    /** User-set market value from saved deal / Appraiser Apply to Deal */
    marketValueOverride?: number | null
  },
): number {
  const override = options?.marketValueOverride
  if (override != null && override > 0) {
    return Math.round(override + (options?.conditionPremium ?? 0))
  }

  const listed = isListedStatus(data.listing?.listing_status)
  const listPrice = data.listing?.list_price ?? null
  const iqValueEstimate = data.valuations?.value_iq_estimate ?? null
  const apiMarketPrice = data.valuations?.market_price ?? null
  const zestimate = data.valuations?.zestimate ?? null
  const currentAvm = data.valuations?.current_value_avm ?? null
  const taxAssessed = data.valuations?.tax_assessed_value ?? null

  const resolved =
    (listed && listPrice != null && listPrice > 0 ? listPrice : null) ??
    (iqValueEstimate != null && iqValueEstimate > 0 ? iqValueEstimate : null) ??
    (apiMarketPrice != null && apiMarketPrice > 0 ? apiMarketPrice : null) ??
    (zestimate != null && zestimate > 0 ? zestimate : null) ??
    (currentAvm != null && currentAvm > 0 ? currentAvm : null) ??
    (taxAssessed != null && taxAssessed > 0 ? Math.round(taxAssessed / 0.75) : null) ??
    (options?.fallback ?? FALLBACK_PROPERTY.price)

  const withCondition = resolved + (options?.conditionPremium ?? 0)
  return Math.round(withCondition)
}
