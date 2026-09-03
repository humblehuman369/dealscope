'use client'

import { useCallback, useRef, useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { BulkAnalyzeResult } from '@/lib/api'

/**
 * Drains a bulk-analyze queue and keeps a running ranked list.
 *
 * The backend analyzes sequentially within a wall-clock budget and hands back
 * whatever it did not reach, so this hook's job is to keep resubmitting until
 * the queue is empty. Each round-trip returns real results, which is why
 * progress can be shown honestly rather than as a fake spinner: the user
 * watches the ranked list fill in.
 *
 * Stopping is a first-class outcome. Every analysis costs the user quota, so
 * `cancel` must not throw away what has already been paid for — results
 * accumulate in state and survive the stop.
 */

export interface BulkAnalyzeProgress {
  results: BulkAnalyzeResult[]
  /** Addresses still queued. */
  pending: number
  /** Total submitted at the start of this run. */
  total: number
  isRunning: boolean
  analysesCharged: number
  quotaExhausted: boolean
  notice: string | null
}

const IDLE: BulkAnalyzeProgress = {
  results: [],
  pending: 0,
  total: 0,
  isRunning: false,
  analysesCharged: 0,
  quotaExhausted: false,
  notice: null,
}

/** Best deal first: Deal Gap ascending, unrankable rows last. */
function rank(results: BulkAnalyzeResult[]): BulkAnalyzeResult[] {
  return [...results].sort((a, b) => {
    const aRankable = a.status === 'analyzed' && a.deal_gap_percent != null
    const bRankable = b.status === 'analyzed' && b.deal_gap_percent != null
    if (aRankable !== bRankable) return aRankable ? -1 : 1
    if (!aRankable) return 0
    return (a.deal_gap_percent as number) - (b.deal_gap_percent as number)
  })
}

export function useBulkAnalyze() {
  const [progress, setProgress] = useState<BulkAnalyzeProgress>(IDLE)
  const cancelledRef = useRef(false)

  const reset = useCallback(() => {
    cancelledRef.current = true
    setProgress(IDLE)
  }, [])

  const cancel = useCallback(() => {
    cancelledRef.current = true
    setProgress((prev) => ({
      ...prev,
      isRunning: false,
      notice: prev.pending > 0 ? `Stopped with ${prev.pending} left to analyze.` : prev.notice,
    }))
  }, [])

  const start = useCallback(async (addresses: string[]) => {
    if (addresses.length === 0) return

    cancelledRef.current = false
    setProgress({ ...IDLE, total: addresses.length, pending: addresses.length, isRunning: true })

    let queue = addresses
    let accumulated: BulkAnalyzeResult[] = []
    let charged = 0

    while (queue.length > 0 && !cancelledRef.current) {
      let response
      try {
        response = await api.bulkAnalyze.run(queue)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Analysis failed'
        toast.error(message)
        setProgress((prev) => ({ ...prev, isRunning: false, notice: message }))
        return
      }

      if (cancelledRef.current) return

      const queueLengthBefore = queue.length
      accumulated = rank([...accumulated, ...response.results])
      charged += response.analyses_charged
      queue = response.remaining

      // The backend always attempts at least one address per run, so the
      // queue must shrink. Stopping rather than trusting that turns a server
      // bug into a stalled UI instead of an infinite billing loop.
      const madeProgress = queue.length < queueLengthBefore

      setProgress({
        results: accumulated,
        pending: queue.length,
        total: addresses.length,
        isRunning: queue.length > 0 && !response.quota_exhausted && madeProgress,
        analysesCharged: charged,
        quotaExhausted: response.quota_exhausted,
        notice: response.notice,
      })

      if (response.quota_exhausted || !madeProgress) return
    }
  }, [])

  return { progress, start, cancel, reset }
}
