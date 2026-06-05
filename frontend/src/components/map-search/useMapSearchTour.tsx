'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { DriveStep } from 'driver.js'
import { TourModal } from '@/components/tour/TourModal'
import { createTourDriver, scheduleTourAutoAdvance } from '@/components/tour/createTourDriver'
import { trackEvent } from '@/lib/eventTracking'
import {
  hasSeenMapSearchTour,
  markMapSearchTourSeen,
  setMapTourActiveSession,
  wasWorkbenchTourCompletedThisSession,
  hydrateTourPrefsFromProfile,
} from '@/lib/tourPreferences'

const FULL_STEP_MS = [5_000, 8_000, 6_000, 5_000] as const
const ABBREVIATED_STEP_MS = [5_000, 6_000, 5_000] as const

function buildMapSteps(abbreviated: boolean): DriveStep[] {
  const core: DriveStep[] = [
    {
      element: '[data-tour="map-search-bar"]',
      popover: {
        title: 'Jump to a market',
        description: 'Search a city, ZIP, or address to pan the map instantly.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="map-search-filters"]',
      popover: {
        title: 'Filter for opportunity',
        description:
          'Foreclosures, expired listings, days-on-market, and price — pins update live.',
        side: 'left',
      },
    },
    {
      element: '[data-tour="map-marker-legend"]',
      popover: {
        title: 'Read the colors',
        description: 'Colors = opportunity. Red = distressed. Purple = expired.',
        side: 'top',
      },
    },
    {
      element: '[data-tour="map-click-target"]',
      popover: {
        title: 'Click any home',
        description: 'Tap a pin or click any parcel when zoomed in — even off-market.',
        side: 'top',
        align: 'center',
      },
    },
  ]

  if (abbreviated) return core.slice(1)
  return core
}

export interface UseMapSearchTourOptions {
  ready: boolean
  skipAutoStart?: boolean
  onOpenFilters?: () => void
  onReplayRequest?: () => void
}

export function useMapSearchTour({
  ready,
  skipAutoStart = false,
  onOpenFilters,
}: UseMapSearchTourOptions) {
  const [phase, setPhase] = useState<'idle' | 'welcome' | 'driving' | 'close'>('idle')
  const cancelAutoRef = useRef<(() => void) | null>(null)
  const startedRef = useRef(false)

  useEffect(() => {
    void hydrateTourPrefsFromProfile()
  }, [])

  const startDriving = useCallback(
    (abbreviated: boolean) => {
      setPhase('driving')
      setMapTourActiveSession(true)
      trackEvent('map-tour-shown', { abbreviated })

      onOpenFilters?.()

      const steps = buildMapSteps(abbreviated)
      const durations = abbreviated ? ABBREVIATED_STEP_MS : FULL_STEP_MS

      const driverInstance = createTourDriver(steps, {
        onStepReached: (index) => {
          cancelAutoRef.current?.()
          trackEvent('map-tour-step', { step: index + 1, abbreviated })
          if (index === (abbreviated ? 0 : 1)) onOpenFilters?.()
          cancelAutoRef.current = scheduleTourAutoAdvance(
            driverInstance,
            durations[index] ?? 6_000,
          )
        },
        onFinished: () => {
          cancelAutoRef.current?.()
          trackEvent('map-tour-completed', { abbreviated })
          setPhase('close')
        },
        onSkipped: (stepIndex) => {
          cancelAutoRef.current?.()
          trackEvent('map-tour-skipped', { step: stepIndex + 1 })
          markMapSearchTourSeen({ dontShowAgain: true })
          setMapTourActiveSession(false)
          setPhase('idle')
        },
      })

      requestAnimationFrame(() => driverInstance.drive())
    },
    [onOpenFilters],
  )

  const replay = useCallback(() => {
    trackEvent('map-tour-replay')
    startedRef.current = true
    startDriving(false)
  }, [startDriving])

  useEffect(() => {
    const onReplay = () => replay()
    window.addEventListener('dealscope:replay-map-tour', onReplay)
    return () => window.removeEventListener('dealscope:replay-map-tour', onReplay)
  }, [replay])

  useEffect(() => {
    if (!ready || skipAutoStart || startedRef.current) return
    if (hasSeenMapSearchTour()) return

    startedRef.current = true
    const abbreviated = wasWorkbenchTourCompletedThisSession()
    if (abbreviated) {
      startDriving(true)
    } else {
      setPhase('welcome')
    }
  }, [ready, skipAutoStart, startDriving])

  const confirmWelcome = useCallback(() => {
    startDriving(false)
  }, [startDriving])

  const finishClose = useCallback(() => {
    markMapSearchTourSeen({ dontShowAgain: true })
    setMapTourActiveSession(false)
    setPhase('idle')
  }, [])

  const TourLayer = (
    <>
      <TourModal
        open={phase === 'welcome'}
        title="Hunt deals across any ZIP"
        onSkip={() => {
          markMapSearchTourSeen({ dontShowAgain: true })
          setPhase('idle')
          trackEvent('map-tour-skipped', { step: 0 })
        }}
        onPrimary={confirmWelcome}
        primaryLabel="Show Me →"
      >
        <p>Here&apos;s the 30-second map — find, filter, and analyze from the map.</p>
      </TourModal>

      <TourModal
        open={phase === 'close'}
        title="You're ready to hunt."
        onSkip={finishClose}
        onPrimary={finishClose}
        primaryLabel="Start exploring →"
      >
        <p>Pick a pin and run your first map analysis.</p>
        <p className="mt-3 text-xs">
          New to the workbench?{' '}
          <button
            type="button"
            className="font-semibold hover:underline"
            style={{ color: 'var(--accent-sky)' }}
            onClick={() => {
              finishClose()
              window.dispatchEvent(new Event('dealscope:replay-workbench-tour'))
            }}
          >
            Take the 60-sec workbench tour →
          </button>
        </p>
      </TourModal>
    </>
  )

  return { TourLayer, replay, tourActive: phase !== 'idle' }
}
