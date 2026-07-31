/**
 * useDealSnapshot (AGENTS.md §8 — the last "Required before Phase 5 sign-off"
 * test item).
 *
 * The snapshot is the immutable server-truth Deal Maker record that worksheets
 * and metric cards render. The invariants: one request per propertyId no matter
 * how many consumers mount, no request at all without a propertyId (or when
 * disabled), invalidate() pulls fresh server data after a write elsewhere
 * (useApplyToDeal invalidates this exact key), and a failed load surfaces the
 * error instead of a fabricated record.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const mockApiRequest = vi.fn()

vi.mock('@/lib/api-client', () => ({
  apiRequest: (...args: unknown[]) => mockApiRequest(...args),
}))

import { useDealSnapshot } from '@/hooks/useDealSnapshot'
import type { DealMakerRecord } from '@/stores/dealMakerStore'

const PROPERTY_ID = 'prop-1'

/** The GET envelope the backend returns; the hook unwraps `.record`. */
const snapshotEnvelope = (rec: Partial<DealMakerRecord>) => ({
  record: rec as DealMakerRecord,
  cash_needed: null,
  deal_gap: null,
  annual_profit: null,
  cap_rate: null,
  coc_return: null,
})

let queryClient: QueryClient

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

beforeEach(() => {
  vi.clearAllMocks()
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
})

afterEach(() => {
  queryClient.clear()
})

describe('loading the snapshot', () => {
  it('fetches the record for a propertyId and unwraps the envelope', async () => {
    mockApiRequest.mockResolvedValue(snapshotEnvelope({ buy_price: 250_000 }))

    const { result } = renderHook(() => useDealSnapshot(PROPERTY_ID), { wrapper })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(mockApiRequest).toHaveBeenCalledWith(
      `/api/v1/properties/saved/${PROPERTY_ID}/deal-maker`,
    )
    expect(result.current.record?.buy_price).toBe(250_000)
    expect(result.current.error).toBeNull()
  })

  it('never fetches without a propertyId', async () => {
    const { result } = renderHook(() => useDealSnapshot(null), { wrapper })

    // Disabled query: settle a tick and confirm nothing went out.
    await new Promise((r) => setTimeout(r, 50))
    expect(mockApiRequest).not.toHaveBeenCalled()
    expect(result.current.record).toBeNull()
  })

  it('never fetches when explicitly disabled', async () => {
    renderHook(() => useDealSnapshot(PROPERTY_ID, { enabled: false }), { wrapper })

    await new Promise((r) => setTimeout(r, 50))
    expect(mockApiRequest).not.toHaveBeenCalled()
  })

  it('surfaces a failed load as an error, not a fabricated record', async () => {
    mockApiRequest.mockRejectedValue(new Error('backend down'))

    const { result } = renderHook(() => useDealSnapshot(PROPERTY_ID), { wrapper })

    await waitFor(() => expect(result.current.error).toBeTruthy())
    expect(result.current.record).toBeNull()
  })
})

describe('shared cache across consumers', () => {
  it('fetches once for two simultaneous consumers of the same property', async () => {
    mockApiRequest.mockResolvedValue(snapshotEnvelope({ buy_price: 250_000 }))

    const first = renderHook(() => useDealSnapshot(PROPERTY_ID), { wrapper })
    const second = renderHook(() => useDealSnapshot(PROPERTY_ID), { wrapper })

    await waitFor(() => expect(first.result.current.isLoading).toBe(false))
    await waitFor(() => expect(second.result.current.isLoading).toBe(false))

    expect(mockApiRequest).toHaveBeenCalledTimes(1)
    // Same object from the shared cache — divergent copies is the failure mode.
    expect(second.result.current.record).toBe(first.result.current.record)
  })

  it('keeps different properties as separate cache entries', async () => {
    mockApiRequest
      .mockResolvedValueOnce(snapshotEnvelope({ buy_price: 250_000 }))
      .mockResolvedValueOnce(snapshotEnvelope({ buy_price: 400_000 }))

    const a = renderHook(() => useDealSnapshot('prop-1'), { wrapper })
    const b = renderHook(() => useDealSnapshot('prop-2'), { wrapper })

    await waitFor(() => expect(a.result.current.record?.buy_price).toBe(250_000))
    await waitFor(() => expect(b.result.current.record?.buy_price).toBe(400_000))
    expect(mockApiRequest).toHaveBeenCalledTimes(2)
  })
})

describe('invalidation after a write elsewhere', () => {
  it('invalidate() refetches and picks up the new server record', async () => {
    // The real workflow: useApplyToDeal PATCHes the record, then invalidates
    // ['deal-maker', 'snapshot', propertyId] so every snapshot consumer
    // re-renders with server truth.
    mockApiRequest.mockResolvedValueOnce(snapshotEnvelope({ buy_price: 250_000 }))

    const { result } = renderHook(() => useDealSnapshot(PROPERTY_ID), { wrapper })
    await waitFor(() => expect(result.current.record?.buy_price).toBe(250_000))

    mockApiRequest.mockResolvedValueOnce(snapshotEnvelope({ buy_price: 300_000 }))
    result.current.invalidate()

    await waitFor(() => expect(result.current.record?.buy_price).toBe(300_000))
    expect(mockApiRequest).toHaveBeenCalledTimes(2)
  })
})
