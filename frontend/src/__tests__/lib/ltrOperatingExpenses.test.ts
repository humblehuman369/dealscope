import { describe, expect, it } from 'vitest'
import { computeLtrOperatingExpenseBreakdown } from '@/lib/ltrOperatingExpenses'

describe('computeLtrOperatingExpenseBreakdown', () => {
  it('sums all operating lines (excludes vacancy)', () => {
    const annualGrossRent = 5_304 * 12 // ~$63,648/yr
    const breakdown = computeLtrOperatingExpenseBreakdown({
      annualPropertyTax: 6_670,
      annualInsurance: 8_132,
      monthlyHoa: 139,
      managementRate: 0,
      maintenanceRate: 0.01,
      annualGrossRent,
    })

    expect(breakdown.hoa).toBe(139 * 12)
    expect(breakdown.maintenance).toBeCloseTo(annualGrossRent * 0.01, 0)
    expect(breakdown.reserves).toBeCloseTo(annualGrossRent * 0.05, 0)
    expect(breakdown.utilities).toBe(1_200)
    expect(breakdown.otherAnnual).toBe(200)
    expect(breakdown.total).toBe(
      breakdown.propertyTax +
        breakdown.insurance +
        breakdown.hoa +
        breakdown.management +
        breakdown.maintenance +
        breakdown.reserves +
        breakdown.utilities +
        breakdown.otherAnnual,
    )
  })
})
