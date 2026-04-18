import type { PropertyResponse } from '@dealscope/shared'
import type { IQEstimateSources, DataSourceId } from '@/components/iq-verdict/IQEstimateSelector'

export const SOURCE_META: Record<DataSourceId, { label: string; color: string }> = {
  iq: { label: 'IQ Estimate', color: 'var(--accent-sky)' },
  zillow: { label: 'Zillow', color: '#4A90D9' },
  rentcast: { label: 'RentCast', color: '#F59E0B' },
  redfin: { label: 'Redfin', color: '#EF5350' },
  realtor: { label: 'Realtor', color: '#D92228' },
  mashvisor: { label: 'Mashvisor', color: '#06B6D4' },
}

// Per-column source lists. Realtor.com is value-only (no rent API); Mashvisor
// is rent-only (sourced from /rental-rates traditional, bedroom-matched).
export const VALUE_SOURCE_IDS: DataSourceId[] = ['iq', 'zillow', 'rentcast', 'redfin', 'realtor']
export const RENT_SOURCE_IDS: DataSourceId[] = ['iq', 'zillow', 'rentcast', 'redfin', 'mashvisor']
// Kept for back-compat with consumers that don't care which column. Prefer
// the column-specific lists above when iterating for value or rent UIs.
export const ALL_SOURCE_IDS: DataSourceId[] = ['iq', 'zillow', 'rentcast', 'redfin', 'realtor', 'mashvisor']

/**
 * Maps a PropertyResponse from the shared React Query cache into the
 * IQEstimateSources shape used by IQEstimateSelector and consensus utils.
 *
 * This is the single canonical mapping — Verdict, Strategy, and Comps
 * should all use this instead of inline mapping.
 */
export function mapPropertyToIQSources(data: PropertyResponse): IQEstimateSources {
  const rentalStats = data.rentals?.rental_stats
  return {
    value: {
      iq: data.valuations?.value_iq_estimate ?? null,
      zillow: data.valuations?.zestimate ?? null,
      rentcast: data.valuations?.rentcast_avm ?? null,
      redfin: data.valuations?.redfin_estimate ?? null,
      realtor: data.valuations?.realtor_estimate ?? null,
    },
    rent: {
      iq: rentalStats?.iq_estimate ?? data.rentals?.monthly_rent_ltr ?? null,
      zillow: rentalStats?.zillow_estimate ?? null,
      rentcast: rentalStats?.rentcast_estimate ?? null,
      redfin: rentalStats?.redfin_estimate ?? null,
      mashvisor: rentalStats?.mashvisor_estimate ?? null,
    },
  }
}

export interface SourceEstimate {
  id: DataSourceId
  label: string
  color: string
  value: number | null
}

/**
 * Flattens a single dimension (value or rent) of IQEstimateSources into an
 * ordered array of SourceEstimates, filtering out null values when requested.
 *
 * Iterates only over the IDs valid for the given column when `column` is
 * specified — so callers don't need to know that Mashvisor only lives on rent
 * and Realtor.com only on value.
 */
export function toSourceEstimates(
  group: IQEstimateSources['value'] | IQEstimateSources['rent'],
  onlyAvailable = false,
  column?: 'value' | 'rent',
): SourceEstimate[] {
  const ids = column === 'value'
    ? VALUE_SOURCE_IDS
    : column === 'rent'
      ? RENT_SOURCE_IDS
      : ALL_SOURCE_IDS
  const results: SourceEstimate[] = ids.map((id) => ({
    id,
    label: SOURCE_META[id].label,
    color: SOURCE_META[id].color,
    value: group[id] ?? null,
  }))
  return onlyAvailable ? results.filter((s) => s.value != null) : results
}
