import { describe, expect, it } from 'vitest'

import {
  classifySignalKind,
  orderWhySignals,
  seeMoreSignalsLabel,
  splitWhySignals,
  type WhySignal,
} from '@/lib/whyWeThinkSo'

function signal(id: string, title: string, kind?: WhySignal['kind']): WhySignal {
  return {
    id,
    kind: kind ?? classifySignalKind(title),
    title,
    detail: `${id} detail`,
  }
}

describe('classifySignalKind', () => {
  it('classifies existing Key Insight titles without rewriting them', () => {
    expect(classifySignalKind('224 days on market')).toBe('dom')
    expect(classifySignalKind('10 price reductions totaling 21%')).toBe('price_cuts')
    expect(classifySignalKind('Non-owner occupied')).toBe('occupancy')
    expect(classifySignalKind('Foreclosure — a deadline is driving this sale')).toBe('distress')
    expect(classifySignalKind('Expired listing')).toBe('distress')
    expect(classifySignalKind('Actively listed — competing buyers')).toBe('rest')
    expect(classifySignalKind('STR occupancy down 22% year-over-year')).toBe('rest')
  })
})

describe('orderWhySignals', () => {
  it('puts days on market, price cuts, occupancy, then distress, then the rest', () => {
    const ordered = orderWhySignals([
      signal('listed', 'Actively listed — competing buyers'),
      signal('cuts', '10 price reductions totaling 21%'),
      signal('calibrated', 'About 7% of investors close at this discount or deeper'),
      signal('dom', '224 days on market'),
      signal('distress', 'Pre-foreclosure'),
      signal('occ', 'Non-owner occupied'),
    ])
    expect(ordered.map((s) => s.id)).toEqual([
      'dom',
      'cuts',
      'occ',
      'distress',
      'listed',
      'calibrated',
    ])
  })
})

describe('splitWhySignals', () => {
  it('keeps three visible and names the expander from the remainder', () => {
    const { visible, rest } = splitWhySignals([
      signal('listed', 'Off-market — not listed for sale'),
      signal('target', 'Target buy: $454,000 (-27.5% gap)'),
      signal('calibrated', 'About 7% of investors close at this discount or deeper'),
      signal('repairs', 'Repairs not included in initial analysis'),
      signal('assumptions', 'Assumes 20% down · 6.0% · 30yr'),
    ])
    expect(visible).toHaveLength(3)
    expect(rest).toHaveLength(2)
    expect(seeMoreSignalsLabel(rest.length)).toBe('See 2 more signals')
  })
})
