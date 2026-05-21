import { describe, it, expect } from 'vitest'
import {
  effectiveMarketValueFromRecord,
  effectiveMonthlyRentFromRecord,
} from '@/lib/dealMakerOverrides'
import type { DealMakerRecord } from '@/stores/dealMakerStore'

const baseRecord = {
  list_price: 400_000,
  rent_estimate: 2_500,
  property_taxes: 0,
  insurance: 0,
  initial_assumptions: {} as DealMakerRecord['initial_assumptions'],
  buy_price: 350_000,
  down_payment_pct: 0.2,
  closing_costs_pct: 0.03,
  interest_rate: 0.06,
  loan_term_years: 30,
  rehab_budget: 0,
  arv: 450_000,
  monthly_rent: 2_500,
  other_income: 0,
  vacancy_rate: 0.05,
  maintenance_pct: 0.05,
  management_pct: 0,
  capex_pct: 0.05,
  annual_property_tax: 0,
  annual_insurance: 0,
  monthly_hoa: 0,
  monthly_utilities: 0,
  cached_metrics: null,
  version: 4,
} as DealMakerRecord

describe('dealMakerOverrides helpers', () => {
  it('prefers market_value_override over list_price', () => {
    expect(
      effectiveMarketValueFromRecord({
        ...baseRecord,
        market_value_override: 425_000,
      }),
    ).toBe(425_000)
  })

  it('prefers monthly_rent_override over monthly_rent', () => {
    expect(
      effectiveMonthlyRentFromRecord({
        ...baseRecord,
        monthly_rent_override: 2_800,
      }),
    ).toBe(2_800)
  })
})
