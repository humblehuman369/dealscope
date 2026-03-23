import type { PropertyResponse } from '@dealscope/shared'
import type { IQEstimateSources, DataSourceId } from '@/components/iq-verdict/IQEstimateSelector'

export const SOURCE_META: Record<DataSourceId, { label: string; color: string }> = {
  iq: { label: 'IQ Estimate', color: 'var(--accent-sky)' },
  zillow: { label: 'Zillow', color: '#4A90D9' },
  rentcast: { label: 'RentCast', color: '#F59E0B' },
  redfin: { label: 'Redfin', color: '#A02B2D' },
  realtor: { label: 'Realtor.com', color: '#D92228' },
}

export const ALL_SOURCE_IDS: DataSourceId[] = ['iq', 'zillow', 'rentcast', 'redfin', 'realtor']

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
      realtor: rentalStats?.realtor_estimate ?? null,
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
 */
export function toSourceEstimates(
  group: IQEstimateSources['value'] | IQEstimateSources['rent'],
  onlyAvailable = false,
): SourceEstimate[] {
  const results: SourceEstimate[] = ALL_SOURCE_IDS.map((id) => ({
    id,
    label: SOURCE_META[id].label,
    color: SOURCE_META[id].color,
    value: group[id],
  }))
  return onlyAvailable ? results.filter((s) => s.value != null) : results
}
