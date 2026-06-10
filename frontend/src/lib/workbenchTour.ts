/**
 * Workbench tour state + analytics helpers (tour-spec-v2.md).
 */

import { trackEvent } from '@/lib/eventTracking'

export const WORKBENCH_TOUR_COMPLETED_KEY = 'dealgapiq:workbench-tour:completed'
export const WORKBENCH_TOUR_DONT_SHOW_KEY = 'dealgapiq:workbench-tour:dont-show'
export const WORKBENCH_TOUR_REPLAY_KEY = 'dealgapiq:workbench-tour:replay'
export const WORKBENCH_TOUR_REPLAY_EVENT = 'dealgapiq:replay-workbench-tour'

export const WORKBENCH_TOUR_STEP_DURATIONS_MS = [10_000, 8_000, 8_000, 8_000, 7_000, 9_000] as const

export type WorkbenchTourPhase = 'welcome' | 'steps' | 'close' | null

export function readTourCompleted(): boolean {
  if (typeof window === 'undefined') return true
  try {
    return localStorage.getItem(WORKBENCH_TOUR_COMPLETED_KEY) === '1'
  } catch {
    return true
  }
}

export function readTourDontShow(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(WORKBENCH_TOUR_DONT_SHOW_KEY) === '1'
  } catch {
    return false
  }
}

export function readTourReplayRequested(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(WORKBENCH_TOUR_REPLAY_KEY) === '1'
  } catch {
    return false
  }
}

export function markTourCompleted(dontShowAgain: boolean): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(WORKBENCH_TOUR_COMPLETED_KEY, '1')
    localStorage.removeItem(WORKBENCH_TOUR_REPLAY_KEY)
    if (dontShowAgain) {
      localStorage.setItem(WORKBENCH_TOUR_DONT_SHOW_KEY, '1')
    } else {
      localStorage.removeItem(WORKBENCH_TOUR_DONT_SHOW_KEY)
    }
  } catch {
    /* localStorage unavailable */
  }
}

export function requestTourReplay(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(WORKBENCH_TOUR_COMPLETED_KEY)
    localStorage.setItem(WORKBENCH_TOUR_REPLAY_KEY, '1')
    window.dispatchEvent(new CustomEvent(WORKBENCH_TOUR_REPLAY_EVENT))
  } catch {
    /* ignore */
  }
}

export function shouldAutoStartWorkbenchTour(): boolean {
  if (readTourReplayRequested()) return true
  if (readTourDontShow()) return false
  return !readTourCompleted()
}

export function mapSearchTourTarget(): string {
  if (typeof window === 'undefined') return '[data-tour="map-search-nav"]'
  return window.innerWidth < 640
    ? '[data-tour="map-search-fab"]'
    : '[data-tour="map-search-nav"]'
}

export function trackTourShown(): void {
  trackEvent('tour_shown')
}

export function trackTourStepReached(step: number): void {
  trackEvent('tour_step_reached', { step: String(step) })
}

export function trackTourSkipped(step: number): void {
  trackEvent('tour_skipped', { step: String(step) })
}

export function trackTourCompleted(): void {
  trackEvent('tour_completed')
}

export function trackTourCloseCta(action: 'save' | 'scan' | 'mapsearch'): void {
  const event =
    action === 'save'
      ? 'save_from_close'
      : action === 'scan'
        ? 'scan_from_close'
        : 'mapsearch_from_close'
  trackEvent(event)
}
