'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Joyride, {
  ACTIONS,
  EVENTS,
  STATUS,
  type CallBackProps,
  type Step,
  type TooltipRenderProps,
} from 'react-joyride'
import { useRouter } from 'next/navigation'
import {
  WORKBENCH_TOUR_STEP_DURATIONS_MS,
  mapSearchTourTarget,
  markTourCompleted,
  trackTourCloseCta,
  trackTourCompleted,
  trackTourShown,
  trackTourSkipped,
  trackTourStepReached,
  type WorkbenchTourPhase,
} from '@/lib/workbenchTour'

interface WorkbenchTourProps {
  phase: WorkbenchTourPhase
  joyrideIndex: number
  onPhaseChange: (phase: WorkbenchTourPhase) => void
  onJoyrideIndexChange: (index: number) => void
  onDismiss: (dontShowAgain?: boolean) => void
  onSaveDeal: () => void | Promise<void>
}

function TourTooltip({
  index,
  step,
  backProps,
  closeProps,
  primaryProps,
  tooltipProps,
  isLastStep,
  size,
}: TooltipRenderProps) {
  const stepNumber = index + 1
  return (
    <div
      {...tooltipProps}
      className="max-w-sm rounded-2xl p-4 shadow-xl"
      style={{
        background: 'var(--surface-card)',
        border: '1px solid var(--accent-sky)',
        color: 'var(--text-heading)',
      }}
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
          Step {stepNumber} of {size}
        </span>
        <button
          type="button"
          {...closeProps}
          className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-heading)]"
        >
          Skip
        </button>
      </div>
      {step.title ? (
        <p className="text-sm font-bold mb-2" style={{ color: 'var(--text-heading)' }}>
          {step.title}
        </p>
      ) : null}
      <div className="text-sm leading-relaxed text-[var(--text-body)]">{step.content}</div>
      <div className="mt-4 flex items-center justify-between gap-2">
        {index > 0 ? (
          <button
            type="button"
            {...backProps}
            className="text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-heading)]"
          >
            ← Back
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          {...primaryProps}
          className="px-4 py-2 rounded-full text-sm font-bold text-[var(--text-inverse)]"
          style={{ background: 'var(--accent-sky)' }}
        >
          {isLastStep ? 'Finish' : 'Next →'}
        </button>
      </div>
    </div>
  )
}

function WelcomeModal({
  onStart,
  onSkip,
}: {
  onStart: () => void
  onSkip: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="workbench-tour-welcome-title"
    >
      <div
        className="w-full max-w-md rounded-2xl p-6 text-center"
        style={{
          background: 'var(--surface-card)',
          border: '1px solid var(--accent-sky)',
          boxShadow: 'var(--shadow-card-hover)',
        }}
      >
        <h2
          id="workbench-tour-welcome-title"
          className="text-xl font-bold mb-2"
          style={{ color: 'var(--text-heading)' }}
        >
          You just analyzed your first property.
        </h2>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          Here&apos;s everything else you unlocked — in 60 seconds.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={onStart}
            className="px-5 py-2.5 rounded-full text-sm font-bold text-[var(--text-inverse)]"
            style={{ background: 'var(--accent-sky)' }}
          >
            Show Me →
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="px-5 py-2.5 rounded-full text-sm font-semibold"
            style={{
              background: 'var(--surface-elevated)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-heading)',
            }}
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  )
}

function CloseModal({
  onSave,
  onScan,
  onMap,
  onDone,
}: {
  onSave: () => void
  onScan: () => void
  onMap: () => void
  onDone: (dontShowAgain: boolean) => void
}) {
  const [dontShow, setDontShow] = useState(true)

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="workbench-tour-close-title"
    >
      <div
        className="w-full max-w-lg rounded-2xl p-6 text-center"
        style={{
          background: 'var(--surface-card)',
          border: '1px solid var(--accent-sky)',
          boxShadow: 'var(--shadow-card-hover)',
        }}
      >
        <h2
          id="workbench-tour-close-title"
          className="text-xl font-bold mb-2"
          style={{ color: 'var(--text-heading)' }}
        >
          That&apos;s the workbench.
        </h2>
        <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
          Save this property to track it, scan another, or hunt deals across an entire ZIP.
        </p>
        <div className="flex flex-col gap-2.5 mb-5">
          <button
            type="button"
            onClick={onSave}
            className="w-full px-4 py-3 rounded-xl text-sm font-bold text-[var(--text-inverse)]"
            style={{ background: 'var(--accent-sky)' }}
          >
            ⭐ Save This Deal
          </button>
          <button
            type="button"
            onClick={onScan}
            className="w-full px-4 py-3 rounded-xl text-sm font-semibold"
            style={{
              background: 'var(--surface-elevated)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-heading)',
            }}
          >
            📸 Scan Another
          </button>
          <button
            type="button"
            onClick={onMap}
            className="w-full px-4 py-3 rounded-xl text-sm font-semibold"
            style={{
              background: 'var(--surface-elevated)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-heading)',
            }}
          >
            📍 Browse the Map
          </button>
        </div>
        <label className="flex items-center justify-center gap-2 text-sm text-[var(--text-secondary)] cursor-pointer">
          <input
            type="checkbox"
            checked={dontShow}
            onChange={(e) => setDontShow(e.target.checked)}
            className="rounded"
          />
          Don&apos;t show this tour again
        </label>
        <button
          type="button"
          onClick={() => onDone(dontShow)}
          className="mt-4 text-sm font-semibold text-[var(--accent-sky)] hover:underline"
        >
          Done
        </button>
      </div>
    </div>
  )
}

export function WorkbenchTour({
  phase,
  joyrideIndex,
  onPhaseChange,
  onJoyrideIndexChange,
  onDismiss,
  onSaveDeal,
}: WorkbenchTourProps) {
  const router = useRouter()
  const [runJoyride, setRunJoyride] = useState(false)
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const steps: Step[] = useMemo(
    () => [
      {
        target: '[data-tour="verdict-prices"]',
        title: '🎯 This is your Verdict.',
        content: (
          <p>
            Three numbers say it all — Target Buy is your profit price. Income Value is break-even.
            Market is what the seller wants. The <strong>Deal Gap</strong> between them is your
            negotiation room.
          </p>
        ),
        disableBeacon: true,
        placement: 'bottom',
      },
      {
        target: '[data-tour="tab-strategy"]',
        title: '📊 Same property, six ways to profit.',
        content: (
          <p>
            Long-term, short-term, BRRRR, flip, house hack, wholesale — full proforma for each,
            side by side.
          </p>
        ),
        placement: 'bottom',
      },
      {
        target: '[data-tour="tab-comps"]',
        title: '🏛️ Want a real valuation?',
        content: (
          <p>
            Live comps, your-pick adjustments, confidence score, and a professional PDF to use for
            funding.
          </p>
        ),
        placement: 'bottom',
      },
      {
        target: '[data-tour="tab-deal-maker"]',
        title: '🛠️ Structure the offer before you write it.',
        content: <p>Change loan type, down payment, or rent — every metric recalculates live.</p>,
        placement: 'bottom',
      },
      {
        target: '[data-tour="tab-estimator"]',
        title: '🔨 Need rehab numbers?',
        content: (
          <p>
            Local construction pricing built in. Pick a preset or itemize — kitchen, bath, systems,
            the works.
          </p>
        ),
        placement: 'bottom',
      },
      {
        target: mapSearchTourTarget(),
        title: "🗺️ Don't have an address? Hunt the whole market.",
        content: (
          <p>
            Map Search shows every parcel pre-graded green / yellow / red — with foreclosure,
            pre-foreclosure, auction, and 90-day-stale filters built in.
            <br />
            <em>Pro tip: this is how flippers and wholesalers find their next deal.</em>
          </p>
        ),
        placement: 'top',
      },
    ],
    [],
  )

  const clearAutoAdvance = useCallback(() => {
    if (autoAdvanceRef.current) {
      clearTimeout(autoAdvanceRef.current)
      autoAdvanceRef.current = null
    }
  }, [])

  const scheduleAutoAdvance = useCallback(
    (index: number) => {
      clearAutoAdvance()
      if (phase !== 'steps') return
      const duration = WORKBENCH_TOUR_STEP_DURATIONS_MS[index]
      if (duration == null) return
      autoAdvanceRef.current = setTimeout(() => {
        if (index >= steps.length - 1) {
          setRunJoyride(false)
          onPhaseChange('close')
        } else {
          onJoyrideIndexChange(index + 1)
        }
      }, duration)
    },
    [clearAutoAdvance, onJoyrideIndexChange, onPhaseChange, phase, steps.length],
  )

  useEffect(() => {
    if (phase === 'steps') {
      setRunJoyride(true)
      trackTourStepReached(joyrideIndex + 1)
      scheduleAutoAdvance(joyrideIndex)
    } else {
      setRunJoyride(false)
      clearAutoAdvance()
    }
    return clearAutoAdvance
  }, [phase, joyrideIndex, scheduleAutoAdvance, clearAutoAdvance])

  useEffect(() => {
    if (phase === 'welcome') {
      trackTourShown()
    }
  }, [phase])

  const handleJoyrideCallback = useCallback(
    (data: CallBackProps) => {
      const { action, index, status, type } = data

      if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
        if (action === ACTIONS.NEXT) {
          if (index >= steps.length - 1) {
            setRunJoyride(false)
            onPhaseChange('close')
          } else {
            onJoyrideIndexChange(index + 1)
          }
        } else if (action === ACTIONS.PREV && index > 0) {
          onJoyrideIndexChange(index - 1)
        }
      }

      if (action === ACTIONS.CLOSE || action === ACTIONS.SKIP) {
        trackTourSkipped(index + 1)
        onDismiss(true)
      }

      if (status === STATUS.FINISHED) {
        onPhaseChange('close')
      }

    },
    [
      clearAutoAdvance,
      onDismiss,
      onJoyrideIndexChange,
      onPhaseChange,
      scheduleAutoAdvance,
      steps.length,
    ],
  )

  const handleWelcomeStart = () => {
    onJoyrideIndexChange(0)
    onPhaseChange('steps')
  }

  const handleWelcomeSkip = () => {
    trackTourSkipped(0)
    onDismiss(true)
  }

  const handleCloseDone = (dontShowAgain: boolean) => {
    markTourCompleted(dontShowAgain)
    trackTourCompleted()
    onDismiss(dontShowAgain)
  }

  return (
    <>
      {phase === 'welcome' ? (
        <WelcomeModal onStart={handleWelcomeStart} onSkip={handleWelcomeSkip} />
      ) : null}

      {phase === 'steps' ? (
        <Joyride
          steps={steps}
          run={runJoyride}
          stepIndex={joyrideIndex}
          continuous
          showSkipButton={false}
          disableOverlayClose={false}
          spotlightClicks
          scrollToFirstStep
          disableScrolling={false}
          callback={handleJoyrideCallback}
          tooltipComponent={TourTooltip}
          styles={{
            options: {
              zIndex: 9999,
              arrowColor: 'var(--surface-card)',
              backgroundColor: 'var(--surface-card)',
              textColor: 'var(--text-heading)',
              primaryColor: 'var(--accent-sky)',
            },
            overlay: {
              backgroundColor: 'rgba(0, 0, 0, 0.45)',
            },
            spotlight: {
              borderRadius: 12,
            },
          }}
          locale={{
            back: '← Back',
            close: 'Skip',
            last: 'Finish',
            next: 'Next →',
          }}
        />
      ) : null}

      {phase === 'close' ? (
        <CloseModal
          onSave={() => {
            trackTourCloseCta('save')
            void onSaveDeal()
          }}
          onScan={() => {
            trackTourCloseCta('scan')
            router.push('/')
          }}
          onMap={() => {
            trackTourCloseCta('mapsearch')
            router.push('/map-search')
          }}
          onDone={handleCloseDone}
        />
      ) : null}
    </>
  )
}
