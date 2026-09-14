import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { api } from '@/lib/api-client'
import {
  DEAL_STRUCTURES_PATH,
  createSettledScheduler,
  fetchDealStructures,
} from '@/lib/dealStructures/recomputeStructures'

vi.mock('@/lib/api-client', () => ({
  api: { post: vi.fn() },
}))

describe('createSettledScheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('fires once when a slider drag settles, not once per tick', () => {
    const scheduler = createSettledScheduler(300)
    const fn = vi.fn()
    scheduler.schedule(fn)
    scheduler.schedule(fn)
    scheduler.schedule(fn)
    vi.advanceTimersByTime(299)
    expect(fn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(fn).toHaveBeenCalledTimes(1)
  })
})

describe('fetchDealStructures', () => {
  it('posts the worksheet payload to the structures-only path and never searches property', async () => {
    vi.mocked(api.post).mockResolvedValue({ hasPaths: true, paths: [] })
    const payload = { monthly_rent: 4_385, list_price: 625_999 }
    await fetchDealStructures(payload)
    expect(api.post).toHaveBeenCalledTimes(1)
    expect(api.post).toHaveBeenCalledWith(DEAL_STRUCTURES_PATH, payload)
    expect(DEAL_STRUCTURES_PATH).toBe('/api/v1/analysis/deal-structures')
    expect(DEAL_STRUCTURES_PATH).not.toContain('properties/search')
    expect(vi.mocked(api.post).mock.calls[0][0]).not.toBe('/api/v1/analysis/verdict')
  })
})
