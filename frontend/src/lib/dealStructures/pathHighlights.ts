/**
 * Path application -> worksheet field highlight helpers.
 *
 * `preLoadedRecordToDealMakerPatch()` returns a canonical `inlineOverrides` patch.
 * The Strategy worksheet then derives concrete state-field values per strategy
 * (e.g. patch.downPayment is integer percent; state.downPaymentPercent is decimal).
 *
 * `computeHighlightedStateFields()` returns the set of worksheet state-field
 * names whose value the patch will *actually change* vs the current baseline,
 * so the UI can render a soft accent glow on only those rows.
 */

import type { AnyStrategyState, StrategyType } from '@/components/deal-maker/types'

const FLOAT_EPSILON = 0.005

interface FieldChange {
  stateField: string
  newValue: number | boolean | string
}

/**
 * Translate one patch key + value into the (stateField, newValue) pair for the
 * given strategy, or `null` if the patch key has no slider in this strategy.
 */
function mapPatchKeyToFieldChange(
  patchKey: string,
  patchValue: unknown,
  strategy: StrategyType,
): FieldChange | null {
  switch (patchKey) {
    case 'purchasePrice':
    case 'buyPrice':
    case 'listPrice': {
      if (typeof patchValue !== 'number') return null
      // Per-strategy state field naming (matches strategy/page.tsx worksheetState):
      //   ltr / str       -> buyPrice
      //   wholesale       -> contractPrice
      //   brrrr / flip / house_hack -> purchasePrice
      const stateField =
        strategy === 'ltr' || strategy === 'str'
          ? 'buyPrice'
          : strategy === 'wholesale'
            ? 'contractPrice'
            : 'purchasePrice'
      return { stateField, newValue: patchValue }
    }

    case 'monthlyRent': {
      if (typeof patchValue !== 'number') return null
      // LTR uses state.monthlyRent; BRRRR uses postRehabMonthlyRent.
      // HouseHack reads avgRentPerUnit (not io.monthlyRent), so a
      // generic monthlyRent patch does NOT flow into the HouseHack slider.
      if (strategy === 'ltr') return { stateField: 'monthlyRent', newValue: patchValue }
      if (strategy === 'brrrr') return { stateField: 'postRehabMonthlyRent', newValue: patchValue }
      return null
    }

    case 'downPayment': {
      if (typeof patchValue !== 'number') return null
      // Flip and Wholesale don't model down-payment in DealMaker.
      if (strategy === 'flip' || strategy === 'wholesale') return null
      return { stateField: 'downPaymentPercent', newValue: patchValue / 100 }
    }

    case 'interestRate': {
      if (typeof patchValue !== 'number') return null
      // BRRRR has hardMoneyRate (acquisition) + refinanceInterestRate (exit);
      // a generic interestRate patch doesn't auto-route. Wholesale/Flip have no rate slider.
      if (strategy === 'ltr' || strategy === 'str' || strategy === 'house_hack') {
        return { stateField: 'interestRate', newValue: patchValue }
      }
      return null
    }

    case 'loanTerm': {
      if (typeof patchValue !== 'number') return null
      if (strategy === 'ltr' || strategy === 'str' || strategy === 'house_hack') {
        return { stateField: 'loanTermYears', newValue: patchValue }
      }
      return null
    }

    case 'sellerFinancingAmount':
    case 'sellerInterestRate':
    case 'sellerTermYears': {
      if (typeof patchValue !== 'number') return null
      return { stateField: patchKey, newValue: patchValue }
    }

    default:
      return null
  }
}

/**
 * Compare two values with a tolerance suitable for slider-derived floats.
 * Booleans/strings use strict equality.
 */
function valuesDiffer(a: unknown, b: unknown): boolean {
  if (typeof a === 'number' && typeof b === 'number') {
    if (!Number.isFinite(a) || !Number.isFinite(b)) return a !== b
    return Math.abs(a - b) > FLOAT_EPSILON
  }
  return a !== b
}

/**
 * Returns the set of worksheet state-field names whose value the patch will
 * change vs `baseline`. When `baseline` is null (first render before
 * worksheetState is captured), every patch key that maps to a slider is
 * treated as "changed".
 */
export function computeHighlightedStateFields(
  patch: Record<string, unknown>,
  baseline: AnyStrategyState | null,
  strategy: StrategyType,
): Set<string> {
  const out = new Set<string>()
  if (!patch || typeof patch !== 'object') return out

  for (const [patchKey, patchValue] of Object.entries(patch)) {
    const change = mapPatchKeyToFieldChange(patchKey, patchValue, strategy)
    if (!change) continue

    if (!baseline) {
      out.add(change.stateField)
      continue
    }

    const baselineValue = (baseline as unknown as Record<string, unknown>)[change.stateField]
    if (valuesDiffer(change.newValue, baselineValue)) {
      out.add(change.stateField)
    }
  }

  return out
}

/**
 * Map an `inlineOverrides` key (used by handleInlineSliderChange) to the
 * worksheet state-field name a path-highlight glow would be tracked under.
 * Used to drop a single glow when the user manually edits that slider.
 */
export function inlineOverrideKeyToStateField(
  key: string,
  strategy: StrategyType,
): string | null {
  switch (key) {
    case 'purchasePrice':
      return strategy === 'ltr' || strategy === 'str'
        ? 'buyPrice'
        : strategy === 'wholesale'
          ? 'contractPrice'
          : 'purchasePrice'
    case 'monthlyRent':
      if (strategy === 'ltr') return 'monthlyRent'
      if (strategy === 'brrrr') return 'postRehabMonthlyRent'
      return null
    case 'downPayment':
      if (strategy === 'flip' || strategy === 'wholesale') return null
      return 'downPaymentPercent'
    case 'interestRate':
      if (strategy === 'ltr' || strategy === 'str' || strategy === 'house_hack') return 'interestRate'
      return null
    case 'loanTerm':
      if (strategy === 'ltr' || strategy === 'str' || strategy === 'house_hack') return 'loanTermYears'
      return null
    case 'sellerFinancingAmount':
    case 'sellerInterestRate':
    case 'sellerTermYears':
      return key
    default:
      return null
  }
}
