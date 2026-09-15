import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'

const mockApiPost = vi.fn()

vi.mock('@/lib/api-client', () => ({
  api: { post: (...args: unknown[]) => mockApiPost(...args) },
}))

import { fetchVerdictAnalysis } from '@/lib/verdictAnalysisQuery'

describe('duplicate verdict POSTs on Plan mount', () => {
  beforeEach(() => {
    mockApiPost.mockReset()
    mockApiPost.mockResolvedValue({ dealStructures: { paths: [] } })
  })

  it('shares one in-flight POST between Discovery and the workbench', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const address = '1766 Wandering Willow Way, Wellington, FL 33414'
    const payload = { address }

    const [first, second] = await Promise.all([
      fetchVerdictAnalysis(queryClient, address, payload),
      fetchVerdictAnalysis(queryClient, address, payload),
    ])

    expect(mockApiPost).toHaveBeenCalledTimes(1)
    expect(second).toBe(first)
  })
})
