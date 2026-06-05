import { describe, expect, it } from 'vitest'
import type { MapListing } from '@/lib/api'
import type { DealSignalResult } from '@/lib/dealSignal'
import {
  pickTourHighlightListing,
  resolveMapTourPersona,
  formatTourListingLabel,
} from './mapSearchTourHelpers'

const baseListing = (id: string, address: string): MapListing =>
  ({
    id,
    address,
    latitude: 0,
    longitude: 0,
    price: 100_000,
  }) as MapListing

describe('mapSearchTourHelpers', () => {
  it('resolveMapTourPersona maps flip/wholesale to hunter', () => {
    expect(resolveMapTourPersona(['flip'])).toBe('hunter')
    expect(resolveMapTourPersona(['ltr'])).toBe('holder')
    expect(resolveMapTourPersona([])).toBe('default')
  })

  it('pickTourHighlightListing prefers distressed with higher rank', () => {
    const a = baseListing('1', '100 Main St, Austin, TX')
    const b = baseListing('2', '200 Oak Ave, Austin, TX')
    const signals = new Map<string, DealSignalResult>([
      ['1', { category: 'active', rank: 2, label: 'Active', color: '#000' }],
      ['2', { category: 'distressed', rank: 5, label: 'Foreclosure', color: '#f00' }],
    ])
    expect(pickTourHighlightListing([a, b], signals)?.id).toBe('2')
  })

  it('formatTourListingLabel uses street line only', () => {
    expect(formatTourListingLabel(baseListing('1', '123 Pine Rd, Dallas, TX'))).toBe('123 Pine Rd')
  })
})
