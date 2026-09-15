import { describe, expect, it } from 'vitest'

import { filterResultsCountText } from '@/components/map-search/FilterPanel'

describe('filterResultsCountText', () => {
  it('hides 0 results until the first response arrives', () => {
    expect(
      filterResultsCountText({
        isLoading: false,
        motivatedSellerSearch: true,
        hasSearchResponded: false,
        totalCount: 0,
      }),
    ).toBeNull()
  })

  it('shows Searching... while a standard search is in flight', () => {
    expect(
      filterResultsCountText({
        isLoading: true,
        motivatedSellerSearch: false,
        hasSearchResponded: false,
        totalCount: 0,
      }),
    ).toBe('Searching...')
  })

  it('shows the motivated-seller scanning line while that search is in flight', () => {
    expect(
      filterResultsCountText({
        isLoading: true,
        motivatedSellerSearch: true,
        hasSearchResponded: false,
        totalCount: 0,
      }),
    ).toBe('Scanning motivated-seller keywords…')
  })

  it('shows the count after the first response, including zero', () => {
    expect(
      filterResultsCountText({
        isLoading: false,
        motivatedSellerSearch: true,
        hasSearchResponded: true,
        totalCount: 0,
      }),
    ).toBe('0 results')
    expect(
      filterResultsCountText({
        isLoading: false,
        motivatedSellerSearch: true,
        hasSearchResponded: true,
        totalCount: 12,
      }),
    ).toBe('12 results')
  })
})
