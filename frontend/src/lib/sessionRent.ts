/**
 * One monthly rent per property per session.
 *
 * Saved `monthly_rent` on a Deal Maker record is a frozen snapshot. It must
 * not win over the live selected source. Only an explicit user override does.
 */

export function resolveSessionMonthlyRent(input: {
  savedOverride?: number | null
  selectedLiveSource?: number | null
}): number | null {
  const override = input.savedOverride
  if (typeof override === 'number' && Number.isFinite(override) && override > 0) {
    return override
  }
  const live = input.selectedLiveSource
  if (typeof live === 'number' && Number.isFinite(live) && live > 0) {
    return live
  }
  return null
}

/** Path-applied Target Rent must not become the solve-time context rent. */
export function stripMonthlyRentFromOverrides(
  overrides: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!overrides) return null
  const { monthlyRent: _ignored, ...rest } = overrides
  return rest
}
