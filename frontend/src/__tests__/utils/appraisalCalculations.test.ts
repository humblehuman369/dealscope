/**
 * Appraisal calculation guards.
 *
 * Locks in the lot-unit safety net: a comp whose lotSize accidentally
 * arrives in square feet (e.g. 21,344) instead of acres must NOT produce
 * a multi-million-dollar lot adjustment. Without this guard, the Comp
 * Appraisal panel showed values like -$173M for a $700K Plano comp set.
 */

import { describe, it, expect } from 'vitest'
import {
  calculateAppraisalValues,
  calculateSaleAdjustments,
  calculateSimilarityScore,
  type SubjectProperty,
  type CompProperty,
} from '@/utils/appraisalCalculations'

const subject: SubjectProperty = {
  sqft: 3040,
  beds: 4,
  baths: 3.5,
  yearBuilt: 1981,
  lotSize: 0.49,
}

const compBase: CompProperty = {
  id: 'a',
  address: '1 Test Way',
  price: 625000,
  sqft: 2900,
  beds: 4,
  baths: 3.5,
  yearBuilt: 1985,
  lotSize: 0.45,
  distance: 0.5,
}

describe('calculateSaleAdjustments — lot guard', () => {
  it('produces a sane lot adjustment for plausible acreage', () => {
    const { lot, total } = calculateSaleAdjustments(subject, compBase)
    expect(Math.abs(lot)).toBeLessThan(5_000)
    expect(Math.abs(total)).toBeLessThan(50_000)
  })

  it('skips lot adjustment when comp.lotSize is implausibly large (sqft mistakenly typed as acres)', () => {
    const badComp: CompProperty = { ...compBase, lotSize: 21_344 }
    const { lot } = calculateSaleAdjustments(subject, badComp)
    expect(lot).toBe(0)
  })

  it('skips lot adjustment when subject.lotSize is implausibly large', () => {
    const badSubject: SubjectProperty = { ...subject, lotSize: 9_148 }
    const { lot } = calculateSaleAdjustments(badSubject, compBase)
    expect(lot).toBe(0)
  })

  it('skips lot adjustment when either side is non-finite', () => {
    expect(calculateSaleAdjustments(subject, { ...compBase, lotSize: Number.NaN }).lot).toBe(0)
    expect(calculateSaleAdjustments(subject, { ...compBase, lotSize: Number.POSITIVE_INFINITY }).lot).toBe(0)
  })
})

describe('calculateAppraisalValues — never produces negative market value from bad lot data', () => {
  it('keeps marketValue positive even when every comp has sqft-shaped lotSize', () => {
    const comps: CompProperty[] = [
      { ...compBase, id: '1', price: 625_000, lotSize: 9_148 },
      { ...compBase, id: '2', price: 719_000, sqft: 2750, lotSize: 9_148 },
      { ...compBase, id: '3', price: 710_000, sqft: 2943, lotSize: 22_612 },
    ]
    const result = calculateAppraisalValues(subject, comps)
    expect(result.marketValue).toBeGreaterThan(0)
    expect(result.arv).toBeGreaterThan(result.marketValue)
    expect(result.rangeLow).toBeGreaterThan(0)
    expect(result.rangeHigh).toBeGreaterThan(0)
  })
})

describe('calculateSimilarityScore — lot dimension is robust to bad units', () => {
  it('does not zero out lot similarity when comp.lotSize is implausible', () => {
    const sim = calculateSimilarityScore(subject, { ...compBase, lotSize: 21_344 })
    expect(sim.lot).toBeGreaterThanOrEqual(80)
  })

  it('produces a reasonable lot score for similar plausible lots', () => {
    const sim = calculateSimilarityScore(subject, { ...compBase, lotSize: 0.5 })
    expect(sim.lot).toBeGreaterThan(95)
  })
})
