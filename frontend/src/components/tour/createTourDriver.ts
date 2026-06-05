import { driver, type DriveStep, type Config } from 'driver.js'
import 'driver.js/dist/driver.css'
import './tour-overrides.css'

export type TourDriver = ReturnType<typeof driver>

export function createTourDriver(
  steps: DriveStep[],
  options?: Partial<Config> & {
    onStepReached?: (index: number) => void
    onFinished?: () => void
    onSkipped?: (stepIndex: number) => void
  },
): TourDriver {
  const { onStepReached, onFinished, onSkipped, ...config } = options ?? {}
  let wasSkipped = false

  return driver({
    animate: true,
    smoothScroll: true,
    allowClose: true,
    overlayOpacity: 0.55,
    stagePadding: 8,
    stageRadius: 12,
    popoverClass: 'dealscope-tour-popover',
    showProgress: true,
    progressText: '{{current}} of {{total}}',
    nextBtnText: 'Next →',
    prevBtnText: '← Back',
    doneBtnText: 'Done',
    steps,
    onHighlighted: (_el, _step, { state }) => {
      onStepReached?.(state.activeIndex ?? 0)
    },
    onDestroyed: () => {
      if (!wasSkipped) onFinished?.()
      wasSkipped = false
    },
    onCloseClick: (_el, _step, { state, driver: d }) => {
      wasSkipped = true
      onSkipped?.(state.activeIndex ?? 0)
      d.destroy()
    },
    ...config,
  })
}

/** Auto-advance helper — pauses 30s on overlay click per tour spec. */
export function scheduleTourAutoAdvance(
  driverInstance: TourDriver,
  ms: number,
): () => void {
  const timer = window.setTimeout(() => {
    if (driverInstance.hasNextStep()) driverInstance.moveNext()
    else driverInstance.destroy()
  }, ms)

  const pauseOnOverlay = () => {
    window.clearTimeout(timer)
    window.setTimeout(() => {
      if (driverInstance.hasNextStep()) driverInstance.moveNext()
      else driverInstance.destroy()
    }, 30_000)
  }

  document.addEventListener('click', pauseOnOverlay, { once: true, capture: true })

  return () => {
    window.clearTimeout(timer)
    document.removeEventListener('click', pauseOnOverlay, { capture: true })
  }
}
