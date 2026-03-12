import { THEME_PREFERENCES, THEME_STORAGE_KEY, ThemePreference } from './constants'

function isValidThemePreference(value: unknown): value is ThemePreference {
  return typeof value === 'string' && THEME_PREFERENCES.includes(value as ThemePreference)
}

export function readStoredThemePreference(): ThemePreference | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY)
    if (!raw) return null
    return isValidThemePreference(raw) ? raw : null
  } catch {
    return null
  }
}

export function writeStoredThemePreference(preference: ThemePreference): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference)
  } catch {
    // Ignore storage failures (privacy mode, quota, etc.).
  }
}

