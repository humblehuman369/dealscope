/**
 * R7 persona-adaptive density — the pure pieces.
 *
 * The contract from usePersona's doc: anonymous users (experience null) must
 * render identically to before, so every persona branch here must be a no-op
 * for null/beginner/intermediate except where R7 explicitly adds affordances.
 */

import { describe, expect, it } from 'vitest'
import { orderPathsForPersona } from '@/features/strategy-workbench/lib/orderPathsForPersona'
import { METRIC_GLOSSARY } from '@/features/strategy-workbench/lib/metricGlossary'
import type { DealStructure } from '@/components/iq-verdict/FourPathsPanel'

const path = (id: string, family: DealStructure['family']): DealStructure =>
  ({ id, family }) as DealStructure

// Backend ranking order: conventional price cut first, creative after.
const PATHS = [
  path('price-cut', 'price'),
  path('seller-carry', 'capital_stack'),
  path('sub-to', 'financing'),
  path('str-switch', 'strategy_switch'),
]

describe('orderPathsForPersona', () => {
  it.each([null, 'beginner', 'intermediate'] as const)(
    'keeps the backend order for %s',
    (experience) => {
      expect(orderPathsForPersona(PATHS, experience)).toEqual(PATHS)
    },
  )

  it.each(['advanced', 'expert'] as const)('puts creative paths first for %s', (experience) => {
    expect(orderPathsForPersona(PATHS, experience).map((p) => p.id)).toEqual([
      'seller-carry',
      'sub-to',
      'str-switch',
      'price-cut',
    ])
  })

  it('preserves backend ranking within each group', () => {
    const ordered = orderPathsForPersona(PATHS, 'expert')
    const creativeIds = ordered.filter((p) => p.family !== 'price').map((p) => p.id)
    expect(creativeIds).toEqual(['seller-carry', 'sub-to', 'str-switch'])
  })

  it('is a no-op when every path is already creative', () => {
    const allCreative = [path('a', 'capital_stack'), path('b', 'financing')]
    expect(orderPathsForPersona(allCreative, 'expert')).toBe(allCreative)
  })
})

describe('METRIC_GLOSSARY', () => {
  it('defines every Key Metrics Bar label', () => {
    // Must match the labels rendered in StrategyWorkbench's Key Metrics Bar.
    const KEY_BAR_LABELS = [
      'Buy Price',
      'Cash Needed',
      'Deal Gap',
      'Annual Profit',
      'CAP Rate',
      'COC Return',
    ]
    for (const label of KEY_BAR_LABELS) {
      expect(METRIC_GLOSSARY[label], `missing glossary entry for "${label}"`).toBeTruthy()
    }
  })
})
