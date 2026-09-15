import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const mockApiGet = vi.fn()

vi.mock('@/lib/api-client', () => ({
  api: {
    get: (...args: unknown[]) => mockApiGet(...args),
    post: vi.fn(),
    delete: vi.fn(),
  },
}))

import { useSaveProperty } from '@/hooks/useSaveProperty'

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

describe('Work tab spins when saved/check fails', () => {
  it('exposes checkFailed after a 503 so Work can render Retry', async () => {
    mockApiGet.mockRejectedValue({ status: 503, message: 'Service unavailable' })

    const { result } = renderHook(
      () =>
        useSaveProperty({
          displayAddress: '1766 Wandering Willow Way, Wellington, FL 33414',
        }),
      { wrapper },
    )

    await waitFor(() => expect(result.current.hasChecked).toBe(true))
    expect(result.current.checkFailed).toBe(true)
    expect(result.current.savedPropertyId).toBeNull()
  })

  it('refetches saved/check when Retry runs', async () => {
    mockApiGet
      .mockRejectedValueOnce({ status: 503, message: 'Service unavailable' })
      .mockResolvedValueOnce({ is_saved: false, saved_property_id: null })

    const { result } = renderHook(
      () =>
        useSaveProperty({
          displayAddress: '1766 Wandering Willow Way, Wellington, FL 33414',
        }),
      { wrapper },
    )

    await waitFor(() => expect(result.current.checkFailed).toBe(true))
    await result.current.refreshSavedCheck()
    await waitFor(() => expect(result.current.checkFailed).toBe(false))
    expect(mockApiGet).toHaveBeenCalledTimes(2)
  })
})
