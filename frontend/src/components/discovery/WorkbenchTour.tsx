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
import {
  formatBuyerDirectoryLabel,
  formatLenderDirectoryTotal,
} from '@/lib/directory-promo'

/** Custom events used by the tooltip to pause/resume the auto-advance timer on hover. */
export const TOUR_HOVER_PAUSE_EVENT = 'dealgapiq:tour-hover-pause'
export const TOUR_HOVER_RESUME_EVENT = 'dealgapiq:tour-hover-resume'

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
      onPointerEnter={() => window.dispatchEvent(new CustomEvent(TOUR_HOVER_PAUSE_EVENT))}
      onPointerLeave={() => window.dispatchEvent(new CustomEvent(TOUR_HOVER_RESUME_EVENT))}
      onTouchStart={() => window.dispatchEvent(new CustomEvent(TOUR_HOVER_PAUSE_EVENT))}
    >
      {/* Progress bar — reduces perceived tour length vs. text-only step counter */}
      <div
        className="h-1 rounded-full mb-3 overflow-hidden"
        style={{ background: 'var(--border-default)' }}
        aria-hidden
      >
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${(stepNumber / size) * 100}%`,
            background: 'var(--accent-sky)',
          }}
        />
      </div>
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
          Your first deal analysis is done.
        </h2>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          60 seconds. Six tools. One number that tells you exactly what to offer. Let&apos;s walk
          it.
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
          You&apos;ve got the workbench. Now work a deal.
        </h2>
        <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
          Save this property and DealGapIQ keeps the numbers fresh — and alerts you when anything
          changes.
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
            📍 Hunt the Map
          </button>
        </div>
        {/* Pro seed — same visual treatment as the Strategy unlock panel's exit-network strip */}
        <div
          className="rounded-xl px-3.5 py-2.5 mb-5 text-left"
          style={{
            background: 'var(--color-sky-dim)',
            border: '1px solid var(--accent-sky)',
          }}
        >
          <p className="text-[12px] leading-snug m-0" style={{ color: 'var(--text-body)' }}>
            When you&apos;re ready to close:{' '}
            <span className="font-bold" style={{ color: 'var(--text-heading)' }}>
              Pro
            </span>{' '}
            connects you to{' '}
            <span className="font-bold" style={{ color: 'var(--text-heading)' }}>
              {formatBuyerDirectoryLabel(null)} verified cash buyers
            </span>{' '}
            and{' '}
            <span className="font-bold" style={{ color: 'var(--text-heading)' }}>
              {formatLenderDirectoryTotal()} hard money lenders
            </span>
            .
          </p>
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
  /** Remaining ms + start timestamp for the active step's timer, so hover can pause/resume it. */
  const timerStateRef = useRef<{ index: number; remaining: number; startedAt: number } | null>(
    null,
  )

  const steps: Step[] = useMemo(
    () => [
      {
        target: '[data-tour="verdict-prices"]',
        title: '🎯 Start here: your three numbers.',
        content: (
          <p>
            Target Buy is the price where this deal makes money. Income Value is break-even.
            Market Price is what the seller wants. The gap between them is your{' '}
            <strong>negotiation room</strong> — and every tool here exists to close it.
          </p>
        ),
        disableBeacon: true,
        placement: 'bottom',
      },
      {
        target: '[data-tour="tab-strategy"]',
        title: '📊 One property. Six ways to profit.',
        content: (
          <p>
            Rental, short-term, BRRRR, flip, house hack, wholesale — full numbers for each, side
            by side. A property that fails as a rental can still win as a flip. Never leave money
            on the table.
            <br />
            <em>Click the tab to try it.</em>
          </p>
        ),
        placement: 'bottom',
      },
      {
        target: '[data-tour="tab-comps"]',
        title: '🏛️ Prove your number to a lender.',
        content: (
          <p>
            Pull live comps, make your own adjustments, and export a professional valuation PDF —
            the kind you hand to a lender or partner to back your offer.
          </p>
        ),
        placement: 'bottom',
      },
      {
        target: '[data-tour="tab-deal-maker"]',
        title: '🛠️ Test the offer before you make it.',
        content: (
          <p>
            Drop the rate, raise the down payment, add seller financing — every metric
            recalculates live. Walk into the negotiation already knowing which terms make this
            deal work.
            <br />
            <em>Click the tab to try it.</em>
          </p>
        ),
        placement: 'bottom',
      },
      {
        target: '[data-tour="tab-estimator"]',
        title: '🔨 Rehab numbers without waiting on a contractor.',
        content: (
          <p>
            Local construction pricing built in. Pick a preset or itemize — kitchen, bath, roof,
            systems — and your flip and BRRRR numbers update automatically.
          </p>
        ),
        placement: 'bottom',
      },
      {
        target: mapSearchTourTarget(),
        title: '🗺️ No address? Hunt the whole market.',
        content: (
          <p>
            Every parcel pre-graded green / yellow / red. Filter for foreclosures,
            pre-foreclosures, auctions, and listings gone stale — the deals flippers and
            wholesalers fight over.
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
    timerStateRef.current = null
  }, [])

  const scheduleAutoAdvance = useCallback(
    (index: number, durationOverride?: number) => {
      clearAutoAdvance()
      if (phase !== 'steps') return
      const duration = durationOverride ?? WORKBENCH_TOUR_STEP_DURATIONS_MS[index]
      if (duration == null) return
      timerStateRef.current = { index, remaining: duration, startedAt: Date.now() }
      autoAdvanceRef.current = setTimeout(() => {
        timerStateRef.current = null
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

  // Pause the auto-advance timer while the user is reading (pointer over the
  // tooltip), then resume with whatever time was left. Touch only pauses —
  // mobile users advance manually via Next.
  useEffect(() => {
    const handlePause = () => {
      const state = timerStateRef.current
      if (!state || !autoAdvanceRef.current) return
      clearTimeout(autoAdvanceRef.current)
      autoAdvanceRef.current = null
      state.remaining = Math.max(0, state.remaining - (Date.now() - state.startedAt))
    }
    const handleResume = () => {
      const state = timerStateRef.current
      if (!state || autoAdvanceRef.current) return
      // Give slow readers a floor so resume never advances instantly.
      scheduleAutoAdvance(state.index, Math.max(state.remaining, 2000))
    }
    window.addEventListener(TOUR_HOVER_PAUSE_EVENT, handlePause)
    window.addEventListener(TOUR_HOVER_RESUME_EVENT, handleResume)
    return () => {
      window.removeEventListener(TOUR_HOVER_PAUSE_EVENT, handlePause)
      window.removeEventListener(TOUR_HOVER_RESUME_EVENT, handleResume)
    }
  }, [scheduleAutoAdvance])

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
