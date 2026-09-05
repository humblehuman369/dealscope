import { describe, expect, it } from 'vitest'

import type { DealStructure } from '@/components/iq-verdict/PathOptionCard'
import {
  EMPTY_ANSWERS,
  LOW_MONEY_DOWN_PCT,
  MAX_DOWN_PAYMENT_PCT,
  MIN_DOWN_PAYMENT_PCT,
  answersToVerdictOverrides,
  deriveDownPaymentPct,
  describeCashChoice,
  pickRecommended,
  preferredFamilyOrder,
  shouldAskOccupancy,
  stepSequence,
  type WizardAnswers,
} from '@/components/iq-verdict/make-it-work/wizardMapping'
import {
  FOUR_WAYS,
  WIZARD_FAMILIES,
  describeBreakevenResult,
  describeCashToClose,
  describeChangeDetail,
  describePlay,
  isBreakevenFamily,
} from '@/components/iq-verdict/make-it-work/fourWays'

function structure(id: string, family: DealStructure['family'], extra: Partial<DealStructure> = {}): DealStructure {
  return {
    id,
    family,
    familyLabel: family,
    realismLabel: 'Common',
    headline: id,
    bullets: [],
    summary: '',
    levers: [],
    monthlySavings: 100,
    cashRequired: 50_000,
    rankingScore: 50,
    pitchScript: null,
    caveat: null,
    selectionReason: null,
    preLoadedRecord: null,
    ...extra,
  }
}

const FOUR = [
  structure('rent-verification', 'income'),
  structure('price-negotiation', 'price'),
  structure('seller-second-zero-balloon', 'financing'),
  structure('larger-down', 'capital_stack'),
  structure('blended-plan', 'blended'),
]

describe('deriveDownPaymentPct', () => {
  it('converts a cash bucket midpoint to a down-payment fraction net of closing costs', () => {
    // $50K midpoint on a $400K price: 12.5% − 3% closing = 9.5%
    expect(deriveDownPaymentPct('25_75k', 400_000)).toBeCloseTo(0.095, 3)
  })

  it('clamps to the 3.5%–35% band', () => {
    expect(deriveDownPaymentPct('under_25k', 2_000_000)).toBe(MIN_DOWN_PAYMENT_PCT)
    expect(deriveDownPaymentPct('150k_plus', 200_000)).toBe(MAX_DOWN_PAYMENT_PCT)
  })

  it('uses the low-money-down floor regardless of price', () => {
    expect(deriveDownPaymentPct('low_money_down', 400_000)).toBe(LOW_MONEY_DOWN_PCT)
  })

  it('returns null without an answer or a usable price', () => {
    expect(deriveDownPaymentPct(null, 400_000)).toBeNull()
    expect(deriveDownPaymentPct('25_75k', 0)).toBeNull()
    expect(deriveDownPaymentPct('25_75k', Number.NaN)).toBeNull()
  })
})

describe('answersToVerdictOverrides', () => {
  it('emits snake_case engine knobs only for answered questions', () => {
    expect(answersToVerdictOverrides(EMPTY_ANSWERS, 400_000)).toEqual({})
  })

  it('"keep it simple" dismisses the creative families so the engine re-ranks around price/income', () => {
    const answers: WizardAnswers = { cash: '75_150k', priority: 'lowest_price', terms: 'simple', ownerOccupy: null }
    const overrides = answersToVerdictOverrides(answers, 500_000)
    expect(overrides.dismissed_families).toEqual(['financing', 'blended'])
    expect(overrides.down_payment_pct).toBeCloseTo(0.195, 3)
    expect(overrides).not.toHaveProperty('is_owner_occupied')
  })

  it('passes owner-occupancy through when asked', () => {
    const answers: WizardAnswers = { cash: 'low_money_down', priority: 'cash_flow', terms: 'anything', ownerOccupy: true }
    expect(answersToVerdictOverrides(answers, 300_000)).toEqual({
      down_payment_pct: LOW_MONEY_DOWN_PCT,
      is_owner_occupied: true,
    })
  })
})

describe('preferredFamilyOrder / pickRecommended', () => {
  it('leads with the family that matches the priority', () => {
    expect(preferredFamilyOrder({ ...EMPTY_ANSWERS, priority: 'lowest_price' })[0]).toBe('price')
    expect(preferredFamilyOrder({ ...EMPTY_ANSWERS, priority: 'least_cash' })[0]).toBe('financing')
    expect(preferredFamilyOrder({ ...EMPTY_ANSWERS, priority: 'cash_flow' })[0]).toBe('blended')
  })

  it('low-money-down puts financing first unless the user asked for simple terms', () => {
    expect(preferredFamilyOrder({ ...EMPTY_ANSWERS, cash: 'low_money_down', priority: 'lowest_price' })[0]).toBe(
      'financing',
    )
    expect(
      preferredFamilyOrder({ ...EMPTY_ANSWERS, cash: 'low_money_down', priority: 'lowest_price', terms: 'simple' }),
    ).toEqual(['price', 'income'])
  })

  it('never recommends more equity to someone with little cash, but leads with it for a fast close when they have it', () => {
    const lowCash: WizardAnswers = { cash: 'under_25k', priority: 'fastest_close', terms: 'anything', ownerOccupy: null }
    expect(preferredFamilyOrder(lowCash)).not.toContain('capital_stack')
    expect(pickRecommended([structure('larger-down', 'capital_stack')], lowCash)).toBeNull()

    const flush: WizardAnswers = { cash: '150k_plus', priority: 'fastest_close', terms: 'anything', ownerOccupy: null }
    expect(preferredFamilyOrder(flush).slice(0, 2)).toEqual(['price', 'capital_stack'])
    expect(pickRecommended(FOUR.filter((p) => p.family !== 'price'), flush)?.id).toBe('larger-down')
    // The cash exclusion is a client-side pick rule; the engine request is unchanged by it.
    expect(answersToVerdictOverrides(lowCash, 400_000)).not.toHaveProperty('dismissed_families')
  })

  it('never recommends a family the user excluded, even if it is the only one that fits the priority', () => {
    const answers: WizardAnswers = { cash: '25_75k', priority: 'least_cash', terms: 'simple', ownerOccupy: null }
    const pick = pickRecommended(FOUR, answers)
    expect(pick?.family).toBe('price')
  })

  it('honours the tapped tile when that path exists', () => {
    const answers: WizardAnswers = { cash: '25_75k', priority: 'lowest_price', terms: 'anything', ownerOccupy: null }
    expect(pickRecommended(FOUR, answers, 'income')?.id).toBe('rent-verification')
  })

  it('falls back to priority order when the tapped tile has no engine result', () => {
    const answers: WizardAnswers = { cash: '25_75k', priority: 'lowest_price', terms: 'anything', ownerOccupy: null }
    const withoutIncome = FOUR.filter((p) => p.family !== 'income')
    expect(pickRecommended(withoutIncome, answers, 'income')?.family).toBe('price')
  })

  it('returns null when nothing eligible remains', () => {
    const answers: WizardAnswers = { cash: '25_75k', priority: 'least_cash', terms: 'simple', ownerOccupy: null }
    expect(pickRecommended([structure('seller-second-zero-balloon', 'financing')], answers)).toBeNull()
    expect(pickRecommended([], answers)).toBeNull()
  })
})

describe('step sequence', () => {
  it('asks the occupancy question only for small multis or low-money-down', () => {
    expect(stepSequence(EMPTY_ANSWERS, 1)).toEqual(['cash', 'priority', 'terms'])
    expect(stepSequence(EMPTY_ANSWERS, 3)).toEqual(['cash', 'priority', 'terms', 'occupancy'])
    expect(stepSequence({ ...EMPTY_ANSWERS, cash: 'low_money_down' }, null)).toContain('occupancy')
    expect(shouldAskOccupancy(EMPTY_ANSWERS, 5)).toBe(false)
  })
})

describe('describeCashChoice', () => {
  it('teaches the down payment and cash to close inline', () => {
    expect(describeCashChoice('25_75k', 400_000)).toBe('≈ 10% down · ~$50,000 to close at asking')
  })
})

describe('fourWays vocabulary', () => {
  it('shows Price, Income, Terms, Equity as rows and keeps the blend for the wizard only', () => {
    expect(FOUR_WAYS.map((w) => w.name)).toEqual(['Price', 'Income', 'Terms', 'Equity'])
    expect(FOUR_WAYS.map((w) => w.family)).toEqual(['price', 'income', 'financing', 'capital_stack'])
    expect(isBreakevenFamily('blended')).toBe(false)
    expect(WIZARD_FAMILIES).toContain('blended')
  })

  it('states each way as the thing you do, not as a measurement', () => {
    expect(
      describePlay('price', {
        changePct: 33.0, changeAmount: 152_000, resultAmount: 307_000, resultLabel: 'Target Buy', closesGapAlone: true, termsNote: null,
      }),
    ).toBe('Get the seller to $307,000')
    expect(
      describePlay('income', {
        changePct: 4.2, changeAmount: 120, resultAmount: 2_970, resultLabel: 'Target rent', closesGapAlone: true, termsNote: null,
      }),
    ).toBe('Prove the rent is $2,970/mo')
    expect(
      describePlay('financing', {
        changePct: 20, changeAmount: 91_800, resultAmount: 91_800, resultLabel: 'Seller financing', closesGapAlone: false, termsNote: '0% interest, 5-yr balloon',
      }),
    ).toBe('Full price — seller carries $91,800 at 0%')
    expect(
      describePlay('capital_stack', {
        changePct: 15, changeAmount: 68_850, resultAmount: 160_650, resultLabel: 'Down payment', closesGapAlone: true, termsNote: '35% down',
      }),
    ).toBe('Put $160,650 down (35% down)')
    expect(
      describeBreakevenResult({
        changePct: 33.0, changeAmount: 152_000, resultAmount: 307_000, resultLabel: 'Target Buy', closesGapAlone: true, termsNote: null,
      }),
    ).toEqual({ amount: '$307,000', label: 'Target Buy' })
  })

  it('moves the percentage arithmetic into the expanded detail line', () => {
    expect(
      describeChangeDetail('price', {
        changePct: 33.0, changeAmount: 152_000, resultAmount: 307_000, resultLabel: 'Target Buy', closesGapAlone: true, termsNote: null,
      }),
    ).toBe('33.0% off asking · $152,000')
    expect(
      describeChangeDetail('income', {
        changePct: 4.2, changeAmount: 120, resultAmount: 2_970, resultLabel: 'Target rent', closesGapAlone: true, termsNote: null,
      }),
    ).toBe("4.2% above today's estimate · $120/mo more")
    expect(
      describeChangeDetail('price', {
        changePct: null, changeAmount: null, resultAmount: 307_000, resultLabel: 'Target Buy', closesGapAlone: true, termsNote: null,
      }),
    ).toBeNull()
  })

  it('degrades to an instruction without a figure when the engine sent no result', () => {
    expect(
      describePlay('price', {
        changePct: null, changeAmount: null, resultAmount: Number.NaN, resultLabel: 'Target Buy', closesGapAlone: true, termsNote: null,
      }),
    ).toBe('Get the seller down to Target Buy')
  })

  it('compares cash to close against buying at asking, and ignores rounding noise', () => {
    // A price cut shrinks both the down payment and the closing costs.
    expect(describeCashToClose(67_000, 85_000)).toEqual({ amount: '$67K', delta: '$18K less than asking' })
    // Extra equity is the one lever that costs the buyer more at the table.
    expect(describeCashToClose(160_650, 85_000)).toEqual({ amount: '$161K', delta: '$76K more than asking' })
    // Sub-$500 movement is input rounding, not a trade-off worth claiming.
    expect(describeCashToClose(85_200, 85_000)).toEqual({ amount: '$85K', delta: 'same as asking' })
    // No anchor in older payloads → the amount stands alone rather than lying.
    expect(describeCashToClose(67_000, 0)).toEqual({ amount: '$67K', delta: null })
    expect(describeCashToClose(0, 85_000)).toBeNull()
  })
})
