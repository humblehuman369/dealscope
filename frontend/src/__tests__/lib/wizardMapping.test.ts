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
import { headlineForPath } from '@/components/iq-verdict/make-it-work/fourWays'

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

describe('headlineForPath', () => {
  it('quotes the engine lever for the family and strips note terms', () => {
    const price = structure('price-negotiation', 'price', {
      levers: [{ label: 'Purchase price', beforeLabel: '$450,000', afterLabel: '$412,000', deltaLabel: null }],
    })
    const financing = structure('seller-second-zero-balloon', 'financing', {
      levers: [
        { label: 'Market price', beforeLabel: '$450,000', afterLabel: '$450,000', deltaLabel: null },
        { label: 'Seller 2nd', beforeLabel: '', afterLabel: '$38,000 (0%, 5yr balloon)', deltaLabel: null },
      ],
    })
    expect(headlineForPath(price)).toBe('→ $412,000')
    expect(headlineForPath(financing)).toBe('→ $38,000')
  })

  it('falls back to monthly savings and never invents a number', () => {
    expect(headlineForPath(structure('blended-plan', 'blended', { monthlySavings: 312.4 }))).toBe('Saves $312/mo')
    expect(headlineForPath(structure('blended-plan', 'blended', { monthlySavings: 0 }))).toBeNull()
  })
})
