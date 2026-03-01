/**
 * React hook for sale comps — loading, error, data, retry.
 * Non-blocking; comps load after core analysis. Cancels on unmount.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { fetchSaleComps } from '@/lib/api/sale-comps'
import { getSaleUserMessage } from '@/utils/comps-calculations'
import type { CompsIdentifier, CompsState, SaleComp, SubjectProperty } from '@/lib/api/types'

export function useSaleComps(
  identifier: CompsIdentifier | null,
  subject?: SubjectProperty
): CompsState<SaleComp> {
  const [data, setData] = useState<SaleComp[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [attempts, setAttempts] = useState(0)
  const [lastFetched, setLastFetched] = useState<Date | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const fetch = useCallback(async () => {
    if (!identifier?.zpid && !identifier?.address && !identifier?.url) {
      setStatus('idle')
      setData([])
      setError(null)
      return
    }

    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()

    setLoading(true)
    setError(null)
    setStatus('loading')

    const res = await fetchSaleComps(identifier, subject, {
      signal: abortRef.current.signal,
    })

    setAttempts(res.attempts)
    setLastFetched(new Date())

    if (res.ok && res.data) {
      setData(res.data)
      setError(null)
      setStatus('success')
      return
    }

    const message = getSaleUserMessage(res.status, res.error ?? '')
    setError(message)
    setData([])
    setStatus('error')
  }, [
    identifier?.zpid ?? '',
    identifier?.address ?? '',
    identifier?.url ?? '',
    subject?.zpid ?? '',
  ])

  useEffect(() => {
    fetch()
    return () => {
      if (abortRef.current) abortRef.current.abort()
      abortRef.current = null
    }
  }, [fetch])

  const retry = useCallback(() => {
    setError(null)
    setStatus('loading')
    setLoading(true)
    fetch()
  }, [fetch])

  return {
    data,
    loading,
    error,
    status,
    attempts,
    retry,
    lastFetched,
  }
}
