/**
 * Property Condition & Location Premium adjustment utilities.
 *
 * Slider values (0-100) are bucketed into three tiers that mirror the
 * labels shown in the IQ Gateway:
 *
 *   Condition:  Distressed / Average / Turnkey
 *   Location:   Poor / Standard / Premium
 *
 * These functions translate a raw slider value into concrete financial
 * adjustments that can be applied client-side before calling the
 * verdict API or computing local pro-forma numbers.
 */

// ── Condition ────────────────────────────────────────────────────────

export interface ConditionAdjustment {
  /** Additional rehab dollars required (positive = cost) */
  rehabCost: number;
  /** Price premium for turnkey properties (positive = higher value) */
  pricePremium: number;
  /** Human-readable label */
  label: string;
}

export function getConditionAdjustment(condition: number): ConditionAdjustment {
  if (condition < 33) {
    return { rehabCost: 85_000, pricePremium: 0, label: 'Needs Rehab (-$85k)' };
  }
  if (condition < 66) {
    return { rehabCost: 0, pricePremium: 0, label: 'Average Condition' };
  }
  return { rehabCost: 0, pricePremium: 40_000, label: 'Turnkey (+$40k)' };
}

// ── Location Premium ─────────────────────────────────────────────────

export interface LocationAdjustment {
  /** Multiplier applied to monthly rent (e.g. 1.05 = +5%) */
  rentMultiplier: number;
  /** Human-readable label */
  label: string;
}

export function getLocationAdjustment(location: number): LocationAdjustment {
  if (location < 33) {
    return { rentMultiplier: 0.97, label: 'Below Average (-3%)' };
  }
  if (location < 66) {
    return { rentMultiplier: 1.0, label: 'Standard Market' };
  }
  return { rentMultiplier: 1.05, label: 'High Demand (+5%)' };
}
