'use client'

import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api-client'
import {
  WORKBENCH_TOUR_REPLAY_EVENT,
  markTourCompleted,
  readTourReplayRequested,
  shouldAutoStartWorkbenchTour,
  type WorkbenchTourPhase,
} from '@/lib/workbenchTour'

interface UseWorkbenchTourOptions {
  /** Verdict analysis finished successfully */
  ready: boolean
  isAuthenticated: boolean
}

export function useWorkbenchTour({ ready, isAuthenticated }: UseWorkbenchTourOptions) {
  const [phase, setPhase] = useState<WorkbenchTourPhase>(null)
  const [joyrideIndex, setJoyrideIndex] = useState(0)

  const dismissTour = useCallback(
    (dontShowAgain = true) => {
      markTourCompleted(dontShowAgain)
      setPhase(null)
      if (isAuthenticated) {
        void api
          .patch('/api/v1/users/me/profile', {
            dashboard_layout: { hasSeenWorkbenchTour: true, dontShowWorkbenchTour: dontShowAgain },
          })
          .catch(() => {
            /* profile sync is best-effort */
          })
      }
    },
    [isAuthenticated],
  )

  const tryStartTour = useCallback(() => {
    if (!ready || phase != null) return
    if (!shouldAutoStartWorkbenchTour()) return
    setJoyrideIndex(0)
    setPhase('welcome')
  }, [phase, ready])

  useEffect(() => {
    if (!ready) return
    const timer = window.setTimeout(() => tryStartTour(), 600)
    return () => window.clearTimeout(timer)
  }, [ready, tryStartTour])

  useEffect(() => {
    const onReplay = () => {
      if (!ready) return
      setJoyrideIndex(0)
      setPhase('welcome')
    }
    window.addEventListener(WORKBENCH_TOUR_REPLAY_EVENT, onReplay)
    return () => window.removeEventListener(WORKBENCH_TOUR_REPLAY_EVENT, onReplay)
  }, [ready])

  useEffect(() => {
    if (!isAuthenticated || !ready) return
    let cancelled = false
    void api
      .get<{ dashboard_layout?: { hasSeenWorkbenchTour?: boolean; dontShowWorkbenchTour?: boolean } }>(
        '/api/v1/users/me/profile',
      )
      .then((profile) => {
        if (cancelled) return
        const layout = profile.dashboard_layout ?? {}
        if (layout.dontShowWorkbenchTour) {
          markTourCompleted(true)
          return
        }
        if (layout.hasSeenWorkbenchTour && !readTourReplayRequested()) {
          markTourCompleted(false)
        }
      })
      .catch(() => {
        /* localStorage fallback only */
      })
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, ready])

  return {
    phase,
    joyrideIndex,
    setPhase,
    setJoyrideIndex,
    dismissTour,
    requestReplay: () => {
      setJoyrideIndex(0)
      setPhase('welcome')
    },
  }
}
