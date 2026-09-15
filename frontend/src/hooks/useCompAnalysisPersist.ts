'use client'

import { useEffect, useRef } from 'react'
import { api } from '@/lib/api-client'

export type PersistedCompAnalysis = {
  version: 1
  sale: {
    selected_ids: string[]
    override_market: number | null
    override_arv: number | null
  }
  rent: {
    selected_ids: string[]
    override_market: number | null
    override_improved: number | null
  }
}

export function shouldPatchCompAnalysis(
  lastPersisted: string | null,
  currentSerialized: string,
): boolean {
  if (lastPersisted == null) return false
  return currentSerialized !== lastPersisted
}

/**
 * Debounced `comp_analysis` PATCH. Baselines from the restored server state
 * once `ready` flips so a pure Math visit writes nothing.
 */
export function useCompAnalysisPersist(input: {
  savedPropertyId: string | null | undefined
  current: PersistedCompAnalysis
  ready: boolean
}): void {
  const lastPersistedRef = useRef<string | null>(null)
  const baselinedRef = useRef(false)
  const savedPropertyId = input.savedPropertyId ?? null

  useEffect(() => {
    lastPersistedRef.current = null
    baselinedRef.current = false
  }, [savedPropertyId])

  useEffect(() => {
    if (!input.ready || baselinedRef.current) return
    lastPersistedRef.current = JSON.stringify(input.current)
    baselinedRef.current = true
  }, [input.ready, input.current])

  useEffect(() => {
    if (!savedPropertyId || !input.ready || !baselinedRef.current) return
    const serialized = JSON.stringify(input.current)
    if (!shouldPatchCompAnalysis(lastPersistedRef.current, serialized)) return
    const timer = window.setTimeout(() => {
      api
        .patch(`/api/v1/properties/saved/${savedPropertyId}`, {
          comp_analysis: input.current,
        })
        .then(() => {
          lastPersistedRef.current = serialized
        })
        .catch(() => {
          /* retried automatically on the next state change */
        })
    }, 1200)
    return () => window.clearTimeout(timer)
  }, [input.current, savedPropertyId, input.ready])
}
