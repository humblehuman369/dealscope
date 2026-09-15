import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'

const mockApiPatch = vi.fn()

vi.mock('@/lib/api-client', () => ({
  api: { patch: (...args: unknown[]) => mockApiPatch(...args) },
}))

import {
  shouldPatchCompAnalysis,
  useCompAnalysisPersist,
  type PersistedCompAnalysis,
} from '@/hooks/useCompAnalysisPersist'

const RESTORED: PersistedCompAnalysis = {
  version: 1,
  sale: { selected_ids: ['s1'], override_market: 500_000, override_arv: null },
  rent: { selected_ids: ['r1'], override_market: 3100, override_improved: null },
}

beforeEach(() => {
  vi.useFakeTimers()
  mockApiPatch.mockReset()
  mockApiPatch.mockResolvedValue({})
})

afterEach(() => {
  vi.useRealTimers()
})

describe('Math tab writes on a pure visit', () => {
  it('does not PATCH within the debounce window when the restored state is the baseline', async () => {
    renderHook(() =>
      useCompAnalysisPersist({
        savedPropertyId: 'b1ca10a6-loxahatchee',
        current: RESTORED,
        ready: true,
      }),
    )

    await vi.advanceTimersByTimeAsync(1500)
    expect(mockApiPatch).not.toHaveBeenCalled()
  })

  it('does not treat an empty last-persisted ref as dirty', () => {
    expect(shouldPatchCompAnalysis(null, JSON.stringify(RESTORED))).toBe(false)
    expect(shouldPatchCompAnalysis(JSON.stringify(RESTORED), JSON.stringify(RESTORED))).toBe(false)
  })
})
