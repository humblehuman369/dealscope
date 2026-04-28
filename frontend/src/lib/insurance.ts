import type { PropertyResponse } from '@dealscope/shared'

/** Mirrors backend ``OPERATING.insurance_pct`` — used only when API + snapshot omit insurance (numeric APIs). */
export const OPERATING_INSURANCE_PCT = 0.01

/**
 * Canonical annual property insurance from the property search API
 * (`market.insurance_annual`), optionally replaced by a user override.
 * No client-side estimation — return `null` when unknown (show "Unavailable" in UI).
 */
export function getAnnualInsurance(
  property: PropertyResponse | null | undefined,
  override?: number | null
): number | null {
  if (override != null) return override
  return property?.market?.insurance_annual ?? null
}

export function getMonthlyInsurance(
  property: PropertyResponse | null | undefined,
  override?: number | null
): number | null {
  const annual = getAnnualInsurance(property, override)
  return annual == null ? null : annual / 12
}
