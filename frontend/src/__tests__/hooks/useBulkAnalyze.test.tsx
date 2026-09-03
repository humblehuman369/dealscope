/**
 * useBulkAnalyze — the drain loop for the bulk analyze queue.
 *
 * The backend analyzes sequentially inside a wall-clock budget and returns
 * whatever it did not reach, so this hook resubmits until the queue empties.
 * That makes three properties safety-critical rather than cosmetic:
 *
 * Every analysis spends one unit of the user's monthly quota. So results must
 * accumulate across rounds and survive a stop — throwing away a partial run
 * means charging someone for numbers they never saw.
 *
 * The loop must terminate. A server that stops shrinking the queue has to
 * stall the UI, not spend the quota in a tight loop.
 *
 * Ranking is the product: Deal Gap ascending, with properties that could not
 * be priced last rather than treated as zero-gap bargains.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { BulkAnalyzeResponse, BulkAnalyzeResult } from '@/lib/api'

const mockRun = vi.fn()

vi.mock('@/lib/api', () => ({
  api: { bulkAnalyze: { run: (addresses: string[]) => mockRun(addresses) } },
}))

vi.mock('sonner', () => ({ toast: { error: vi.fn(), info: vi.fn() } }))

import { useBulkAnalyze } from '@/hooks/useBulkAnalyze'

function analyzed(address: string, gapPercent: number | null): BulkAnalyzeResult {
  return {
    address,
    status: 'analyzed',
    list_price: 300_000,
    income_value: 250_000,
    target_buy_price: 240_000,
    deal_gap_amount: gapPercent == null ? null : 300_000 * (gapPercent / 100),
    deal_gap_percent: gapPercent,
    deal_score: 70,
    deal_verdict: 'Consider',
    monthly_rent: 2_100,
    property_id: null,
    charged: true,
    reason: null,
  }
}

function unavailable(address: string, reason: string): BulkAnalyzeResult {
  return {
    ...analyzed(address, null),
    status: 'unavailable',
    list_price: null,
    income_value: null,
    target_buy_price: null,
    deal_gap_amount: null,
    charged: false,
    reason,
  }
}

function response(over: Partial<BulkAnalyzeResponse>): BulkAnalyzeResponse {
  return {
    results: [],
    remaining: [],
    analyses_charged: 0,
    quota_exhausted: false,
    notice: null,
    ...over,
  }
}

beforeEach(() => {
  mockRun.mockReset()
})

describe('useBulkAnalyze', () => {
  it('drains the queue across rounds and keeps every result', async () => {
    mockRun
      .mockResolvedValueOnce(
        response({ results: [analyzed('A', 12)], remaining: ['B', 'C'], analyses_charged: 1 }),
      )
      .mockResolvedValueOnce(
        response({ results: [analyzed('B', 4)], remaining: ['C'], analyses_charged: 1 }),
      )
      .mockResolvedValueOnce(response({ results: [analyzed('C', 20)], analyses_charged: 1 }))

    const { result } = renderHook(() => useBulkAnalyze())

    await act(async () => {
      await result.current.start(['A', 'B', 'C'])
    })

    await waitFor(() => expect(result.current.progress.isRunning).toBe(false))
    expect(mockRun).toHaveBeenCalledTimes(3)
    expect(result.current.progress.results.map((r) => r.address)).toEqual(['B', 'A', 'C'])
    expect(result.current.progress.analysesCharged).toBe(3)
    expect(result.current.progress.pending).toBe(0)
  })

  it('resubmits only what the backend did not reach', async () => {
    mockRun
      .mockResolvedValueOnce(
        response({ results: [analyzed('A', 5)], remaining: ['B'], analyses_charged: 1 }),
      )
      .mockResolvedValueOnce(response({ results: [analyzed('B', 9)], analyses_charged: 1 }))

    const { result } = renderHook(() => useBulkAnalyze())
    await act(async () => {
      await result.current.start(['A', 'B'])
    })

    expect(mockRun.mock.calls[0][0]).toEqual(['A', 'B'])
    expect(mockRun.mock.calls[1][0]).toEqual(['B'])
  })

  it('sorts unpriceable properties last instead of ranking them as free deals', async () => {
    mockRun.mockResolvedValueOnce(
      response({
        results: [
          unavailable('No data', 'No listing price available'),
          analyzed('Steep', 30),
          analyzed('Pencils', -2),
        ],
        analyses_charged: 2,
      }),
    )

    const { result } = renderHook(() => useBulkAnalyze())
    await act(async () => {
      await result.current.start(['No data', 'Steep', 'Pencils'])
    })

    expect(result.current.progress.results.map((r) => r.address)).toEqual([
      'Pencils',
      'Steep',
      'No data',
    ])
  })

  it('stops the loop when quota runs out, without discarding what was paid for', async () => {
    mockRun.mockResolvedValueOnce(
      response({
        results: [analyzed('A', 8)],
        remaining: ['B', 'C'],
        analyses_charged: 1,
        quota_exhausted: true,
        notice: 'Monthly analysis limit reached.',
      }),
    )

    const { result } = renderHook(() => useBulkAnalyze())
    await act(async () => {
      await result.current.start(['A', 'B', 'C'])
    })

    expect(mockRun).toHaveBeenCalledTimes(1)
    expect(result.current.progress.results).toHaveLength(1)
    expect(result.current.progress.quotaExhausted).toBe(true)
    expect(result.current.progress.isRunning).toBe(false)
    expect(result.current.progress.notice).toBe('Monthly analysis limit reached.')
  })

  it('stalls rather than looping when the queue stops shrinking', async () => {
    mockRun.mockResolvedValue(
      response({ results: [], remaining: ['A', 'B'], analyses_charged: 0 }),
    )

    const { result } = renderHook(() => useBulkAnalyze())
    await act(async () => {
      await result.current.start(['A', 'B'])
    })

    expect(mockRun).toHaveBeenCalledTimes(1)
    expect(result.current.progress.isRunning).toBe(false)
  })

  it('keeps completed results after the user stops the run', async () => {
    let releaseSecondRound: (value: BulkAnalyzeResponse) => void = () => {}
    mockRun
      .mockResolvedValueOnce(
        response({ results: [analyzed('A', 6)], remaining: ['B'], analyses_charged: 1 }),
      )
      .mockImplementationOnce(
        () => new Promise<BulkAnalyzeResponse>((resolve) => (releaseSecondRound = resolve)),
      )

    const { result } = renderHook(() => useBulkAnalyze())

    let run: Promise<void> = Promise.resolve()
    act(() => {
      run = result.current.start(['A', 'B'])
    })

    // Stop mid-flight on the second round; the first is already paid for.
    await waitFor(() => expect(mockRun).toHaveBeenCalledTimes(2))
    act(() => {
      result.current.cancel()
    })
    await act(async () => {
      releaseSecondRound(response({ results: [analyzed('B', 3)], analyses_charged: 1 }))
      await run
    })

    expect(result.current.progress.results.map((r) => r.address)).toEqual(['A'])
    expect(result.current.progress.isRunning).toBe(false)
    expect(result.current.progress.notice).toBe('Stopped with 1 left to analyze.')
  })

  it('surfaces a failure instead of retrying and re-charging', async () => {
    mockRun.mockRejectedValueOnce(new Error('Request timed out'))

    const { result } = renderHook(() => useBulkAnalyze())
    await act(async () => {
      await result.current.start(['A'])
    })

    expect(mockRun).toHaveBeenCalledTimes(1)
    expect(result.current.progress.isRunning).toBe(false)
    expect(result.current.progress.notice).toBe('Request timed out')
  })
})
