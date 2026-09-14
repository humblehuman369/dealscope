import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import {
  placeGapMarkers,
  stackGapLabelsByPixels,
  VerdictGapSlider,
} from '@/components/discovery/VerdictGapSlider'

const CROSSWINDS = {
  listPrice: 399_900,
  incomeValue: 326_723,
  targetBuy: 310_387,
}

describe('placeGapMarkers', () => {
  it('positions Willow markers by value', () => {
    const placed = placeGapMarkers({
      listPrice: 625_999,
      incomeValue: 477_699,
      targetBuy: 453_814,
    })
    const byId = Object.fromEntries(placed.map((marker) => [marker.id, marker]))
    expect(byId.target.pct).toBe(0)
    expect(byId.market.pct).toBe(100)
    expect(byId.income.pct).toBeCloseTo(13.87, 1)
    expect(placed.every((marker) => marker.stack === 'below')).toBe(true)
  })

  it('keeps three Crosswinds names even when Target and Income sit close', () => {
    const placed = placeGapMarkers(CROSSWINDS)
    expect(new Set(placed.map((marker) => marker.name)).size).toBe(3)
    const byId = Object.fromEntries(placed.map((marker) => [marker.id, marker]))
    expect(byId.target.pct).toBe(0)
    expect(byId.market.pct).toBe(100)
    expect(byId.income.pct).toBeCloseTo(((326_723 - 310_387) / (399_900 - 310_387)) * 100, 1)
  })
})

describe('stackGapLabelsByPixels', () => {
  it('lifts the middle Crosswinds label when rendered widths would collide', () => {
    const placed = placeGapMarkers(CROSSWINDS)
    const stacked = stackGapLabelsByPixels(
      placed,
      { target: 118, income: 122, market: 118 },
      720,
    )
    const byId = Object.fromEntries(stacked.map((marker) => [marker.id, marker]))
    expect(byId.target.stack).toBe('below')
    expect(byId.income.stack).toBe('above')
    expect(byId.market.stack).toBe('below')
  })

  it('leaves labels below when pixel gap is at least 16', () => {
    const placed = placeGapMarkers({
      listPrice: 625_999,
      incomeValue: 477_699,
      targetBuy: 453_814,
    })
    const stacked = stackGapLabelsByPixels(
      placed,
      { target: 40, income: 40, market: 40 },
      2000,
    )
    expect(stacked.every((marker) => marker.stack === 'below')).toBe(true)
  })
})

describe('VerdictGapSlider', () => {
  it('renders three 13px labels and a text description', () => {
    render(
      <VerdictGapSlider
        listPrice={625_999}
        incomeValue={477_699}
        targetBuy={453_814}
        dealGapDisplayPct={-27.5}
      />,
    )
    expect(screen.getByText('Target $453,814')).toBeInTheDocument()
    expect(screen.getByText('Income $477,699')).toBeInTheDocument()
    expect(screen.getByText('Market $625,999')).toBeInTheDocument()
    expect(
      screen.getByRole('img', {
        name: /Target \$453,814.*Income \$477,699.*Market \$625,999.*27\.5 percent/i,
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('Income $477,699').className).toContain('text-[13px]')
  })
})
