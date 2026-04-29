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

    // Raw `pending_extras` keys merged onto the patch via Object.assign (see loadScenario.ts).
    case 'seller_carry_amount': {
      if (typeof patchValue !== 'number') return null
      return { stateField: 'sellerFinancingAmount', newValue: patchValue }
    }
    case 'seller_carry_rate': {
      if (typeof patchValue !== 'number') return null
      return { stateField: 'sellerInterestRate', newValue: patchValue }
    }
    case 'seller_carry_term_years': {
      if (typeof patchValue !== 'number') return null
      return { stateField: 'sellerTermYears', newValue: patchValue }
    }
    /** Backend decimal (e.g. 0.30); same semantic as mapped `downPayment` / worksheet percent. */
    case 'down_payment_pct_override': {
      if (typeof patchValue !== 'number') return null
      if (strategy === 'flip' || strategy === 'wholesale') return null
      return { stateField: 'downPaymentPercent', newValue: patchValue }
    }
    /** Present next to normalized `interestRate` on the patch; map for robustness. */
    case 'sub2_heuristic_rate': {
      if (typeof patchValue !== 'number') return null
      if (strategy === 'ltr' || strategy === 'str' || strategy === 'house_hack') {
        return { stateField: 'interestRate', newValue: patchValue }
      }
      return null
    }

    default:
      return null
  }
}

/**
 * Returns worksheet state-field names to accent after applying a path.
 *
 * We highlight every slider-backed field the patch touches (deduped by
 * stateField), not only fields whose numeric value differs from the prior
 * baseline. Otherwise nothing glows when the worksheet already matched the path
 * (common after Verdict → Strategy) or when rounding matches — users still need
 * to see what the path applies.
 */
export function computeHighlightedStateFields(
  patch: Record<string, unknown>,
  _baseline: AnyStrategyState | null,
  strategy: StrategyType,
): Set<string> {
  const out = new Set<string>()
  if (!patch || typeof patch !== 'object') return out

  for (const [patchKey, patchValue] of Object.entries(patch)) {
    const change = mapPatchKeyToFieldChange(patchKey, patchValue, strategy)
    if (!change) continue
    out.add(change.stateField)
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
