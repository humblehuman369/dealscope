/**
 * Shared validation utilities for property data.
 *
 * Extracted from hooks/usePropertyData.ts to break the circular dependency
 * between hooks/usePropertyData.ts ↔ services/analytics.ts.
 */

import type { PropertyResponse } from '@dealscope/shared';

/**
 * Extended PropertyResponse that allows dynamic field access for backward
 * compatibility. Matches frontend's PropertyResponseCompat approach.
 */
export type PropertyResponseCompat = PropertyResponse & Record<string, any>;

/** Return the value as a finite number, or null if it's missing/invalid. */
export function finiteOrNull(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Sanitize critical numeric fields in the API response to prevent NaN /
 * Infinity from propagating into financial calculations.
 * Field list matches frontend validatePropertyResponse exactly.
 */
export function validatePropertyResponse(
  data: PropertyResponseCompat,
): PropertyResponseCompat {
  const v = data.valuations as Record<string, any> | undefined;
  if (v) {
    for (const k of [
      'zestimate',
      'current_value_avm',
      'market_price',
      'tax_assessed_value',
      'value_iq_estimate',
      'rentcast_avm',
      'redfin_estimate',
    ]) {
      if (v[k] != null) v[k] = finiteOrNull(v[k]);
    }
  }

  const r = data.rentals as Record<string, any> | undefined;
  if (r) {
    if (r.monthly_rent_ltr != null)
      r.monthly_rent_ltr = finiteOrNull(r.monthly_rent_ltr);
    const rs = r.rental_stats as Record<string, any> | undefined;
    if (rs) {
      for (const k of [
        'iq_estimate',
        'zillow_estimate',
        'rentcast_estimate',
        'redfin_estimate',
      ]) {
        if (rs[k] != null) rs[k] = finiteOrNull(rs[k]);
      }
    }
  }

  return data;
}
