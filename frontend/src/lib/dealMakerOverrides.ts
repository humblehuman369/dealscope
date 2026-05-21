import type { DealMakerRecord } from '@/stores/dealMakerStore'

/** Effective market value: Appraiser override wins over locked list_price. */
export function effectiveMarketValueFromRecord(
  record: DealMakerRecord | null | undefined,
): number | null {
  if (!record) return null
  const override = record.market_value_override
  if (override != null && override > 0) return override
  if (record.list_price > 0) return record.list_price
  return null
}

/** Effective monthly rent: Appraiser override wins over worksheet monthly_rent. */
export function effectiveMonthlyRentFromRecord(
  record: DealMakerRecord | null | undefined,
): number | null {
  if (!record) return null
  const override = record.monthly_rent_override
  if (override != null && override > 0) return override
  if (record.monthly_rent > 0) return record.monthly_rent
  return null
}

export interface DealMakerAppraiserOverrides {
  marketValueOverride?: number | null
  monthlyRentOverride?: number | null
}

export function appraiserOverridesFromRecord(
  record: DealMakerRecord | null | undefined,
): DealMakerAppraiserOverrides {
  if (!record) return {}
  return {
    marketValueOverride: record.market_value_override ?? null,
    monthlyRentOverride: record.monthly_rent_override ?? null,
  }
}
