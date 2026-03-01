/**
 * React hook for rent comps — loading, error, data, retry.
 * Non-blocking; comps load after core analysis. Cancels on unmount.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { fetchRentComps } from '@/lib/api/rent-comps'
import { getRentUserMessage } from '@/utils/comps-calculations'
import type { CompsIdentifier, CompsState, RentComp, SubjectProperty } from '@/lib/api/types'

export function useRentComps(
  identifier: CompsIdentifier | null,
  subject?: SubjectProperty
): CompsState<RentComp> {
  const [data, setData] = useState<RentComp[]>([])
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

    const res = await fetchRentComps(identifier, subject, {
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

    const message = getRentUserMessage(res.status, res.error ?? '')
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
