'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { DriveStep } from 'driver.js'
import { Star, Camera, MapPin } from 'lucide-react'
import { TourModal } from './TourModal'
import { ColdLinkModal } from './ColdLinkModal'
import { createTourDriver, scheduleTourAutoAdvance } from './createTourDriver'
import { trackEvent } from '@/lib/eventTracking'
import {
  hasSeenWorkbenchTour,
  markWorkbenchTourSeen,
  markWorkbenchSessionDone,
  hydrateTourPrefsFromProfile,
} from '@/lib/tourPreferences'

const STEP_DURATIONS_MS = [10_000, 8_000, 8_000, 8_000, 7_000, 9_000] as const

function mapSearchAnchor(): string {
  if (typeof window === 'undefined') return '[data-tour="map-search-nav"]'
  return window.matchMedia('(min-width: 640px)').matches
    ? '[data-tour="map-search-nav"]'
    : '[data-tour="map-search-fab"]'
}

function buildWorkbenchSteps(includeVerdict: boolean): DriveStep[] {
  const steps: DriveStep[] = [
    ...(includeVerdict
      ? [
          {
            element: '[data-tour="verdict-gap"]',
            popover: {
              title: '🎯 This is your Verdict.',
              description:
                'Three numbers say it all — Target Buy is your profit price. Income Value is break-even. Market is what the seller wants. The Deal Gap between them is your negotiation room.',
              side: 'bottom' as const,
              align: 'center' as const,
            },
          },
        ]
      : []),
    {
      element: '[data-tour="tab-strategy"]',
      popover: {
        title: '📊 Same property, six ways to profit.',
        description:
          'Long-term, short-term, BRRRR, flip, house hack, wholesale — full proforma for each, side by side.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="tab-price-checker"]',
      popover: {
        title: '🏛️ Want a real valuation?',
        description:
          'Live comps, your-pick adjustments, confidence score, and a professional PDF to use for funding.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="tab-deal-maker"]',
      popover: {
        title: '🛠️ Structure the offer before you write it.',
        description: 'Change loan type, down payment, or rent — every metric recalculates live.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="tab-estimator"]',
      popover: {
        title: '🔨 Need rehab numbers?',
        description:
          'Local construction pricing built in. Pick a preset or itemize — kitchen, bath, systems, the works.',
        side: 'bottom',
      },
    },
    {
      element: mapSearchAnchor(),
      popover: {
        title: "🗺️ Don't have an address? Hunt the whole market.",
        description:
          'Map Search shows every parcel pre-graded green / yellow / red — with foreclosure, pre-foreclosure, auction, and 90-day-stale filters built in. Pro tip: this is how flippers and wholesalers find their next deal.',
        side: 'bottom',
      },
    },
  ]
  return steps
}

export interface WorkbenchTourProps {
  /** Verdict analysis is loaded and visible */
  ready: boolean
  /** User landed with a property context */
  hasAnalysis: boolean
  onSaveDeal?: () => void | Promise<void>
  forceStart?: boolean
}

type Phase = 'idle' | 'welcome' | 'driving' | 'close'

export function WorkbenchTour({
  ready,
  hasAnalysis,
  onSaveDeal,
  forceStart = false,
}: WorkbenchTourProps) {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('idle')
  const [coldOpen, setColdOpen] = useState(false)
  const [dontShowAgain, setDontShowAgain] = useState(true)
  const cancelAutoRef = useRef<(() => void) | null>(null)
  const startedRef = useRef(false)

  useEffect(() => {
    void hydrateTourPrefsFromProfile()
  }, [])

  const startDriving = useCallback(() => {
    setPhase('driving')
    trackEvent('tour-shown')

    const steps = buildWorkbenchSteps(hasAnalysis)
    const durations = hasAnalysis ? STEP_DURATIONS_MS : STEP_DURATIONS_MS.slice(1)
    const driverInstance = createTourDriver(steps, {
      onStepReached: (index) => {
        cancelAutoRef.current?.()
        trackEvent('tour-step-reached', { step: index + 1 })
        cancelAutoRef.current = scheduleTourAutoAdvance(
          driverInstance,
          durations[index] ?? 8_000,
        )
      },
      onFinished: () => {
        cancelAutoRef.current?.()
        trackEvent('tour-completed')
        markWorkbenchSessionDone()
        setPhase('close')
      },
      onSkipped: (stepIndex) => {
        cancelAutoRef.current?.()
        trackEvent('tour-skipped', { step: stepIndex + 1 })
        markWorkbenchTourSeen({ dontShowAgain: true })
        setPhase('idle')
      },
    })

    // Defer until header anchors exist
    requestAnimationFrame(() => {
      driverInstance.drive()
    })
  }, [hasAnalysis])

  useEffect(() => {
    if (startedRef.current && !forceStart) return
    if (!ready) return

    if (forceStart) {
      startedRef.current = true
      setPhase('welcome')
      return
    }

    if (hasSeenWorkbenchTour()) return

    if (hasAnalysis) {
      startedRef.current = true
      setPhase('welcome')
      return
    }

    startedRef.current = true
    setColdOpen(true)
  }, [ready, hasAnalysis, forceStart])

  useEffect(() => {
    const onReplay = () => {
      startedRef.current = true
      setPhase('welcome')
    }
    window.addEventListener('dealscope:replay-workbench-tour', onReplay)
    return () => window.removeEventListener('dealscope:replay-workbench-tour', onReplay)
  }, [])

  const finishClose = useCallback(
    (action: 'save' | 'scan' | 'map' | 'dismiss') => {
      if (action === 'save') trackEvent('save-from-close')
      if (action === 'scan') trackEvent('scan-from-close')
      if (action === 'map') trackEvent('mapsearch-from-close')

      markWorkbenchTourSeen({ dontShowAgain: dontShowAgain })
      setPhase('idle')

      if (action === 'save') void onSaveDeal?.()
      if (action === 'scan') router.push('/search')
      if (action === 'map') router.push('/map-search')
    },
    [dontShowAgain, onSaveDeal, router],
  )

  return (
    <>
      <ColdLinkModal
        open={coldOpen}
        onClose={() => {
          setColdOpen(false)
          markWorkbenchTourSeen({ dontShowAgain: true })
        }}
        onStartTour={() => setPhase('welcome')}
      />

      <TourModal
        open={phase === 'welcome'}
        title="You just analyzed your first property."
        stepLabel="Welcome"
        onSkip={() => {
          markWorkbenchTourSeen({ dontShowAgain: true })
          setPhase('idle')
          trackEvent('tour-skipped', { step: 0 })
        }}
        onPrimary={() => startDriving()}
        primaryLabel="Show Me →"
      >
        <p>Here&apos;s everything else you unlocked — in 60 seconds.</p>
      </TourModal>

      <TourModal
        open={phase === 'close'}
        title="That's the workbench."
        stepLabel="Done"
        onSkip={() => finishClose('dismiss')}
        footer={
          <>
            <p className="mt-2 mb-4">
              Save this property to track it, scan another, or hunt deals across an entire ZIP.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <button
                type="button"
                onClick={() => finishClose('save')}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold"
                style={{ background: 'var(--accent-sky)', color: '#fff' }}
              >
                <Star size={14} /> Save This Deal
              </button>
              <button
                type="button"
                onClick={() => finishClose('scan')}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold"
                style={{
                  background: 'var(--surface-elevated)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-heading)',
                }}
              >
                <Camera size={14} /> Scan Another
              </button>
              <button
                type="button"
                onClick={() => finishClose('map')}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold"
                style={{
                  background: 'var(--surface-elevated)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-heading)',
                }}
              >
                <MapPin size={14} /> Browse the Map
              </button>
            </div>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
              />
              Don&apos;t show this tour again
            </label>
          </>
        }
      >
        <span className="sr-only">Tour complete</span>
      </TourModal>
    </>
  )
}
