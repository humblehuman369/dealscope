/**
 * usePropertyData + dealMakerStore integration (AGENTS.md §8; R4 Stage 2 risk
 * table "double data fetch / cache divergence").
 *
 * Discovery and the embedded Strategy Workbench are two simultaneous consumers
 * of the same property cache and the same worksheet store. The invariants:
 * one search request per property no matter how many consumers mount, address
 * variants collapse onto one cache entry, non-finite numerics never reach the
 * cache, and traffic on one side (a property refetch, a worksheet save) never
 * mutates state owned by the other.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import React from 'react'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const mockApiPost = vi.fn()
const mockApiRequest = vi.fn()

vi.mock('@/lib/api-client', () => ({
  api: { post: (...args: unknown[]) => mockApiPost(...args) },
  apiRequest: (...args: unknown[]) => mockApiRequest(...args),
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn() },
}))

import { usePropertyData } from '@/hooks/usePropertyData'
import { useDealMakerStore, type DealMakerRecord } from '@/stores/dealMakerStore'

const ADDRESS = '1014 N J St, Lake Worth Beach, FL 33460'

const propertyResponse = (valuations: Record<string, unknown> = {}) => ({
  valuations: { zestimate: 531_832, value_iq_estimate: 500_000, ...valuations },
  market: { insurance_annual: 5_000 },
  rentals: { monthly_rent_ltr: 3_100, rental_stats: { iq_estimate: 3_100 } },
})

/** A PATCH/GET envelope carrying the record the server would return. */
const recordEnvelope = (rec: Partial<DealMakerRecord>) => ({
  record: rec as DealMakerRecord,
  cash_needed: null,
  deal_gap: null,
  annual_profit: null,
  cap_rate: null,
  coc_return: null,
})

let queryClient: QueryClient

/** One mounted consumer of the hook — Discovery, or the embedded workbench. */
function newConsumer() {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return renderHook(() => usePropertyData(), { wrapper }).result
}

beforeEach(() => {
  vi.clearAllMocks()
  // Both pages render under the app's single QueryClientProvider.
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  useDealMakerStore.getState().reset()
})

afterEach(() => {
  queryClient.clear()
})

describe('shared property cache', () => {
  it('fetches once for two consumers of the same address', async () => {
    mockApiPost.mockResolvedValue(propertyResponse())
    const discovery = newConsumer()
    const workbench = newConsumer()

    const [first, second] = await Promise.all([
      discovery.current.fetchProperty(ADDRESS),
      workbench.current.fetchProperty(ADDRESS),
    ])

    expect(mockApiPost).toHaveBeenCalledTimes(1)
    // Same object, not merely equal — divergent copies is the failure mode.
    expect(second).toBe(first)
  })

  it('collapses address formatting variants onto one cache entry', async () => {
    mockApiPost.mockResolvedValue(propertyResponse())
    const consumer = newConsumer()

    await consumer.current.fetchProperty(`  ${ADDRESS.replace(/ /g, '  ')}, USA `)
    await consumer.current.fetchProperty(ADDRESS)

    expect(mockApiPost).toHaveBeenCalledTimes(1)
    // The network sees the canonical form, so the backend cache key matches too.
    expect(mockApiPost.mock.calls[0][1]).toMatchObject({ address: ADDRESS })
  })

  it('keeps zpid-scoped lookups as separate entries', async () => {
    mockApiPost.mockResolvedValue(propertyResponse())
    const consumer = newConsumer()

    await consumer.current.fetchProperty(ADDRESS)
    await consumer.current.fetchProperty(ADDRESS, { zpid: '43109841' })

    expect(mockApiPost).toHaveBeenCalledTimes(2)
    expect(mockApiPost.mock.calls[1][1]).toMatchObject({ zpid: '43109841' })
  })

  it('sanitizes non-finite numerics before they reach the cache', async () => {
    mockApiPost.mockResolvedValue(
      propertyResponse({
        zestimate: Infinity,
        value_iq_estimate: 'not-a-number',
        market_price: 450_000,
      }),
    )
    const consumer = newConsumer()

    const data = await consumer.current.fetchProperty(ADDRESS)

    expect(data.valuations.zestimate).toBeNull()
    expect(data.valuations.value_iq_estimate).toBeNull()
    expect(data.valuations.market_price).toBe(450_000)
  })
})

describe('interaction with the deal maker store', () => {
  it('a property refetch never clobbers unsaved worksheet edits', async () => {
    // Discovery loads the saved record and the user edits before saving.
    mockApiRequest.mockResolvedValueOnce(recordEnvelope({ buy_price: 250_000 }))
    await useDealMakerStore.getState().loadRecord('prop-1')
    useDealMakerStore.getState().updateField('buy_price', 300_000)

    const consumer = newConsumer()
    mockApiPost.mockResolvedValue(propertyResponse())
    await consumer.current.fetchProperty(ADDRESS)
    // Simulate the 5-min staleTime expiring between visits — the one path that
    // actually re-hits the network for an already-seen property.
    queryClient.removeQueries({ queryKey: ['property-search'] })
    await consumer.current.fetchProperty(ADDRESS)

    // The refetch really happened…
    expect(mockApiPost).toHaveBeenCalledTimes(2)
    // …and the optimistic edit survived it.
    expect(useDealMakerStore.getState().record?.buy_price).toBe(300_000)
    expect(useDealMakerStore.getState().isDirty).toBe(true)
  })

  it('a worksheet save never mutates the cached property response', async () => {
    const consumer = newConsumer()
    mockApiPost.mockResolvedValue(propertyResponse())
    const before = await consumer.current.fetchProperty(ADDRESS)

    mockApiRequest.mockResolvedValueOnce(recordEnvelope({ buy_price: 250_000 }))
    await useDealMakerStore.getState().loadRecord('prop-1')
    mockApiRequest.mockResolvedValueOnce(recordEnvelope({ buy_price: 300_000 }))
    useDealMakerStore.getState().updateField('buy_price', 300_000)
    await useDealMakerStore.getState().flushAndSave()

    // The property cache is server truth for valuations; a Deal Maker PATCH
    // round-trip must not touch it (no refetch, no in-place mutation).
    const after = await consumer.current.fetchProperty(ADDRESS)
    expect(mockApiPost).toHaveBeenCalledTimes(1)
    expect(after).toBe(before)
    expect(after.valuations.zestimate).toBe(531_832)
  })
})
