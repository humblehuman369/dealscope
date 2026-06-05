'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { DriveStep } from 'driver.js'
import type { MapListing } from '@/lib/api'
import { TourModal } from '@/components/tour/TourModal'
import { createTourDriver, scheduleTourAutoAdvance } from '@/components/tour/createTourDriver'
import { trackEvent } from '@/lib/eventTracking'
import { api } from '@/lib/api-client'
import {
  hasSeenMapSearchTour,
  markMapSearchTourSeen,
  setMapTourActiveSession,
  wasWorkbenchTourCompletedThisSession,
  hydrateTourPrefsFromProfile,
} from '@/lib/tourPreferences'
import {
  formatTourListingLabel,
  getMapTourWelcomeCopy,
  resolveMapTourPersona,
  type MapTourPersona,
} from '@/components/map-search/mapSearchTourHelpers'
import {
  mapSelectionCtaLabel,
  navigateToDiscoveryFromMap,
  useMapSelectionDestination,
} from '@/components/map-search/mapDiscoveryNavigation'

const FULL_STEP_MS = [5_000, 9_000, 7_000, 8_000] as const
const ABBREVIATED_STEP_MS = [9_000, 7_000, 8_000] as const

export type MapTourStepId = 'search' | 'filters' | 'legend' | 'click'

function buildMapSteps(abbreviated: boolean): DriveStep[] {
  const core: DriveStep[] = [
    {
      element: '[data-tour="map-search-bar"]',
      popover: {
        title: 'Type a ZIP — own the market',
        description: 'Search a city, ZIP, or address. The map loads every graded parcel in seconds.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="map-search-filters"]',
      popover: {
        title: 'Watch motivated sellers appear',
        description:
          'Foreclosure filter turning on now — red pins are auctions, pre-foreclosures, and bank-owned leads. Pins update live.',
        side: 'left',
      },
    },
    {
      element: '[data-tour="map-marker-legend"]',
      popover: {
        title: 'Read the opportunity colors',
        description:
          'Green = move fast. Red = distressed. Purple = expired off-market. Brighter pins = hotter signals.',
        side: 'top',
      },
    },
    {
      element: '[data-tour="map-click-target"]',
      popover: {
        title: 'Tap one — full Verdict in 15 sec',
        description:
          'Click any pin or parcel when zoomed in. Even off-market homes get a full DealGapIQ analysis.',
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
  onTourStep?: (step: MapTourStepId) => void
  onTourEnd?: () => void
  suggestedListing?: MapListing | null
  onHighlightListing?: (listing: MapListing | null) => void
}

export function useMapSearchTour({
  ready,
  skipAutoStart = false,
  onOpenFilters,
  onTourStep,
  onTourEnd,
  suggestedListing = null,
  onHighlightListing,
}: UseMapSearchTourOptions) {
  const router = useRouter()
  const destination = useMapSelectionDestination()
  const analyzeLabel = mapSelectionCtaLabel(destination)

  const [phase, setPhase] = useState<'idle' | 'welcome' | 'driving' | 'close'>('idle')
  const [persona, setPersona] = useState<MapTourPersona>('default')
  const cancelAutoRef = useRef<(() => void) | null>(null)
  const startedRef = useRef(false)

  useEffect(() => {
    void hydrateTourPrefsFromProfile()
    void api
      .get<{ preferred_strategies?: string[] }>('/api/v1/users/me/profile')
      .then((profile) => setPersona(resolveMapTourPersona(profile.preferred_strategies)))
      .catch(() => {})
  }, [])

  const stepKeysFor = useCallback((abbreviated: boolean): MapTourStepId[] => {
    return abbreviated
      ? ['filters', 'legend', 'click']
      : ['search', 'filters', 'legend', 'click']
  }, [])

  const startDriving = useCallback(
    (abbreviated: boolean) => {
      setPhase('driving')
      setMapTourActiveSession(true)
      trackEvent('map-tour-shown', { abbreviated })

      onOpenFilters?.()

      const steps = buildMapSteps(abbreviated)
      const durations = abbreviated ? ABBREVIATED_STEP_MS : FULL_STEP_MS
      const stepKeys = stepKeysFor(abbreviated)

      const driverInstance = createTourDriver(steps, {
        onStepReached: (index) => {
          cancelAutoRef.current?.()
          const stepId = stepKeys[index]
          if (stepId) {
            trackEvent('map-tour-step', { step: index + 1, abbreviated, stepId })
            onTourStep?.(stepId)
          }
          cancelAutoRef.current = scheduleTourAutoAdvance(
            driverInstance,
            durations[index] ?? 6_000,
          )
        },
        onFinished: () => {
          cancelAutoRef.current?.()
          trackEvent('map-tour-completed', { abbreviated })
          if (suggestedListing) {
            onHighlightListing?.(suggestedListing)
          }
          onTourEnd?.()
          setPhase('close')
        },
        onSkipped: (stepIndex) => {
          cancelAutoRef.current?.()
          trackEvent('map-tour-skipped', { step: stepIndex + 1 })
          markMapSearchTourSeen({ dontShowAgain: true })
          setMapTourActiveSession(false)
          onHighlightListing?.(null)
          setPhase('idle')
        },
      })

      requestAnimationFrame(() => driverInstance.drive())
    },
    [
      onOpenFilters,
      onTourStep,
      onTourEnd,
      onHighlightListing,
      suggestedListing,
      stepKeysFor,
    ],
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

  const finishClose = useCallback(
    (action: 'explore' | 'analyze') => {
      markMapSearchTourSeen({ dontShowAgain: true })
      setMapTourActiveSession(false)
      onHighlightListing?.(null)
      setPhase('idle')

      if (action === 'analyze' && suggestedListing) {
        trackEvent('map-tour-analyze-from-close')
        navigateToDiscoveryFromMap(router, suggestedListing)
      }
    },
    [onHighlightListing, router, suggestedListing],
  )

  const welcome = getMapTourWelcomeCopy(persona)
  const highlightLabel = suggestedListing ? formatTourListingLabel(suggestedListing) : null

  const TourLayer = (
    <>
      <TourModal
        open={phase === 'welcome'}
        title={welcome.title}
        onSkip={() => {
          markMapSearchTourSeen({ dontShowAgain: true })
          setPhase('idle')
          trackEvent('map-tour-skipped', { step: 0 })
        }}
        onPrimary={confirmWelcome}
        primaryLabel="Show Me →"
      >
        <p>{welcome.body}</p>
      </TourModal>

      <TourModal
        open={phase === 'close'}
        title={highlightLabel ? 'Your first lead is waiting.' : "You're ready to hunt."}
        onSkip={() => finishClose('explore')}
        footer={
          <>
            {highlightLabel ? (
              <p className="mt-2 mb-4" style={{ color: 'var(--text-secondary)' }}>
                We highlighted <strong style={{ color: 'var(--text-heading)' }}>{highlightLabel}</strong>{' '}
                on the map — tap it or jump straight to analysis.
              </p>
            ) : (
              <p className="mt-2 mb-4" style={{ color: 'var(--text-secondary)' }}>
                Pick any pin and run your first map analysis.
              </p>
            )}
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              {suggestedListing && (
                <button
                  type="button"
                  onClick={() => finishClose('analyze')}
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold"
                  style={{ background: 'var(--accent-sky)', color: '#fff' }}
                >
                  {analyzeLabel} this deal →
                </button>
              )}
              <button
                type="button"
                onClick={() => finishClose('explore')}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold"
                style={{
                  background: 'var(--surface-elevated)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-heading)',
                }}
              >
                Explore on my own
              </button>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              New to the workbench?{' '}
              <button
                type="button"
                className="font-semibold hover:underline"
                style={{ color: 'var(--accent-sky)' }}
                onClick={() => {
                  finishClose('explore')
                  window.dispatchEvent(new Event('dealscope:replay-workbench-tour'))
                }}
              >
                Take the 60-sec workbench tour →
              </button>
            </p>
          </>
        }
      >
        <span className="sr-only">Tour complete</span>
      </TourModal>
    </>
  )

  return { TourLayer, replay, tourActive: phase !== 'idle' }
}
