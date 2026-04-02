'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { api } from '@/lib/api-client'
import { canonicalizeAddressForIdentity } from '@/utils/addressIdentity'
import type { PropertyResponse } from '@dealscope/shared'

/**
 * Extended PropertyResponse that allows dynamic field access for backward
 * compatibility. Existing code accesses fields beyond the typed interface;
 * this prevents compile errors while we migrate to strict types.
 */
type PropertyResponseCompat = PropertyResponse & Record<string, any>

const PROPERTY_STALE_TIME = 5 * 60 * 1000 // 5 min

/** Return the value as a finite number, or null if it's missing/invalid. */
function finiteOrNull(v: unknown): number | null {
  if (v == null) return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

/**
 * Sanitize critical numeric fields in the API response to prevent NaN /
 * Infinity from propagating into financial calculations.
 */
function validatePropertyResponse(data: PropertyResponseCompat): PropertyResponseCompat {
  const v = data.valuations as Record<string, any> | undefined
  if (v) {
    for (const k of ['zestimate', 'current_value_avm', 'market_price', 'tax_assessed_value', 'value_iq_estimate', 'rentcast_avm', 'redfin_estimate', 'realtor_estimate']) {
      if (v[k] != null) v[k] = finiteOrNull(v[k])
    }
  }

  const mkt = data.market as Record<string, any> | undefined
  if (mkt) {
    for (const k of ['property_taxes_annual', 'insurance_annual', 'hoa_fees_monthly']) {
      if (mkt[k] != null) mkt[k] = finiteOrNull(mkt[k])
    }
  }

  const r = data.rentals as Record<string, any> | undefined
  if (r) {
    if (r.monthly_rent_ltr != null) r.monthly_rent_ltr = finiteOrNull(r.monthly_rent_ltr)
    const rs = r.rental_stats as Record<string, any> | undefined
    if (rs) {
      for (const k of ['iq_estimate', 'zillow_estimate', 'rentcast_estimate', 'redfin_estimate', 'realtor_estimate']) {
        if (rs[k] != null) rs[k] = finiteOrNull(rs[k])
      }
    }
  }

  return data
}

/**
 * Shared property data hook backed by React Query's client-side cache.
 *
 * Both Verdict and Strategy pages call `fetchProperty(address)` inside their
 * existing imperative useEffect.  The first call hits the network; subsequent
 * calls for the same address return cached data instantly (within staleTime).
 *
 * This eliminates redundant /api/v1/properties/search round-trips when
 * navigating between pages for the same property.
 */
export interface FetchPropertyOptions {
  city?: string
  state?: string
  zip_code?: string
}

export function usePropertyData() {
  const queryClient = useQueryClient()

  const fetchProperty = useCallback(
    async (address: string, opts?: FetchPropertyOptions): Promise<PropertyResponseCompat> => {
      const canonicalAddress = canonicalizeAddressForIdentity(address)
      const keyParts = [canonicalAddress, opts?.city, opts?.state, opts?.zip_code].filter(Boolean)
      return queryClient.ensureQueryData({
        queryKey: ['property-search', ...keyParts],
        queryFn: async () => {
          const body: Record<string, string> = { address: canonicalAddress }
          if (opts?.city) body.city = opts.city
          if (opts?.state) body.state = opts.state
          if (opts?.zip_code) body.zip_code = opts.zip_code
          const raw = await api.post<PropertyResponseCompat>(
            '/api/v1/properties/search',
            body,
          )
          return validatePropertyResponse(raw)
        },
        staleTime: PROPERTY_STALE_TIME,
      })
    },
    [queryClient],
  )

  const invalidateProperty = useCallback(
    (address: string, opts?: FetchPropertyOptions) => {
      const canonicalAddress = canonicalizeAddressForIdentity(address)
      const keyParts = [canonicalAddress, opts?.city, opts?.state, opts?.zip_code].filter(Boolean)
      queryClient.invalidateQueries({ queryKey: ['property-search', ...keyParts] })
    },
    [queryClient],
  )

  return { fetchProperty, invalidateProperty }
}
