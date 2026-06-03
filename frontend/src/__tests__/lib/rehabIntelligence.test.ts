import { describe, it, expect } from 'vitest'
import { RehabIntelligence } from '@/lib/rehabIntelligence'
import { REHAB_CATEGORIES } from '@/lib/analytics'
import { REHAB_UNIT_COSTS } from '@/lib/rehabCostBook'

/**
 * Pricing guardrails for the Quick Estimate engine.
 *
 * These lock in the calibration that fixed the "luxury trap": a normal
 * South-Florida home must NOT be auto-classified as luxury, and the regional
 * factor must not be stacked on top of a blanket asset-class multiplier.
 */
describe('RehabIntelligence pricing guardrails', () => {
  const baseProperty = {
    sq_ft: 1754,
    year_built: 2000,
    arv: 750000,
    zip_code: '33486',
    bedrooms: 2,
    bathrooms: 2,
    roof_type: 'shingle' as const,
    stories: 1,
    regional_factor: 1.26,
  }

  it('classifies a $750k / ~$430-sqft home as standard, not luxury', () => {
    const ri = new RehabIntelligence({ ...baseProperty, condition: 'fair' })
    const e = ri.calculate({ contingencyPct: 0.1 })
    expect(e.asset_class).toBe('standard')
  })

  it('uses the blended regional factor when provided', () => {
    const ri = new RehabIntelligence({ ...baseProperty, condition: 'fair' })
    expect(ri.calculate().location_factor).toBe(1.26)
  })

  it('keeps a Fair-condition aged home in a realistic heavy-rehab range (~$90-200k)', () => {
    const ri = new RehabIntelligence({ ...baseProperty, condition: 'fair' })
    const e = ri.calculate({ contingencyPct: 0.1, includeHoldingCosts: false })
    // Pre-fix this property produced ~$330k construction (the bug).
    expect(e.breakdown.construction_total).toBeGreaterThan(90000)
    expect(e.breakdown.construction_total).toBeLessThan(200000)
  })

  it('prices a default shingle roof as shingle (no asset-class tile substitution)', () => {
    const ri = new RehabIntelligence({ ...baseProperty, condition: 'fair' })
    const e = ri.calculate({ includeHoldingCosts: false })
    // shingle: 1754 * 1.2 * 1 story * $6 * 1.26 ≈ $15.9k (tile would be ~2.3x).
    expect(e.breakdown.roof).toBeGreaterThan(12000)
    expect(e.breakdown.roof).toBeLessThan(20000)
  })

  it('scales monotonically with condition (distressed > fair > good > excellent)', () => {
    const totals = (['distressed', 'fair', 'good', 'excellent'] as const).map(
      (condition) =>
        new RehabIntelligence({ ...baseProperty, condition }).calculate({
          includeHoldingCosts: false,
        }).breakdown.construction_total,
    )
    expect(totals[0]).toBeGreaterThan(totals[1])
    expect(totals[1]).toBeGreaterThan(totals[2])
    expect(totals[2]).toBeGreaterThan(totals[3])
  })

  it('excludes deselected categories from the total but keeps their per-category value', () => {
    const full = new RehabIntelligence({ ...baseProperty, condition: 'fair' }).calculate({
      contingencyPct: 0.1,
      includeHoldingCosts: false,
    })
    const exRoof = new RehabIntelligence({
      ...baseProperty,
      condition: 'fair',
      excluded_categories: ['roof'],
    }).calculate({ contingencyPct: 0.1, includeHoldingCosts: false })

    // Roof's per-category value is still reported (for display / re-enabling)...
    expect(exRoof.breakdown.roof).toBe(full.breakdown.roof)
    expect(exRoof.breakdown.roof).toBeGreaterThan(0)
    // ...but it's removed from the construction total.
    expect(exRoof.breakdown.construction_total).toBeCloseTo(
      full.breakdown.construction_total - full.breakdown.roof,
      0,
    )
    // Contingency follows the reduced total.
    expect(exRoof.breakdown.contingency).toBeLessThan(full.breakdown.contingency)
  })

  it('omits excluded categories from the saved scope (line items)', () => {
    const ri = new RehabIntelligence({
      ...baseProperty,
      condition: 'fair',
      excluded_categories: ['roof', 'kitchen'],
    })
    const items = ri.generateLineItems()
    expect(items.some((i) => i.itemId === 'roof')).toBe(false)
    expect(items.some((i) => ['cabinets', 'countertops', 'appliances'].includes(i.itemId))).toBe(
      false,
    )
  })

  it('adds the front door when roof is deselected (roof retains its display value)', () => {
    // Aged property: roof is in scope by default, so no standalone front door.
    const withRoof = new RehabIntelligence({
      ...baseProperty,
      condition: 'fair',
    }).generateLineItems()
    expect(withRoof.some((i) => i.itemId === 'roof')).toBe(true)
    expect(withRoof.some((i) => i.itemId === 'front_door')).toBe(false)

    // Deselecting roof means "no roof work" — the front door should now appear.
    const roofExcluded = new RehabIntelligence({
      ...baseProperty,
      condition: 'fair',
      excluded_categories: ['roof'],
    }).generateLineItems()
    expect(roofExcluded.some((i) => i.itemId === 'roof')).toBe(false)
    expect(roofExcluded.some((i) => i.itemId === 'front_door')).toBe(true)
  })

  it('sources Detailed builder costs from the shared cost book (single source of truth)', () => {
    const cabinets = REHAB_CATEGORIES.find((c) => c.id === 'kitchen')!.items.find(
      (i) => i.id === 'cabinets',
    )!
    expect(cabinets.lowCost).toBe(REHAB_UNIT_COSTS.cabinets.low)
    expect(cabinets.midCost).toBe(REHAB_UNIT_COSTS.cabinets.mid)
    expect(cabinets.highCost).toBe(REHAB_UNIT_COSTS.cabinets.high)
  })

  it('only applies the finish-grade premium to luxury homes, not normal ones', () => {
    const standard = new RehabIntelligence({ ...baseProperty, condition: 'fair' }).calculate({
      includeHoldingCosts: false,
    })
    const luxury = new RehabIntelligence({
      ...baseProperty,
      arv: 1_600_000,
      condition: 'fair',
    }).calculate({ includeHoldingCosts: false })
    expect(luxury.asset_class).toBe('luxury')
    // Finish items (kitchen) carry the premium; commodity roof does not.
    expect(luxury.breakdown.kitchen).toBeGreaterThan(standard.breakdown.kitchen)
    expect(luxury.breakdown.roof).toBeCloseTo(standard.breakdown.roof, 0)
  })
})
