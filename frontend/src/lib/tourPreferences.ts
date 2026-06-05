/**
 * Tour completion state — localStorage (always) + profile dashboard_layout sync when authenticated.
 */

import { api } from '@/lib/api-client'

export const TOUR_STORAGE_KEYS = {
  workbenchSeen: 'dealscope:hasSeenWorkbenchTour',
  mapSearchSeen: 'dealscope:hasSeenMapSearchTour',
  workbenchDontShow: 'dealscope:workbenchTourDontShowAgain',
  mapSearchDontShow: 'dealscope:mapSearchTourDontShowAgain',
  workbenchSessionDone: 'dealscope:workbenchTourSessionDone',
  mapTourActiveSession: 'dealscope:mapTourActiveSession',
} as const

export interface TourLayoutPrefs {
  hasSeenWorkbenchTour?: boolean
  hasSeenMapSearchTour?: boolean
}

function readLocal(key: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

function writeLocal(key: string, value: boolean): void {
  if (typeof window === 'undefined') return
  try {
    if (value) localStorage.setItem(key, '1')
    else localStorage.removeItem(key)
  } catch {
    /* private browsing */
  }
}

export function hasSeenWorkbenchTour(): boolean {
  return readLocal(TOUR_STORAGE_KEYS.workbenchSeen)
}

export function hasSeenMapSearchTour(): boolean {
  return readLocal(TOUR_STORAGE_KEYS.mapSearchSeen)
}

export function markWorkbenchTourSeen(options?: { dontShowAgain?: boolean }): void {
  if (options?.dontShowAgain === false) {
    writeLocal(TOUR_STORAGE_KEYS.workbenchDontShow, false)
    writeLocal(TOUR_STORAGE_KEYS.workbenchSessionDone, true)
    return
  }
  writeLocal(TOUR_STORAGE_KEYS.workbenchSeen, true)
  writeLocal(TOUR_STORAGE_KEYS.workbenchSessionDone, true)
  void syncTourPrefsToProfile({ hasSeenWorkbenchTour: true })
}

export function markMapSearchTourSeen(options?: { dontShowAgain?: boolean }): void {
  if (options?.dontShowAgain === false) {
    writeLocal(TOUR_STORAGE_KEYS.mapSearchDontShow, false)
    return
  }
  writeLocal(TOUR_STORAGE_KEYS.mapSearchSeen, true)
  void syncTourPrefsToProfile({ hasSeenMapSearchTour: true })
}

export function setMapTourActiveSession(active: boolean): void {
  writeLocal(TOUR_STORAGE_KEYS.mapTourActiveSession, active)
}

export function isMapTourActiveSession(): boolean {
  return readLocal(TOUR_STORAGE_KEYS.mapTourActiveSession)
}

export function wasWorkbenchTourCompletedThisSession(): boolean {
  return readLocal(TOUR_STORAGE_KEYS.workbenchSessionDone)
}

export function markWorkbenchSessionDone(): void {
  writeLocal(TOUR_STORAGE_KEYS.workbenchSessionDone, true)
}

/** Hydrate local tour flags from the user profile (best-effort). */
export async function hydrateTourPrefsFromProfile(): Promise<void> {
  try {
    const profile = await api.get<{
      dashboard_layout?: { tours?: TourLayoutPrefs }
    }>('/api/v1/users/me/profile')
    const tours = profile.dashboard_layout?.tours
    if (tours?.hasSeenWorkbenchTour) writeLocal(TOUR_STORAGE_KEYS.workbenchSeen, true)
    if (tours?.hasSeenMapSearchTour) writeLocal(TOUR_STORAGE_KEYS.mapSearchSeen, true)
  } catch {
    /* guest or offline */
  }
}

async function syncTourPrefsToProfile(partial: TourLayoutPrefs): Promise<void> {
  try {
    const profile = await api.get<{ dashboard_layout?: Record<string, unknown> }>(
      '/api/v1/users/me/profile',
    )
    const existing = profile.dashboard_layout ?? {}
    const tours = { ...(existing.tours as TourLayoutPrefs | undefined), ...partial }
    await api.patch('/api/v1/users/me/profile', {
      dashboard_layout: { ...existing, tours },
    })
  } catch {
    /* guest */
  }
}

export function shouldSkipMapSearchTour(searchParams: URLSearchParams | null): boolean {
  if (!searchParams) return false
  const intentKeys = ['lat', 'lng', 'label', 'from', 'zoom']
  return intentKeys.some((k) => searchParams.has(k))
}
