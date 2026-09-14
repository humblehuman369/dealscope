import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import {
  placeGapMarkers,
  VerdictGapSlider,
} from '@/components/discovery/VerdictGapSlider'

describe('placeGapMarkers', () => {
  it('positions Willow markers by value and stacks the close Income label above', () => {
    const placed = placeGapMarkers({
      listPrice: 625_999,
      incomeValue: 477_699,
      targetBuy: 453_814,
    })
    const byId = Object.fromEntries(placed.map((marker) => [marker.id, marker]))
    expect(byId.target.pct).toBe(0)
    expect(byId.market.pct).toBe(100)
    expect(byId.income.pct).toBeCloseTo(13.87, 1)
    expect(byId.target.stack).toBe('below')
    expect(byId.income.stack).toBe('above')
    expect(byId.market.stack).toBe('below')
  })

  it('stacks the close Crosswinds labels instead of merging them', () => {
    const placed = placeGapMarkers({
      listPrice: 379_981,
      incomeValue: 381_465,
      targetBuy: 363_000,
    })
    const stacks = placed.map((marker) => marker.stack)
    expect(stacks.filter((stack) => stack === 'above').length).toBeGreaterThanOrEqual(1)
    expect(new Set(placed.map((marker) => marker.name)).size).toBe(3)
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
